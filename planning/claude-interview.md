# Interview Transcript: AI Engine (Workstream 2)

## Q1: What data sources will be ingested?

**Answer:** All of the above — social media (Reddit, Twitter, forums), product reviews (Amazon, App Store), survey/interview transcripts, and mixed user-provided data. The system should handle varied formats.

## Q2: Demo/pitch topic?

**Answer:** Consumer electronics (e.g., new phone launch). Rich opinion data available, matches the spec's camera/battery/price facet examples.

## Q3: Error handling strategy for Gemini failures?

**Answer:** Fail fast, surface error to user. Stop pipeline, show what went wrong, let user retry. No partial results or retry queues — keep it simple for the hackathon.

## Q4: Persona count — fixed or dynamic?

**Answer:** Dynamic from clustering (3-8 range). Let Leiden decide how many segments exist, cap at reasonable bounds.

## Q5: TRIBE scoring — what is it?

**Answer:** Custom heuristic we'll define ourselves. Response strength, variance, spread — simple math on simulation outputs. Not an external model or library.

## Q6: Project state persistence?

**Answer:** In-memory only (lost on restart). Simplest approach, sufficient for demo. No database, no file persistence.

## Q7: WS1 integration — who builds it?

**Answer:** Someone else is building WS1. We define the interface contract and mock it until their code is ready. Need mock implementations for `retrieve()` and graph community labels.

## Q8: Gemini API access?

**Answer:** Key ready, no quota concerns. Standard access with sufficient limits for the hackathon.

## Q9: Pitch focus / judge criteria?

**Answer:** Evidence grounding / trust. Judges care that insights are backed by real data, not hallucinated. This is the primary differentiator to optimize for.
