from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, HTTPException, Request

from apps.api.schemas.scenario import Scenario
from core.simulation.orchestrator import SimPhase

router = APIRouter(tags=["simulate"])


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

    try:
        import config as _config
        settings = _config.get_settings()

        from core.simulation.mock_corpus import DEMO_CHUNKS

        chunks_as_dicts = [
            {"id": c["chunk_id"], "text": c["text"], "facet": c["facet"],
             "stance": c["stance"], "entity_ids": []}
            for c in DEMO_CHUNKS
        ]

        from core.personas.cluster import cluster_chunks
        from core.personas.synthesize import synthesize_personas

        clusters = await cluster_chunks(chunks_as_dicts, target_range=(3, 6))
        personas = await synthesize_personas(clusters)

        if not personas:
            personas = [
                Persona(
                    segment_label=f"Segment-{i}",
                    summary=f"Auto-generated persona {i}",
                    jobs_to_be_done=["evaluate product"],
                    feature_priorities={"camera": 0.7, "price": 0.5},
                    beliefs=[Belief(claim="Product seems interesting", stance="mixed",
                                    evidence_chunk_ids=[DEMO_CHUNKS[0]["chunk_id"], DEMO_CHUNKS[1]["chunk_id"]])],
                    skepticism_profile=SkepticismProfile(trust_in_reviews=0.6, trust_in_brand_claims=0.4, influencer_susceptibility=0.5),
                    graph_entity_ids=[],
                )
                for i in range(3)
            ]

        async def moderator_phase(state: SimulationState) -> SimulationState:
            chunk_summaries = [c["text"][:100] for c in DEMO_CHUNKS[:10]]
            mq = await analyze_disagreement(state.round1_responses, chunk_summaries)
            return state.transition(moderator_question=mq, phase=SimPhase.ROUND2)

        async def analyst_phase(state: SimulationState) -> SimulationState:
            summary = await synthesize_results(
                state.round1_responses, state.round2_responses, state.moderator_question
            )
            return state.transition(analyst_summary=summary, phase=SimPhase.SCORING)

        async def scoring_phase(state: SimulationState) -> SimulationState:
            from core.scoring.tribe_runner import score_tribe
            result = await score_tribe(state.round2_responses, state.scenario)
            return state.transition(tribe_result=result, phase=SimPhase.DONE)

        phase_funcs = {
            SimPhase.RETRIEVING: retrieve_phase,
            SimPhase.ROUND1: round1_phase,
            SimPhase.MODERATING: moderator_phase,
            SimPhase.ROUND2: round2_phase,
            SimPhase.ANALYZING: analyst_phase,
            SimPhase.SCORING: scoring_phase,
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
            app_state.sim_status[project_id] = {"phase": "DONE", "error": None, "done": True}
        elif final_state.phase == SimPhase.FAILED:
            app_state.sim_status[project_id] = {
                "phase": "FAILED", "error": final_state.error, "done": True
            }
        else:
            app_state.sim_status[project_id] = {"phase": "DONE", "error": None, "done": True}

    except Exception as exc:
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
        "phase": "RETRIEVING", "error": None, "done": False
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
