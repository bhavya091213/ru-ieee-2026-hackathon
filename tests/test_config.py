import os

import pytest


def test_config_loads_gemini_api_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-123")
    from config import Settings

    s = Settings()
    assert s.GEMINI_API_KEY == "test-key-123"


def test_config_defaults_gemini_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    from config import Settings

    s = Settings()
    assert s.GEMINI_MODEL == "gemini-2.5-flash"


def test_config_defaults_use_mock_retrieval(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    from config import Settings

    s = Settings()
    assert s.USE_MOCK_RETRIEVAL is True


def test_config_defaults_tribe_enabled(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    from config import Settings

    s = Settings()
    assert s.TRIBE_ENABLED is False
