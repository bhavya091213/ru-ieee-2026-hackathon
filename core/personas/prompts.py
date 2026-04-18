PERSONA_SYNTHESIS_PROMPT = """\
You are synthesizing a consumer persona from clustered evidence.
The persona must be grounded in the provided evidence chunks. Never invent beliefs without evidence.
Every belief must include at least 2 evidence_chunk_ids referencing real chunk IDs from the input.
Return valid JSON matching the provided schema.

Cluster ID: {cluster_id}

Evidence chunks:
{chunks}

Graph entities:
{entities}

Common facets: {facets}
Common stances: {stances}

Instructions:
- Create a segment_label that captures this cluster's consumer archetype.
- Write a 2-3 sentence summary of this persona's perspective.
- List 3-5 jobs_to_be_done relevant to this consumer segment.
- For feature_priorities, use ONLY these facet keys: camera, battery, price, design, privacy, ecosystem, other.
  Assign a float 0.0-1.0 for each relevant facet based on how much this cluster cares about it.
- For skepticism_profile, provide floats 0.0-1.0 for trust_in_reviews, trust_in_brand_claims, and influencer_susceptibility.
- For beliefs, create 3-7 grounded claims, each with stance and at least 2 evidence_chunk_ids from the provided chunks.
- graph_entity_ids will be overwritten; include any IDs you find relevant.
"""
