diff --git a/.gitignore b/.gitignore
new file mode 100644
index 0000000..c8f1cf5
--- /dev/null
+++ b/.gitignore
@@ -0,0 +1,10 @@
+__pycache__/
+*.pyc
+*.pyo
+.venv/
+*.egg-info/
+dist/
+build/
+.pytest_cache/
+.ruff_cache/
+.mypy_cache/
diff --git a/apps/__init__.py b/apps/__init__.py
new file mode 100644
index 0000000..e69de29
diff --git a/apps/api/__init__.py b/apps/api/__init__.py
new file mode 100644
index 0000000..e69de29
diff --git a/apps/api/schemas/__init__.py b/apps/api/schemas/__init__.py
new file mode 100644
index 0000000..de5135f
--- /dev/null
+++ b/apps/api/schemas/__init__.py
@@ -0,0 +1,47 @@
+from apps.api.schemas.chunk import (
+    ChunkExtraction,
+    EntityType,
+    ExtractedEntity,
+    ExtractedRelationship,
+    Facet,
+    RelationshipType,
+    Stance,
+    VALID_FACETS,
+)
+from apps.api.schemas.dashboard import (
+    DashboardPayload,
+    FeatureScoreRow,
+    PersonaSummary,
+    QuoteCard,
+    ScoredLabel,
+    TribeResult,
+)
+from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
+from apps.api.schemas.project import Project
+from apps.api.schemas.scenario import Scenario
+from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
+
+__all__ = [
+    "Facet",
+    "Stance",
+    "EntityType",
+    "RelationshipType",
+    "VALID_FACETS",
+    "ExtractedEntity",
+    "ExtractedRelationship",
+    "ChunkExtraction",
+    "SkepticismProfile",
+    "Belief",
+    "Persona",
+    "Scenario",
+    "PersonaResponse",
+    "ModeratorQuestion",
+    "AnalystSummary",
+    "ScoredLabel",
+    "FeatureScoreRow",
+    "QuoteCard",
+    "TribeResult",
+    "PersonaSummary",
+    "DashboardPayload",
+    "Project",
+]
diff --git a/apps/api/schemas/chunk.py b/apps/api/schemas/chunk.py
new file mode 100644
index 0000000..4556c2d
--- /dev/null
+++ b/apps/api/schemas/chunk.py
@@ -0,0 +1,44 @@
+from __future__ import annotations
+
+from typing import Literal
+
+from pydantic import BaseModel
+
+Facet = Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
+Stance = Literal["positive", "negative", "mixed", "rumor", "review"]
+EntityType = Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
+RelationshipType = Literal[
+    "MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"
+]
+
+VALID_FACETS: frozenset[str] = frozenset(
+    ["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
+)
+
+
+class ExtractedEntity(BaseModel):
+    id: str
+    title: str
+    type: EntityType
+    description: str
+
+
+class ExtractedRelationship(BaseModel):
+    source: str
+    target: str
+    type: RelationshipType
+    description: str
+    weight: float
+
+
+class ChunkExtraction(BaseModel):
+    entities: list[ExtractedEntity]
+    relationships: list[ExtractedRelationship]
+    claims: list[str]
+    facet: Facet
+    stance: Stance
+    segment_hints: list[str]
+    novelty_signals: list[str]
+    evidence_score: float
+    rumor_confidence: float
+    direct_quote_candidates: list[str]
diff --git a/apps/api/schemas/dashboard.py b/apps/api/schemas/dashboard.py
new file mode 100644
index 0000000..bff1aa9
--- /dev/null
+++ b/apps/api/schemas/dashboard.py
@@ -0,0 +1,62 @@
+from __future__ import annotations
+
+from pydantic import BaseModel
+
+from apps.api.schemas.simulation import AnalystSummary, PersonaResponse
+
+
+class ScoredLabel(BaseModel):
+    label: str
+    score: float
+
+
+class FeatureScoreRow(BaseModel):
+    mean: float
+    min: float
+    max: float
+    std: float
+    persona_scores: dict[str, float]
+
+
+class QuoteCard(BaseModel):
+    persona_id: str
+    segment_label: str
+    quote: str
+    facet: str
+    sentiment: str
+
+
+class TribeResult(BaseModel):
+    enabled: bool
+    response_strength: float
+    response_variance: float
+    response_spread: float
+    scored_text: str
+
+
+class PersonaSummary(BaseModel):
+    persona_id: str
+    segment_label: str
+    summary: str
+    adoption_likelihood: int
+    strongest_positive: str
+    strongest_concern: str
+    feature_priorities: dict[str, float]
+
+
+class DashboardPayload(BaseModel):
+    project_id: str
+    scenario_id: str
+    consensus_score: float
+    disagreement_score: float
+    evidence_coverage: float
+    top_risks: list[ScoredLabel]
+    top_wins: list[ScoredLabel]
+    feature_scores: dict[str, FeatureScoreRow]
+    personas: list[PersonaSummary]
+    quotes: list[QuoteCard]
+    round1_responses: list[PersonaResponse]
+    round2_responses: list[PersonaResponse]
+    moderator_question: str
+    analyst_summary: AnalystSummary
+    tribe: TribeResult | None
diff --git a/apps/api/schemas/persona.py b/apps/api/schemas/persona.py
new file mode 100644
index 0000000..746abc1
--- /dev/null
+++ b/apps/api/schemas/persona.py
@@ -0,0 +1,25 @@
+from __future__ import annotations
+
+from pydantic import BaseModel
+
+
+class SkepticismProfile(BaseModel):
+    trust_in_reviews: float
+    trust_in_brand_claims: float
+    influencer_susceptibility: float
+
+
+class Belief(BaseModel):
+    claim: str
+    stance: str
+    evidence_chunk_ids: list[str]
+
+
+class Persona(BaseModel):
+    segment_label: str
+    summary: str
+    jobs_to_be_done: list[str]
+    feature_priorities: dict[str, float]
+    beliefs: list[Belief]
+    skepticism_profile: SkepticismProfile
+    graph_entity_ids: list[str]
diff --git a/apps/api/schemas/project.py b/apps/api/schemas/project.py
new file mode 100644
index 0000000..0cdaa75
--- /dev/null
+++ b/apps/api/schemas/project.py
@@ -0,0 +1,15 @@
+from __future__ import annotations
+
+from pydantic import BaseModel
+
+from apps.api.schemas.dashboard import DashboardPayload
+
+
+class Project(BaseModel):
+    project_id: str
+    name: str
+    status: str
+    created_at: str
+    source_count: int
+    chunk_count: int
+    dashboard: DashboardPayload | None
diff --git a/apps/api/schemas/scenario.py b/apps/api/schemas/scenario.py
new file mode 100644
index 0000000..4429d7b
--- /dev/null
+++ b/apps/api/schemas/scenario.py
@@ -0,0 +1,40 @@
+from __future__ import annotations
+
+from pydantic import BaseModel, field_validator
+
+from apps.api.schemas.chunk import VALID_FACETS
+
+
+class Scenario(BaseModel):
+    product_name: str
+    description: str
+    hypotheses: list[str]
+    facets_to_explore: list[str]
+
+    @field_validator("product_name")
+    @classmethod
+    def product_name_not_empty(cls, v: str) -> str:
+        stripped = v.strip()
+        if not stripped:
+            raise ValueError("product_name must not be empty or whitespace-only")
+        if len(stripped) > 200:
+            raise ValueError("product_name must be 200 characters or fewer")
+        return stripped
+
+    @field_validator("hypotheses")
+    @classmethod
+    def hypotheses_valid(cls, v: list[str]) -> list[str]:
+        if len(v) < 1 or len(v) > 10:
+            raise ValueError("hypotheses must contain 1-10 items")
+        for h in v:
+            if len(h) > 500:
+                raise ValueError("each hypothesis must be 500 characters or fewer")
+        return v
+
+    @field_validator("facets_to_explore")
+    @classmethod
+    def facets_must_be_valid(cls, v: list[str]) -> list[str]:
+        for facet in v:
+            if facet not in VALID_FACETS:
+                raise ValueError(f"invalid facet: {facet!r}")
+        return v
diff --git a/apps/api/schemas/simulation.py b/apps/api/schemas/simulation.py
new file mode 100644
index 0000000..f28e94d
--- /dev/null
+++ b/apps/api/schemas/simulation.py
@@ -0,0 +1,31 @@
+from __future__ import annotations
+
+from pydantic import BaseModel
+
+
+class PersonaResponse(BaseModel):
+    persona_id: str
+    overall_reaction: str
+    adoption_likelihood_0_100: int
+    strongest_positive: str
+    strongest_concern: str
+    feature_scores: dict[str, float]
+    what_would_change_my_mind: str
+    quotable_sentence: str
+    cited_chunk_ids: list[str]
+
+
+class ModeratorQuestion(BaseModel):
+    disagreement_summary: str
+    follow_up_question: str
+    targeted_persona_ids: list[str]
+
+
+class AnalystSummary(BaseModel):
+    consensus_themes: list[str]
+    disagreement_themes: list[str]
+    top_risks: list[str]
+    top_wins: list[str]
+    feature_recommendations: list[str]
+    messaging_suggestions: list[str]
+    evidence_gaps: list[str]
diff --git a/pyproject.toml b/pyproject.toml
new file mode 100644
index 0000000..75bd677
--- /dev/null
+++ b/pyproject.toml
@@ -0,0 +1,24 @@
+[project]
+name = "focus-group-agent"
+version = "0.1.0"
+description = "AI-powered synthetic focus group simulator"
+requires-python = ">=3.11"
+dependencies = [
+    "pydantic>=2.0,<3.0",
+]
+
+[dependency-groups]
+dev = [
+    "pytest>=8.0",
+    "pytest-asyncio>=0.23",
+]
+
+[build-system]
+requires = ["hatchling"]
+build-backend = "hatchling.build"
+
+[tool.hatch.build.targets.wheel]
+packages = ["apps", "core"]
+
+[tool.pytest.ini_options]
+testpaths = ["tests"]
diff --git a/tests/__init__.py b/tests/__init__.py
new file mode 100644
index 0000000..e69de29
diff --git a/tests/schemas/__init__.py b/tests/schemas/__init__.py
new file mode 100644
index 0000000..e69de29
diff --git a/tests/schemas/test_chunk.py b/tests/schemas/test_chunk.py
new file mode 100644
index 0000000..7f1da1f
--- /dev/null
+++ b/tests/schemas/test_chunk.py
@@ -0,0 +1,73 @@
+import pytest
+from pydantic import ValidationError
+
+from apps.api.schemas.chunk import (
+    ChunkExtraction,
+    ExtractedEntity,
+    ExtractedRelationship,
+)
+
+
+def _make_entity(**overrides):
+    defaults = {
+        "id": "ent-1",
+        "title": "iPhone Camera",
+        "type": "Feature",
+        "description": "48MP main camera sensor",
+    }
+    return ExtractedEntity(**{**defaults, **overrides})
+
+
+def _make_relationship(**overrides):
+    defaults = {
+        "source": "ent-1",
+        "target": "ent-2",
+        "type": "MENTIONS",
+        "description": "Review mentions camera",
+        "weight": 0.8,
+    }
+    return ExtractedRelationship(**{**defaults, **overrides})
+
+
+def _make_chunk(**overrides):
+    defaults = {
+        "entities": [_make_entity()],
+        "relationships": [_make_relationship()],
+        "claims": ["Camera is best in class"],
+        "facet": "camera",
+        "stance": "positive",
+        "segment_hints": ["tech-enthusiast"],
+        "novelty_signals": ["first 48MP sensor"],
+        "evidence_score": 0.9,
+        "rumor_confidence": 0.1,
+        "direct_quote_candidates": ["I love the camera quality"],
+    }
+    return ChunkExtraction(**{**defaults, **overrides})
+
+
+class TestChunkExtractionRoundtrip:
+    def test_roundtrip_all_fields(self):
+        original = _make_chunk()
+        data = original.model_dump()
+        restored = ChunkExtraction.model_validate(data)
+        assert restored == original
+
+    def test_rejects_invalid_facet(self):
+        with pytest.raises(ValidationError):
+            _make_chunk(facet="invalid_facet")
+
+    def test_rejects_invalid_stance(self):
+        with pytest.raises(ValidationError):
+            _make_chunk(stance="invalid_stance")
+
+
+class TestExtractedEntity:
+    def test_rejects_invalid_type(self):
+        with pytest.raises(ValidationError):
+            _make_entity(type="InvalidType")
+
+
+class TestExtractedRelationship:
+    def test_rejects_invalid_type(self):
+        with pytest.raises(ValidationError):
+            _make_relationship(type="INVALID_REL")
diff --git a/tests/schemas/test_dashboard.py b/tests/schemas/test_dashboard.py
new file mode 100644
index 0000000..98ae405
--- /dev/null
+++ b/tests/schemas/test_dashboard.py
@@ -0,0 +1,132 @@
+from apps.api.schemas.dashboard import (
+    DashboardPayload,
+    FeatureScoreRow,
+    PersonaSummary,
+    QuoteCard,
+    ScoredLabel,
+    TribeResult,
+)
+from apps.api.schemas.simulation import AnalystSummary, PersonaResponse
+
+
+def _make_analyst_summary():
+    return AnalystSummary(
+        consensus_themes=["Camera quality is a differentiator"],
+        disagreement_themes=["Price sensitivity varies by segment"],
+        top_risks=["Price may deter budget-conscious buyers"],
+        top_wins=["Camera upgrade excites enthusiasts"],
+        feature_recommendations=["Emphasize camera in marketing"],
+        messaging_suggestions=["Lead with camera, address price second"],
+        evidence_gaps=["Limited data on enterprise buyers"],
+    )
+
+
+def _make_persona_response():
+    return PersonaResponse(
+        persona_id="persona-1",
+        overall_reaction="Positive",
+        adoption_likelihood_0_100=75,
+        strongest_positive="Camera",
+        strongest_concern="Price",
+        feature_scores={"camera": 0.9},
+        what_would_change_my_mind="Lower price",
+        quotable_sentence="Great camera.",
+        cited_chunk_ids=["chunk-1"],
+    )
+
+
+def _make_dashboard(**overrides):
+    defaults = {
+        "project_id": "proj-1",
+        "scenario_id": "scen-1",
+        "consensus_score": 0.7,
+        "disagreement_score": 0.3,
+        "evidence_coverage": 0.85,
+        "top_risks": [ScoredLabel(label="Price resistance", score=0.8)],
+        "top_wins": [ScoredLabel(label="Camera excitement", score=0.9)],
+        "feature_scores": {
+            "camera": FeatureScoreRow(
+                mean=0.85, min=0.7, max=1.0, std=0.1, persona_scores={"p1": 0.9}
+            )
+        },
+        "personas": [
+            PersonaSummary(
+                persona_id="persona-1",
+                segment_label="Tech Enthusiasts",
+                summary="Early adopters",
+                adoption_likelihood=75,
+                strongest_positive="Camera",
+                strongest_concern="Price",
+                feature_priorities={"camera": 0.9},
+            )
+        ],
+        "quotes": [
+            QuoteCard(
+                persona_id="persona-1",
+                segment_label="Tech Enthusiasts",
+                quote="Great camera.",
+                facet="camera",
+                sentiment="positive",
+            )
+        ],
+        "round1_responses": [_make_persona_response()],
+        "round2_responses": [_make_persona_response()],
+        "moderator_question": "Why do you disagree on price?",
+        "analyst_summary": _make_analyst_summary(),
+        "tribe": None,
+    }
+    return DashboardPayload(**{**defaults, **overrides})
+
+
+class TestDashboardPayload:
+    def test_tribe_none_serializes(self):
+        dashboard = _make_dashboard(tribe=None)
+        data = dashboard.model_dump()
+        restored = DashboardPayload.model_validate(data)
+        assert restored.tribe is None
+
+    def test_tribe_populated_serializes(self):
+        tribe = TribeResult(
+            enabled=True,
+            response_strength=0.8,
+            response_variance=0.3,
+            response_spread=0.6,
+            scored_text="Strong positive response expected",
+        )
+        dashboard = _make_dashboard(tribe=tribe)
+        data = dashboard.model_dump()
+        restored = DashboardPayload.model_validate(data)
+        assert restored.tribe is not None
+        assert restored.tribe.response_strength == 0.8
+
+
+class TestScoredLabel:
+    def test_roundtrip(self):
+        original = ScoredLabel(label="Risk item", score=0.75)
+        data = original.model_dump()
+        restored = ScoredLabel.model_validate(data)
+        assert restored == original
+
+
+class TestFeatureScoreRow:
+    def test_roundtrip(self):
+        original = FeatureScoreRow(
+            mean=0.8, min=0.5, max=1.0, std=0.15, persona_scores={"p1": 0.9, "p2": 0.7}
+        )
+        data = original.model_dump()
+        restored = FeatureScoreRow.model_validate(data)
+        assert restored == original
+
+
+class TestQuoteCard:
+    def test_roundtrip(self):
+        original = QuoteCard(
+            persona_id="p1",
+            segment_label="Budget Buyers",
+            quote="Too expensive for what you get.",
+            facet="price",
+            sentiment="negative",
+        )
+        data = original.model_dump()
+        restored = QuoteCard.model_validate(data)
+        assert restored == original
diff --git a/tests/schemas/test_json_schema_export.py b/tests/schemas/test_json_schema_export.py
new file mode 100644
index 0000000..9f8c921
--- /dev/null
+++ b/tests/schemas/test_json_schema_export.py
@@ -0,0 +1,48 @@
+import pytest
+
+from apps.api.schemas import (
+    AnalystSummary,
+    Belief,
+    ChunkExtraction,
+    DashboardPayload,
+    ExtractedEntity,
+    ExtractedRelationship,
+    FeatureScoreRow,
+    ModeratorQuestion,
+    Persona,
+    PersonaResponse,
+    PersonaSummary,
+    Project,
+    QuoteCard,
+    Scenario,
+    ScoredLabel,
+    SkepticismProfile,
+    TribeResult,
+)
+
+ALL_MODELS = [
+    ChunkExtraction,
+    ExtractedEntity,
+    ExtractedRelationship,
+    Persona,
+    Belief,
+    SkepticismProfile,
+    Scenario,
+    PersonaResponse,
+    ModeratorQuestion,
+    AnalystSummary,
+    DashboardPayload,
+    PersonaSummary,
+    QuoteCard,
+    ScoredLabel,
+    FeatureScoreRow,
+    TribeResult,
+    Project,
+]
+
+
+@pytest.mark.parametrize("model_cls", ALL_MODELS, ids=lambda m: m.__name__)
+def test_json_schema_export(model_cls):
+    schema = model_cls.model_json_schema()
+    assert isinstance(schema, dict)
+    assert "properties" in schema or "$defs" in schema
diff --git a/tests/schemas/test_persona.py b/tests/schemas/test_persona.py
new file mode 100644
index 0000000..ac0ca73
--- /dev/null
+++ b/tests/schemas/test_persona.py
@@ -0,0 +1,43 @@
+from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
+
+
+def _make_persona(**overrides):
+    defaults = {
+        "segment_label": "Tech Enthusiasts",
+        "summary": "Early adopters who prioritize camera quality",
+        "jobs_to_be_done": ["Capture high-quality photos", "Share on social media"],
+        "feature_priorities": {"camera": 0.9, "battery": 0.6, "price": 0.3},
+        "beliefs": [
+            Belief(
+                claim="48MP is a major upgrade",
+                stance="positive",
+                evidence_chunk_ids=["chunk-1", "chunk-2"],
+            )
+        ],
+        "skepticism_profile": SkepticismProfile(
+            trust_in_reviews=0.8,
+            trust_in_brand_claims=0.4,
+            influencer_susceptibility=0.6,
+        ),
+        "graph_entity_ids": ["ent-1", "ent-2", "ent-3"],
+    }
+    return Persona(**{**defaults, **overrides})
+
+
+class TestPersona:
+    def test_with_graph_entity_ids_roundtrip(self):
+        original = _make_persona()
+        data = original.model_dump()
+        restored = Persona.model_validate(data)
+        assert restored == original
+        assert restored.graph_entity_ids == ["ent-1", "ent-2", "ent-3"]
+
+
+class TestBelief:
+    def test_empty_evidence_chunk_ids_is_valid(self):
+        belief = Belief(
+            claim="Battery lasts all day",
+            stance="positive",
+            evidence_chunk_ids=[],
+        )
+        assert belief.evidence_chunk_ids == []
diff --git a/tests/schemas/test_project.py b/tests/schemas/test_project.py
new file mode 100644
index 0000000..c7c4225
--- /dev/null
+++ b/tests/schemas/test_project.py
@@ -0,0 +1,18 @@
+from apps.api.schemas.project import Project
+
+
+class TestProject:
+    def test_roundtrip_without_dashboard(self):
+        original = Project(
+            project_id="proj-1",
+            name="iPhone 17 Study",
+            status="created",
+            created_at="2026-04-18T10:00:00Z",
+            source_count=0,
+            chunk_count=0,
+            dashboard=None,
+        )
+        data = original.model_dump()
+        restored = Project.model_validate(data)
+        assert restored == original
+        assert restored.dashboard is None
diff --git a/tests/schemas/test_scenario.py b/tests/schemas/test_scenario.py
new file mode 100644
index 0000000..b4bec03
--- /dev/null
+++ b/tests/schemas/test_scenario.py
@@ -0,0 +1,45 @@
+import pytest
+from pydantic import ValidationError
+
+from apps.api.schemas.scenario import Scenario
+
+
+def _make_scenario(**overrides):
+    defaults = {
+        "product_name": "iPhone 17",
+        "description": "Next-gen smartphone with AI features",
+        "hypotheses": ["Users will pay premium for AI camera"],
+        "facets_to_explore": ["camera", "price"],
+    }
+    return Scenario(**{**defaults, **overrides})
+
+
+class TestScenarioValidators:
+    def test_rejects_empty_product_name(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(product_name="")
+
+    def test_rejects_whitespace_only_product_name(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(product_name="   ")
+
+    def test_rejects_product_name_over_200_chars(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(product_name="x" * 201)
+
+    def test_rejects_more_than_10_hypotheses(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(hypotheses=[f"hypothesis {i}" for i in range(11)])
+
+    def test_rejects_hypothesis_over_500_chars(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(hypotheses=["x" * 501])
+
+    def test_rejects_invalid_facet(self):
+        with pytest.raises(ValidationError):
+            _make_scenario(facets_to_explore=["camera", "invalid_facet"])
+
+    def test_valid_scenario_passes(self):
+        scenario = _make_scenario()
+        assert scenario.product_name == "iPhone 17"
+        assert scenario.facets_to_explore == ["camera", "price"]
diff --git a/tests/schemas/test_simulation.py b/tests/schemas/test_simulation.py
new file mode 100644
index 0000000..21f0764
--- /dev/null
+++ b/tests/schemas/test_simulation.py
@@ -0,0 +1,24 @@
+from apps.api.schemas.simulation import PersonaResponse
+
+
+def _make_persona_response(**overrides):
+    defaults = {
+        "persona_id": "persona-1",
+        "overall_reaction": "Positive but cautious about price",
+        "adoption_likelihood_0_100": 72,
+        "strongest_positive": "Camera quality improvement",
+        "strongest_concern": "Price increase over last generation",
+        "feature_scores": {"camera": 0.9, "battery": 0.7, "price": 0.4},
+        "what_would_change_my_mind": "A significant price drop or trade-in offer",
+        "quotable_sentence": "The camera alone makes this worth considering.",
+        "cited_chunk_ids": ["chunk-1", "chunk-3", "chunk-7"],
+    }
+    return PersonaResponse(**{**defaults, **overrides})
+
+
+class TestPersonaResponse:
+    def test_roundtrip_all_fields(self):
+        original = _make_persona_response()
+        data = original.model_dump()
+        restored = PersonaResponse.model_validate(data)
+        assert restored == original
