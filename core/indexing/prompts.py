# core/indexing/prompts.py

GRAPH_EXTRACTION_PROMPT = """
You are a research analyst specializing in product analysis and market intelligence. Your task is to extract structured information from text chunks about consumer products, focusing on entities, relationships, and sentiment analysis.

Given the following text chunk about the product "{canonical_product}":

{text}

Please analyze this chunk and extract the following structured information. Output your response as a valid JSON object that exactly matches the required schema. Do not include any additional text or explanations outside the JSON.

**Entities**: Extract all relevant entities mentioned in the text. Each entity should have:
- id: A unique identifier (use a simple slug like "iphone_18" or "camera_sensor")
- title: The entity's name as it appears in the text
- type: One of "Product", "Feature", "Concern", "Competitor", "Segment", "Claim"
- description: A brief 1-2 sentence description of the entity

**Relationships**: Identify relationships between the extracted entities. Each relationship should have:
- source: The id of the source entity
- target: The id of the target entity  
- type: One of "MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"
- description: A brief explanation of the relationship
- weight: A float between 0.0 and 1.0 indicating the strength of the relationship

**Claims**: List all specific claims or statements made about products or features in the text.

**Facet**: Categorize the main topic of this chunk into exactly one of: "camera", "battery", "price", "design", "privacy", "ecosystem", "other"

**Stance**: Classify the overall sentiment/tone of the chunk into exactly one of: "positive", "negative", "mixed", "rumor", "review"

**Segment Hints**: List any hints about target user segments or demographics mentioned or implied.

**Novelty Signals**: List any signals that this information is new, recent, or represents a change/update.

**Evidence Score**: A float between 0.0 and 1.0 indicating how informative and evidence-based this chunk is (higher = more concrete facts, lower = vague opinions).

**Rumor Confidence**: A float between 0.0 and 1.0 indicating confidence that this chunk contains unconfirmed rumors or speculation (higher = more likely rumor).

**Direct Quote Candidates**: List any phrases from the text that could serve as direct quotes for presentation.

Output format: A JSON object with the following structure:
{{
  "entities": [{{...}}],
  "relationships": [{{...}}], 
  "claims": ["..."],
  "facet": "...",
  "stance": "...",
  "segment_hints": ["..."],
  "novelty_signals": ["..."],
  "evidence_score": 0.0,
  "rumor_confidence": 0.0,
  "direct_quote_candidates": ["..."]
}}
"""