import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from google.api_core import exceptions as google_exceptions
from pydantic import BaseModel

from core.gemini import clear_cache, generate_structured


class DummyModel(BaseModel):
    name: str
    value: int


def _make_response(text: str, finish_reason_name: str = "STOP"):
    fr = SimpleNamespace(name=finish_reason_name)
    candidate = SimpleNamespace(finish_reason=fr)
    resp = SimpleNamespace(candidates=[candidate], text=text)
    return resp


@pytest.fixture(autouse=True)
def _clean_cache():
    clear_cache()
    yield
    clear_cache()


@pytest.fixture
def mock_client(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    import config

    config.get_settings.cache_clear()
    config.reset_client()

    client = MagicMock()
    with patch("config.get_gemini_client", return_value=client):
        yield client

    config.get_settings.cache_clear()
    config.reset_client()


@pytest.mark.asyncio
async def test_returns_typed_result(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "test", "value": 42}'
    )
    result = await generate_structured("prompt", DummyModel)
    assert isinstance(result, DummyModel)
    assert result.name == "test"
    assert result.value == 42


@pytest.mark.asyncio
async def test_retries_on_resource_exhausted(mock_client):
    mock_client.models.generate_content.side_effect = [
        google_exceptions.ResourceExhausted("rate limit"),
        google_exceptions.ResourceExhausted("rate limit"),
        _make_response('{"name": "ok", "value": 1}'),
    ]
    result = await generate_structured("prompt", DummyModel)
    assert result.name == "ok"
    assert mock_client.models.generate_content.call_count == 3


@pytest.mark.asyncio
async def test_raises_after_retries_exhausted(mock_client):
    mock_client.models.generate_content.side_effect = google_exceptions.ResourceExhausted(
        "rate limit"
    )
    with pytest.raises(ValueError, match="failed after 2 retries"):
        await generate_structured("prompt", DummyModel)
    assert mock_client.models.generate_content.call_count == 3


@pytest.mark.asyncio
async def test_rejects_malformed_response(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "test"}'  # missing required "value"
    )
    with pytest.raises(ValueError, match="validation failed"):
        await generate_structured("prompt", DummyModel)


@pytest.mark.asyncio
async def test_detects_max_tokens(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "t", "value": 1}', "MAX_TOKENS"
    )
    with pytest.raises(ValueError, match="MAX_TOKENS"):
        await generate_structured("prompt", DummyModel)


@pytest.mark.asyncio
async def test_detects_safety_block(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "t", "value": 1}', "SAFETY"
    )
    with pytest.raises(ValueError, match="safety filter"):
        await generate_structured("prompt", DummyModel)


@pytest.mark.asyncio
async def test_cache_hit_skips_api_call(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "cached", "value": 99}'
    )
    r1 = await generate_structured("same prompt", DummyModel)
    r2 = await generate_structured("same prompt", DummyModel)
    assert r1 == r2
    assert mock_client.models.generate_content.call_count == 1


@pytest.mark.asyncio
async def test_cache_miss_different_prompts(mock_client):
    mock_client.models.generate_content.return_value = _make_response(
        '{"name": "a", "value": 1}'
    )
    await generate_structured("prompt A", DummyModel)
    await generate_structured("prompt B", DummyModel)
    assert mock_client.models.generate_content.call_count == 2
