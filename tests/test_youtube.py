import pytest
from unittest.mock import patch, MagicMock
from core.ingest.youtube import fetch_youtube, _extract_video_id

def test_extract_video_id():
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert _extract_video_id(url) == "dQw4w9WgXcQ"

# This path is more direct for the mock to find
@patch('core.ingest.youtube.YouTubeTranscriptApi.fetch')
def test_fetch_youtube_returns_text(mock_fetch, tmp_data_dir):
    # Create a mock FetchedTranscript with snippets
    from youtube_transcript_api import FetchedTranscript, FetchedTranscriptSnippet
    
    mock_snippets = [
        FetchedTranscriptSnippet(text='Hello', start=0, duration=1),
        FetchedTranscriptSnippet(text='World', start=1, duration=1)
    ]
    mock_transcript = FetchedTranscript(
        snippets=mock_snippets,
        video_id='dQw4w9WgXcQ',
        language='English',
        language_code='en',
        is_generated=False
    )
    
    mock_fetch.return_value = mock_transcript
    
    results = fetch_youtube(["dQw4w9WgXcQ"], data_dir=str(tmp_data_dir))
    
    assert len(results) == 1
    assert "Hello World" in results[0]['text']