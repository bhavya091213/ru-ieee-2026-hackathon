"""Markdown writer for canonical document storage."""

import os
import hashlib
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from markdownify import markdownify as md


def write_markdown(
    text: str,
    metadata: Dict[str, Any],
    canonical_product: str,
    output_dir: str,
    source_type: str,
) -> str:
    """Write a canonical Markdown file with YAML frontmatter.

    Args:
        text: The raw content text (may contain HTML).
        metadata: Dict with keys like title, author, published_at, source_url.
        canonical_product: Slugified product name (e.g., "iphone_18").
        output_dir: Base data directory (e.g., "data/").
        source_type: One of "web_article", "reddit_post", "reddit_comment", "youtube".

    Returns:
        The generated doc_id string.
    """
    # Generate deterministic doc_id from source_type and content hash
    content_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()[:8]
    doc_id = f"doc_{source_type}_{content_hash}"

    # Convert HTML to Markdown if needed
    processed_text = _convert_html_to_markdown(text)

    # Build YAML frontmatter
    frontmatter = {
        'doc_id': doc_id,
        'canonical_product': canonical_product,
        'source_type': source_type,
        'source_url': metadata.get('source_url', 'unknown'),
        'title': metadata.get('title', 'Untitled'),
        'published_at': metadata.get('published_at', 'unknown'),
        'author': metadata.get('author', 'anonymous'),
        'language': 'en',
        'retrieved_at': datetime.utcnow().isoformat() + 'Z'
    }

    # Create the full content
    yaml_content = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
    full_content = f"---\n{yaml_content}---\n\n{processed_text}"

    # Ensure output directory exists
    md_dir = Path(output_dir) / 'md'
    md_dir.mkdir(parents=True, exist_ok=True)

    # Write the file
    output_path = md_dir / f"{doc_id}.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_content)

    return doc_id


def _convert_html_to_markdown(text: str) -> str:
    """Convert HTML to Markdown if the text contains HTML tags."""
    # Simple heuristic: check for common HTML tags
    html_tags = ['<p>', '<div>', '<h1>', '<h2>', '<h3>', '<h4>', '<h5>', '<h6>',
                 '<br>', '<strong>', '<em>', '<a ', '<ul>', '<ol>', '<li>']

    has_html = any(tag in text.lower() for tag in html_tags)

    if has_html:
        return md(text)
    else:
        return text