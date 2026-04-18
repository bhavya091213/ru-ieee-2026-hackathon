import os
import json
import logging
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi
from pathlib import Path

logger = logging.getLogger(__name__)

def _extract_video_id(url_or_id: str) -> str:
    """Extracts ID from URL or returns ID as-is."""
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        parsed = urlparse(url_or_id)
        if parsed.hostname == 'youtu.be':
            return parsed.path[1:]
        if parsed.hostname in ('www.youtube.com', 'youtube.com'):
            if parsed.path == '/watch':
                return parse_qs(parsed.query)['v'][0]
            if parsed.path[:7] == '/embed/':
                return parsed.path.split('/')[2]
            if parsed.path[:3] == '/v/':
                return parsed.path.split('/')[2]
    return url_or_id # Assume it's already an ID

def fetch_youtube(video_ids_or_urls: list[str], data_dir: str = "data/raw") -> list[dict]:
    results = []
    for item in video_ids_or_urls:
        video_id = _extract_video_id(item)
        try:
            # Fetch transcript with English fallbacks
            api = YouTubeTranscriptApi()
            transcript = api.fetch(
                video_id, languages=['en', 'en-US', 'en-GB']
            )
            
            full_text = " ".join([snippet.text for snippet in transcript.snippets])
            
            video_data = {
                "doc_id": f"youtube_{video_id}",
                "video_id": video_id,
                "title": f"YouTube Video {video_id}", # Placeholder if no API key
                "text": full_text,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "source_type": "youtube",
                "date": "2026-04-18" # Placeholder
            }
            
            # Save raw file
            output_path = Path(data_dir) / f"youtube_{video_id}.json"
            with open(output_path, "w") as f:
                json.dump(video_data, f, indent=2)
                
            results.append(video_data)
            
        except Exception as e:
            logger.info(f"Could not fetch transcript for {video_id}: {e}")
            
    return results