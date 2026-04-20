# PanelForge - Resume Bullet Points

> **Format:** Google XYZ ("Accomplished [X] as measured by [Y], by doing [Z]") and STAR-adjacent.
> Each bullet is 1-2 sentences, action-oriented, with quantification where possible.
> Categorized by workstream for easy selection based on target role.

---

## Workstream 1: Data Pipeline & Infrastructure

### Ingestion & ETL

1. Engineered multi-source data ingestion pipeline processing Reddit, YouTube, and web content into unified Markdown format with YAML frontmatter, reducing raw data normalization time from hours to under 60 seconds for 25+ documents.

2. Built automated Reddit data collector using PRAW API with public JSON fallback, harvesting 25+ posts and associated comment threads per query while preserving metadata (score, author, timestamps, URLs).

3. Designed fault-tolerant ingestion architecture with automatic failover from authenticated API to public endpoints, achieving 100% uptime during 24-hour hackathon demo despite API rate limiting.

4. Implemented YouTube transcript extraction pipeline that converts video content into structured text documents with metadata (title, publish date, channel), expanding corpus coverage beyond text-only sources.

5. Built web article extraction system using Trafilatura, converting raw HTML from product review sites into clean, structured Markdown while preserving author attribution and publication dates.

6. Created YAML frontmatter schema for document metadata (doc_id, source_type, source_url, canonical_product, author, published_at), enabling structured queries across heterogeneous data sources.

7. Reduced data preprocessing overhead by 90% through keyword-based facet/stance classification (no LLM calls), categorizing chunks across 8 product facets and 5 sentiment stances in milliseconds.

### Chunking & Embedding

8. Implemented intelligent document chunking with section-aware splitting (respects markdown headers) and 500-token sliding windows with 50-token overlap, preserving semantic context across chunk boundaries.

9. Optimized embedding throughput by batching 20 texts per Gemini API call, reducing total embedding time by 5x compared to sequential single-text requests.

10. Generated 384-dimensional dense vector representations for 50+ document chunks using sentence-transformers (all-MiniLM-L6-v2), enabling sub-10ms semantic retrieval queries.

11. Built end-to-end chunking pipeline that preserves document lineage (chunk_id → doc_id → source_url), enabling full provenance tracing from any insight back to original source material.

12. Designed chunk metadata schema supporting multi-dimensional filtering (facet, stance, source_type, community_id), enabling targeted evidence retrieval for specific persona profiles.

### Vector Database & Retrieval

13. Deployed ChromaDB with HNSW indexing (cosine similarity) for persistent vector storage, achieving sub-10ms query latency on 50+ chunk collections with metadata filtering.

14. Implemented personalized retrieval strategy generating per-persona queries from segment labels, feature priorities, and beliefs, returning top-10 evidence chunks with relevance scoring.

15. Built metadata-filtered semantic search combining vector similarity with structured filters (facet, stance, source_type), improving retrieval precision by constraining results to relevant evidence domains.

16. Designed persistent vector storage architecture (file-based ChromaDB) enabling simulation re-runs without re-embedding, reducing repeated experiment time from minutes to seconds.

17. Engineered retrieval pipeline returning ranked chunks with full metadata (chunk_id, text, facet, stance, community_id), feeding directly into persona evidence grounding without post-processing.

### Graph Memory & Community Detection

18. Built knowledge graph from chunk co-occurrence patterns using NetworkX, extracting entity-relationship structures that capture how product features, sentiments, and user segments interconnect.

19. Implemented Leiden community detection algorithm (CPMVertexPartition) with automatic resolution tuning via binary search in [0.001, 0.5] range, consistently producing 4-7 meaningful topic clusters.

20. Designed K-NN similarity graph construction (k=15, cosine distance) with matrix symmetrization, creating the foundation for scale-independent community detection that avoids modularity resolution limits.

21. Built cluster quality assurance with minimum-size enforcement (3 chunks per cluster) and nearest-neighbor merging for sub-threshold groups, preventing fragmented or meaningless persona segments.

22. Exported graph data in GraphRAG-compatible Parquet format (entities.parquet, relationships.parquet, text_units.parquet), enabling interoperability with Microsoft's GraphRAG ecosystem.

23. Implemented c-TF-IDF keyword extraction per cluster for automated persona labeling, generating human-readable segment descriptions from statistical term importance without LLM calls.

24. Added k-means fallback (k=5) for Leiden algorithm edge cases, ensuring persona generation succeeds within 10 iterations even on adversarial data distributions.

25. Created pseudo-graph generation from keyword co-occurrence patterns, enabling interactive entity exploration in the frontend without expensive full graph database infrastructure.

---

## Workstream 2: AI Engine & Orchestration

### Schema Design & Type Safety

26. Designed 15+ Pydantic v2 schemas as single source of truth for 3-workstream team, eliminating schema divergence and enabling parallel development with zero integration conflicts at merge time.

27. Implemented strict field validation (ge=0, le=1 for floats; ge=0, le=100 for integers) across all data models, preventing invalid data propagation through the 7-phase simulation pipeline.

28. Built type-safe Gemini API wrapper using TypeVar generics (`generate_structured[T: BaseModel]`), enabling compile-time validation of structured LLM output schemas.

29. Achieved 100% JSON Schema compatibility between Pydantic models and Gemini's structured output requirements, eliminating runtime serialization errors through pre-validated schema exports.

30. Locked all cross-workstream interface contracts by hour 1 of 24-hour hackathon, enabling 3 developers to work in parallel with zero coordination overhead after initial schema review.

### LLM Integration & Prompt Engineering

31. Integrated Google Gemini 2.5 Flash with structured JSON output validation, achieving 95%+ first-attempt schema compliance through `response_mime_type` + `response_schema` enforcement.

32. Designed temperature gradient strategy (0.0 for extraction, 0.2 for persona roleplay, 0.0 for analysis) balancing deterministic accuracy with natural persona variation across pipeline stages.

33. Engineered evidence grounding enforcement requiring minimum 2 cited_chunk_ids per persona belief, with post-validation stripping of invalid citations and low_grounding flagging.

34. Built prompt-hash caching system (SHA256 of prompt + schema_name + temperature) reducing repeated Gemini calls to zero-latency cache hits during development and demo iterations.

35. Implemented thinking budget management for Gemini's extended reasoning (enabled for persona synthesis and analysis, disabled for extraction), optimizing cost-quality tradeoff per task type.

36. Designed retry strategy with exponential backoff (1s, 2s, max 2 retries) for transient Gemini errors (ResourceExhausted, ServiceUnavailable, DeadlineExceeded), achieving 99%+ effective uptime.

37. Created structured prompt templates with consistent patterns: role definition, evidence grounding instruction, JSON schema reference — reducing prompt engineering iteration time by standardizing the approach.

38. Removed `additionalProperties` from Pydantic JSON schema exports for Gemini compatibility, solving a common integration bug that causes Gemini to reject valid schemas.

### Persona Generation

39. Built AI persona synthesis pipeline converting evidence clusters into structured profiles with segment labels, jobs-to-be-done, feature priorities, beliefs, and skepticism profiles — each grounded in cited source data.

40. Implemented dynamic persona count (4-5) determined by Leiden clustering output rather than hardcoded, producing personas that authentically represent the natural segmentation in consumer discourse.

41. Engineered belief validation requiring minimum 3 grounded beliefs per persona with explicit evidence_chunk_ids, ensuring no persona makes unsupported claims in panel discussions.

42. Designed skepticism profile modeling (trust_in_reviews, brand_loyalty, influencer_susceptibility) enabling differentiated persona behavior in panel debates beyond simple positive/negative stances.

43. Parallelized persona synthesis across clusters using asyncio TaskGroup, reducing total persona generation time by 4x compared to sequential processing.

### Simulation Orchestration

44. Architected 7-phase simulation state machine (RETRIEVING → ROUND1 → MODERATING → ROUND2 → ANALYZING → SCORING → DONE) using frozen dataclasses with pure functional transitions for deterministic, debuggable execution.

45. Implemented fail-fast orchestration using asyncio.TaskGroup for evidence retrieval (all-or-nothing semantics) and gather(return_exceptions=True) for persona responses (partial results acceptable).

46. Built Semaphore(5) rate limiting for parallel Gemini API calls, preventing throttling while maintaining maximum throughput across concurrent persona response generation.

47. Designed per-phase timeout architecture (180s per phase, 30s per Gemini call) using asyncio.timeout(), preventing pipeline hangs while providing clear failure diagnostics.

48. Implemented per-project asyncio.Lock concurrency pattern preventing race conditions on simultaneous /simulate requests without requiring database infrastructure.

49. Reduced full simulation execution time to under 60 seconds through parallel fan-out of persona responses, compared to 5+ minutes for sequential processing of 4-5 persona calls.

50. Built immutable state transitions using dataclasses.replace(), ensuring each phase is a pure function (State → State) with no hidden side effects — enabling easy debugging and replay.

### Moderation & Analysis

51. Engineered AI moderator that analyzes Round 1 disagreement patterns (adoption_likelihood variance, feature_score divergence) and generates targeted follow-up questions to specific personas.

52. Built analyst synthesis module producing structured output: consensus_themes, disagreement_themes, top_risks, top_wins, feature_recommendations, messaging_suggestions, and evidence_gaps.

53. Designed two-round panel simulation where personas can update positions based on peer arguments and moderator probing, capturing opinion dynamics rather than static snapshots.

54. Implemented opinion shift tracking between Round 1 and Round 2 responses, quantifying how evidence and peer arguments influence persona positions over the course of discussion.

### Scoring & Metrics

55. Developed consensus scoring formula (1 - stdev(adoption_likelihoods) / 50, clamped to [0,1]) providing a single interpretable metric for panel agreement on product viability.

56. Built disagreement scoring (mean of per-facet standard deviations across personas) identifying which specific product features generate the most polarized reactions.

57. Implemented evidence coverage metric (percentage of personas with 3+ unique cited chunks in Round 2), measuring how well the panel discussion is grounded in real source data.

58. Created TRIBE alignment scoring module (response_strength, response_variance, response_spread) as feature-flagged optional analysis layer with explicit "exploratory, not validated" labeling.

### API Design

59. Designed 6 RESTful FastAPI endpoints with proper HTTP semantics: 202 Accepted for async simulation, 409 Conflict for concurrent operations, 404 for missing resources.

60. Implemented long-running operation pattern: POST /simulate returns 202 + run_id, frontend polls status endpoint with exponential backoff until completion or failure.

61. Built FastAPI lifespan context manager centralizing Gemini client initialization, project store, per-project locks, rate limiters, and response cache in a single application lifecycle.

62. Added CORS middleware configuration supporting both development (localhost:5173) and production origins, with configurable allowed origins via environment variable.

---

## Workstream 3: Frontend & Visualization

### Dashboard Architecture

63. Built 5-tab analytics dashboard (Overview, Personas, Discussion, Evidence, Insights) in React 19 with TypeScript, presenting complex AI simulation results in an accessible, judge-ready format.

64. Implemented responsive dark-theme design using Tailwind CSS 4, optimizing data density and visual contrast for information-heavy AI analytics displays.

65. Created real-time simulation progress UI with 6-phase indicators, animated persona card reveals, active speaker rotation, and streaming progress logs — providing transparency into AI pipeline execution.

66. Designed mock data fallback architecture enabling frontend development and demonstration independent of backend availability, reducing cross-team blocking during parallel hackathon development.

### Data Visualization

67. Built interactive feature heatmap component with red-yellow-green color interpolation (0.0 → 1.0) displaying per-persona scores across all product facets, enabling instant identification of feature-level disagreement.

68. Implemented force-directed topic graph using react-force-graph-2d with 12-color community palette, visualizing entity relationships and topic clusters from the knowledge graph.

69. Created KPI cards component displaying consensus score, disagreement score, and evidence coverage with color-coded thresholds (green >70%, yellow 40-70%, red <40%).

70. Built expandable round timeline component showing persona-by-persona responses with tone-based styling, adoption likelihood badges, and feature score tables.

71. Designed radar chart visualization for disagreement patterns across product facets, enabling stakeholders to identify which features need the most design attention.

72. Implemented quote wall component with persona-colored cards and facet tags, surfacing the most quotable sentences from panel discussions for stakeholder presentations.

73. Built adoption shift comparison view showing side-by-side Round 1 vs Round 2 positions, visualizing how the moderated discussion influenced persona opinions.

### Animation & UX

74. Integrated GSAP animation library for premium state transitions, persona card entrances, and phase progression effects, achieving polished hackathon demo quality.

75. Created animated dot-grid background with parallax grain effect, adding visual depth without distracting from data-heavy dashboard content.

76. Implemented lazy-loaded force graph component to reduce initial bundle size and prevent SSR issues, loading the D3-based visualization only when the Insights tab is active.

77. Designed wizard-style project creation flow (name → product → hypotheses → facets → URLs) reducing cognitive load for first-time users setting up research projects.

### Testing & Quality

78. Configured Vitest + React Testing Library test suite for frontend components with jsdom environment, ensuring dashboard rendering correctness across data states.

79. Built custom React hooks (useDashboard, useProject) encapsulating async data fetching, error handling, and mock fallback logic with clean component interfaces.

---

## Cross-Cutting / Project-Level

### Architecture & Systems Design

80. Architected full-stack AI application (Python FastAPI + React 19) in 24-hour hackathon with 3-person team, delivering working product with multi-source ingestion, AI simulation, and analytics dashboard.

81. Decomposed project into 3 parallel workstreams (Data Pipeline, AI Engine, Frontend) with explicit hour-by-hour dependency graph, enabling maximum parallel velocity with zero scope creep.

82. Designed evidence-centric architecture where every insight, persona belief, and recommendation traces back to cited source data — structurally preventing LLM hallucination at the system level.

83. Implemented schema-first development methodology locking all interface contracts by hour 1, enabling 3 developers to merge without conflicts across 19 hours of parallel implementation.

84. Built feature-flag architecture (TRIBE_ENABLED, USE_MOCK_RETRIEVAL) enabling graceful degradation and independent module testing without code changes.

### Hackathon Execution

85. Delivered production-quality demo in 24 hours including: data ingestion from 3+ sources, AI persona generation, two-round moderated simulation, full analytics dashboard with 8+ visualization components.

86. Managed technical risk through mock layer strategy: each workstream maintained independent fallback data, ensuring demo capability regardless of integration timing.

87. Pre-computed demo scenario at hour 21 for zero-latency judge presentation, then demonstrated live re-run capability to prove system is real — not a static prototype.

88. Identified and validated market gap: traditional focus groups cost $15K+ and take 4-6 weeks; PanelForge delivers directional signal in 60 seconds from real consumer data.

### AI/ML Infrastructure

89. Combined two memory architectures (GraphRAG-style graph memory + vector database) for evidence retrieval, leveraging graph for relationship reasoning and vectors for semantic similarity.

90. Achieved deterministic simulation reproducibility through RANDOM_SEED=42, PYTHONHASHSEED=42, and prompt-hash caching — enabling consistent demo results and debug iteration.

91. Built anti-hallucination system through structural constraints: minimum evidence citations per claim, valid chunk_id verification, scoped Pydantic schemas, and evidence-only analyst summaries.

92. Designed temperature strategy optimizing for different reasoning modes: deterministic extraction (0.0), creative persona roleplay (0.2), analytical synthesis (0.0) — matching LLM behavior to task requirements.

### Problem Solving & Innovation

93. Solved the "sycophancy problem" in multi-agent simulation through anchor resistance prompts and moderator-driven disagreement probing, ensuring personas maintain distinct viewpoints across rounds.

94. Replaced traditional sentiment analysis with structured persona modeling, preserving WHY people react (feature-level priorities, belief structures) rather than collapsing nuance into positive/negative scores.

95. Innovated on traditional focus group methodology by making the moderator evidence-aware: follow-up questions target specific disagreements identified through quantitative variance analysis, not generic probing.

96. Built system that works at multiple fidelity levels: quick keyword-based enrichment for speed, full LLM extraction for depth — enabling both fast iteration and thorough analysis modes.

---

## Targeted Role Variants

### For Data Engineering Roles

97. Built end-to-end ETL pipeline ingesting unstructured web data (Reddit, YouTube, articles) into normalized vector-indexed format with full metadata lineage in under 60 seconds per corpus.

98. Implemented graph-based community detection (Leiden algorithm) with auto-tuned resolution parameters, producing consistent 4-7 topic clusters across varying data distributions.

99. Designed hybrid retrieval architecture combining dense vector similarity (ChromaDB HNSW) with structured metadata filtering, achieving precision improvements over pure semantic search.

### For ML/AI Engineering Roles

100. Orchestrated multi-agent AI simulation with 7-phase state machine, parallel persona fan-out, and evidence grounding validation — producing structured, citation-backed consumer insights in under 60 seconds.

101. Engineered structured LLM output pipeline using Gemini 2.5 Flash with Pydantic schema enforcement, achieving 95%+ first-attempt compliance through response_schema and post-validation.

102. Implemented dynamic persona generation from unsupervised clustering (Leiden + sentence-transformers), creating evidence-grounded synthetic agents without manual persona definition.

### For Full-Stack / Product Engineering Roles

103. Shipped full-stack AI product (FastAPI + React 19) in 24-hour hackathon: multi-source data ingestion, NLP clustering, agent simulation, and 5-tab analytics dashboard with 8+ interactive visualizations.

104. Designed real-time simulation UX showing AI pipeline execution progress (6 phases, persona reveals, progress logs), transforming opaque AI processing into transparent, engaging user experience.

105. Built research tool addressing $15K+ market research gap, enabling early-stage teams to stress-test product concepts with evidence-backed synthetic panels in under 60 seconds.

---

## Bonus: Soft Skills & Leadership

106. Led AI engine workstream (largest technical scope) while coordinating schema contracts across 2 other workstreams, shipping 13 major deliverables in 18 hours.

107. Made architectural decisions under time pressure (Leiden over k-means, async state machine over LangGraph, feature flags over hard dependencies) that enabled successful delivery without backtracking.

108. Balanced technical ambition with hackathon pragmatism: scoped TRIBE scoring as feature-flagged optional module rather than blocking core pipeline, delivering complete product by deadline.

109. Communicated complex technical architecture to non-technical hackathon judges through progressive disclosure: business problem first, then technical moat, then live demo.

110. Identified when to use existing tools vs build custom: adopted ChromaDB and sentence-transformers for proven capabilities, built custom orchestrator and scoring for unique value-add.
