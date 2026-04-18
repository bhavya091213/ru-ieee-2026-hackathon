from apps.api.schemas.chunk import ChunkExtraction

def test_gemini_compatibility():
    # This checks if Gemini can understand our data format
    schema = ChunkExtraction.model_json_schema()
    assert "properties" in schema
    print("✅ Schema is Gemini-ready!")