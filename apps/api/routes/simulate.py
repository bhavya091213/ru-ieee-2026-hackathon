from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from apps.api.schemas.scenario import Scenario
from core.simulation.orchestrator import SimPhase

router = APIRouter(tags=["simulate"])


def _load_chunks_from_jsonl(data_dir: str, canonical_product: str) -> list[dict]:
    chunks_path = Path(data_dir) / "chunks" / f"{canonical_product}.jsonl"
    if not chunks_path.exists():
        return []
    chunks = []
    with open(chunks_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


async def _run_simulation_task(
    project_id: str,
    scenario: Scenario,
    app_state,
) -> None:
    from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
    from core.simulation.analyst import synthesize_results
    from core.simulation.dashboard import assemble_dashboard
    from core.simulation.moderator import analyze_disagreement
    from core.simulation.orchestrator import SimulationState, run_simulation
    from core.simulation.rounds import retrieve_phase, round1_phase, round2_phase

    def log(msg: str) -> None:
        logs = getattr(app_state, "progress_logs", None)
        if isinstance(logs, dict):
            logs.setdefault(project_id, []).append(msg)

    try:
        import config as _config

        settings = _config.get_settings()

        canonical_product = None
        if hasattr(app_state, "project_products"):
            canonical_product = app_state.project_products.get(project_id)

        data_dir = str(Path("data") / "projects" / project_id)

        chunks_for_clustering: list[dict] = []
        if canonical_product:
            raw_chunks = _load_chunks_from_jsonl(data_dir, canonical_product)
            for c in raw_chunks:
                meta = c.get("metadata", {})
                chunks_for_clustering.append({
                    "id": c["chunk_id"],
                    "text": c["text"],
                    "facet": meta.get("facet", meta.get("source_type", "other")),
                    "stance": meta.get("stance", "review"),
                    "entity_ids": meta.get("entity_ids", []) if isinstance(meta.get("entity_ids"), list) else [],
                })

        if not chunks_for_clustering:
            app_state.sim_status[project_id] = {
                "phase": "FAILED",
                "error": "No chunks found. Please ingest data first.",
                "done": True,
            }
            app_state.running_sims.discard(project_id)
            return

        from core.personas.cluster import cluster_chunks
        from core.personas.synthesize import synthesize_personas

        log(f"Clustering {len(chunks_for_clustering)} chunks into persona groups...")
        app_state.sim_status[project_id] = {
            "phase": "CLUSTERING", "error": None, "done": False
        }
        target = (3, min(6, max(3, len(chunks_for_clustering) // 3)))
        clusters = await cluster_chunks(chunks_for_clustering, target_range=target)
        log(f"Found {len(clusters)} persona clusters")

        log("Synthesizing persona profiles with AI...")
        app_state.sim_status[project_id] = {
            "phase": "SYNTHESIZING", "error": None, "done": False
        }
        personas = await synthesize_personas(clusters)

        if not personas:
            chunk_ids = [c["id"] for c in chunks_for_clustering[:2]]
            personas = [
                Persona(
                    segment_label=f"Segment-{i}",
                    summary=f"Auto-generated persona {i}",
                    jobs_to_be_done=["evaluate product"],
                    feature_priorities={"camera": 0.7, "price": 0.5},
                    beliefs=[
                        Belief(
                            claim="Product seems interesting",
                            stance="mixed",
                            evidence_chunk_ids=chunk_ids,
                        )
                    ],
                    skepticism_profile=SkepticismProfile(
                        trust_in_reviews=0.6,
                        trust_in_brand_claims=0.4,
                        influencer_susceptibility=0.5,
                    ),
                    graph_entity_ids=[],
                )
                for i in range(3)
            ]

        labels = [p.segment_label for p in personas]
        log(f"Created {len(personas)} personas: {', '.join(labels)}")

        chunk_summaries = [
            c["text"][:120] for c in chunks_for_clustering[:15]
        ]

        async def moderator_phase(state: SimulationState) -> SimulationState:
            mq = await analyze_disagreement(state.round1_responses, chunk_summaries)
            return state.transition(moderator_question=mq, phase=SimPhase.ROUND2)

        async def analyst_phase(state: SimulationState) -> SimulationState:
            summary = await synthesize_results(
                state.round1_responses,
                state.round2_responses,
                state.moderator_question,
            )
            return state.transition(analyst_summary=summary, phase=SimPhase.SCORING)

        async def scoring_phase(state: SimulationState) -> SimulationState:
            from core.scoring.tribe_runner import score_tribe

            result = await score_tribe(state.round2_responses, state.scenario)
            return state.transition(tribe_result=result, phase=SimPhase.DONE)

        phase_messages = {
            "RETRIEVING": "Retrieving evidence for each persona...",
            "ROUND1": "Round 1 — personas sharing initial reactions...",
            "MODERATING": "Moderator analyzing disagreements...",
            "ROUND2": "Round 2 — personas responding to challenges...",
            "ANALYZING": "Analyst synthesizing findings...",
            "SCORING": "Scoring tribe alignment...",
        }

        def _wrap(phase_name: str, func):
            async def wrapped(state: SimulationState) -> SimulationState:
                app_state.sim_status[project_id] = {
                    "phase": phase_name, "error": None, "done": False
                }
                log(phase_messages.get(phase_name, phase_name))
                return await func(state)

            return wrapped

        phase_funcs = {
            SimPhase.RETRIEVING: _wrap("RETRIEVING", retrieve_phase),
            SimPhase.ROUND1: _wrap("ROUND1", round1_phase),
            SimPhase.MODERATING: _wrap("MODERATING", moderator_phase),
            SimPhase.ROUND2: _wrap("ROUND2", round2_phase),
            SimPhase.ANALYZING: _wrap("ANALYZING", analyst_phase),
            SimPhase.SCORING: _wrap("SCORING", scoring_phase),
        }

        initial = SimulationState(
            project_id=project_id,
            scenario=scenario,
            personas=personas,
            tribe_enabled=settings.TRIBE_ENABLED,
        )

        final_state = await run_simulation(initial, phase_funcs)

        if final_state.phase == SimPhase.DONE and final_state.analyst_summary:
            dashboard = assemble_dashboard(
                project_id=project_id,
                scenario_id=str(uuid.uuid4()),
                personas=personas,
                round1_responses=final_state.round1_responses,
                round2_responses=final_state.round2_responses,
                moderator_question=final_state.moderator_question,
                analyst_summary=final_state.analyst_summary,
                tribe_result=final_state.tribe_result,
            )
            project = app_state.projects.get(project_id)
            if project:
                app_state.projects[project_id] = project.model_copy(
                    update={"dashboard": dashboard, "status": "completed"}
                )
            log("Study complete — assembling dashboard")
            app_state.sim_status[project_id] = {
                "phase": "DONE", "error": None, "done": True
            }
        elif final_state.phase == SimPhase.FAILED:
            app_state.sim_status[project_id] = {
                "phase": "FAILED", "error": final_state.error, "done": True
            }
        else:
            app_state.sim_status[project_id] = {
                "phase": "DONE", "error": None, "done": True
            }

    except Exception as exc:
        import traceback

        traceback.print_exc()
        app_state.sim_status[project_id] = {
            "phase": "FAILED", "error": str(exc), "done": True
        }
    finally:
        app_state.running_sims.discard(project_id)


@router.post("/projects/{project_id}/simulate", status_code=202)
async def simulate(project_id: str, body: Scenario, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    if project_id in request.app.state.running_sims:
        raise HTTPException(409, detail="Simulation already running for this project")

    request.app.state.running_sims.add(project_id)
    request.app.state.sim_status[project_id] = {
        "phase": "PREPARING", "error": None, "done": False
    }

    run_id = str(uuid.uuid4())
    task = asyncio.create_task(
        _run_simulation_task(project_id, body, request.app.state)
    )
    request.app.state.tasks[project_id] = task

    return {"run_id": run_id, "status": "started"}


@router.get("/projects/{project_id}/simulate/status")
async def simulate_status(project_id: str, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    status = request.app.state.sim_status.get(project_id)
    if status is None:
        return {"phase": "IDLE", "error": None, "done": False}
    return status


@router.get("/projects/{project_id}/progress")
async def get_progress(project_id: str, request: Request, after: int = 0):
    logs: list[str] = getattr(request.app.state, "progress_logs", {}).get(project_id, [])
    return {"messages": logs[after:]}
