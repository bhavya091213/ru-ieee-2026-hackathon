# Day 5 - AI Infrastructure & Agent Creation

**Platform:** LinkedIn
**Format:** Text + Screenshots + GitHub link
**Engagement Goal:** Engage market researchers, AI engineers, people building with LLMs/agents

---

## Post Copy

We didn't just use AI. We orchestrated it.

PanelForge simulates a moderated focus group where AI personas debate your product concept. But the engineering behind that simulation is what I want to break down today.

**The Agent Architecture:**

Each "persona" in our system isn't a simple prompt. It's a structured agent with:
- A segment label (e.g., "Privacy-Conscious Professional")
- Feature priorities (weighted by evidence)
- Beliefs grounded in cited source data
- A skepticism profile (how much they trust reviews, brands, influencers)
- Graph entity connections (topics they care about)

**The Simulation State Machine:**

```
RETRIEVING → ROUND1 → MODERATING → ROUND2 → ANALYZING → SCORING → DONE
```

This isn't a single LLM call. It's a 7-phase orchestration:

1. **Retrieve** evidence for each persona (parallel, semaphore-limited)
2. **Round 1** — each persona responds independently to the product scenario
3. **Moderate** — AI analyzes disagreement patterns, generates follow-up questions
4. **Round 2** — personas respond to moderator + peer arguments (positions can shift)
5. **Analyze** — synthesize consensus themes, risks, wins, recommendations
6. **Score** — compute alignment metrics across the panel

**Key engineering decisions:**
- Frozen dataclass state machine (immutable transitions, easy debugging)
- `asyncio.TaskGroup` for fail-fast retrieval (all-or-nothing)
- `gather(return_exceptions=True)` for persona responses (partial results OK)
- Semaphore(5) rate limiting (prevents Gemini throttling)
- Temperature gradient: 0.0 for extraction, 0.2 for persona roleplay, 0.0 for analysis
- Every response validates `cited_chunk_ids` against retrieved evidence

**Why this matters for market research:**

Traditional focus groups: 6-8 people, 1 moderator, 90 minutes, $15K+.
PanelForge: 4-5 evidence-grounded personas, AI moderator, 2 rounds, 60 seconds.

The personas aren't random. They emerge from clustering real consumer opinions using the Leiden algorithm. Each one represents a genuine segment of public discourse.

Is it a replacement for real research? No. Is it a fast, cheap way to stress-test a concept before spending $15K? Absolutely.

[GitHub link]

For anyone building agent systems: what's your approach to grounding agent outputs in evidence? I'd love to compare notes.

#AIEngineering #AgentArchitecture #LLM #GoogleGemini #MarketResearch #AsyncPython #BuildInPublic

---

## Screenshots to Include

1. Architecture diagram showing the state machine flow
2. Dashboard showing persona cards with their profiles
3. Round comparison view (showing how positions shifted)
4. Evidence citations view (showing chunk IDs linked to claims)

---

## Notes

- This is the most technical post in the series — that's intentional
- The market research framing makes it accessible to non-engineers
- The question at the end targets builders (invite DMs/comments)
- Consider making a simple architecture diagram for visual impact
