import trafilatura
import json
import hashlib
import re
import logging
import requests
from pathlib import Path
from typing import Optional
from markdownify import markdownify as md_convert
from apps.api.schemas import RawDocument

logger = logging.getLogger(__name__)

def generate_doc_id(url: str) -> str:
    """Generate a deterministic document ID from a URL."""
    domain = url.split('//')[-1].split('/')[0].lower()
    domain = domain.replace('www.', '')
    domain_slug = re.sub(r'\W+', '_', domain)
    url_hash = hashlib.sha256(url.encode()).hexdigest()[:6]
    return f"doc_{domain_slug}_{url_hash}"

def fetch_url(url: str, canonical_product: str = "unknown") -> Optional[RawDocument]:
    doc_id = generate_doc_id(url)
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()

        result = trafilatura.extract(response.text, output_format="json", with_metadata=True)
        if not result:
            return None

        data = json.loads(result)
        
        # Convert text to clean markdown
        clean_markdown = md_convert(data.get("text", ""))

        # CRITICAL: These keys must match the Pydantic error exactly
        raw_doc = RawDocument(
            doc_id=doc_id,
            title=data.get("title", "Unknown Title"),
            author=data.get("author") or "Unknown",
            date=data.get("date") or "2026-04-18", # Matches 'date' error
            text=clean_markdown,                   # Matches 'text' error
            url=url,                               # Matches 'url' error
            canonical_product=canonical_product
        )

        return raw_doc

    except Exception as e:
        logger.error(f"Failed to fetch {url}: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--product", default="unknown")
    args = parser.parse_args()

    result = fetch_url(args.url, args.product)

    if result:
        output_path = Path(f"data/raw/{result.doc_id}.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            # model_dump_json is the correct Pydantic v2 method
            f.write(result.model_dump_json(indent=2))
        print(f"✅ Successfully saved {result.title} to {output_path}")
    else:
        print(f"❌ Fetch failed. Check logs.")