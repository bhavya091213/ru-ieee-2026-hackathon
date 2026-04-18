"""Tests for core/ingest/md_writer.py"""

import os
import yaml
import pytest
from datetime import datetime
from unittest.mock import patch

from core.ingest.md_writer import write_markdown


class TestWriteMarkdown:
    """Test the write_markdown function."""

    def test_produces_valid_yaml_frontmatter_with_all_required_fields(self, tmp_data_dir):
        """Test that write_markdown produces valid YAML frontmatter with all required fields."""
        text = "Test content"
        metadata = {
            'title': 'Test Title',
            'author': 'Test Author',
            'source_url': 'https://example.com',
            'published_at': '2024-01-01'
        }
        canonical_product = 'test_product'
        source_type = 'web_article'

        with patch('core.ingest.md_writer.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 12, 0, 0)
            doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        # Read the produced file
        md_file = tmp_data_dir / "md" / f"{doc_id}.md"
        assert md_file.exists()

        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse frontmatter
        parts = content.split('---', 2)
        assert len(parts) == 3
        frontmatter = yaml.safe_load(parts[1])

        required_fields = ['doc_id', 'canonical_product', 'source_type', 'source_url', 'title', 'published_at', 'author', 'language', 'retrieved_at']
        for field in required_fields:
            assert field in frontmatter, f"Missing required field: {field}"

    def test_generates_deterministic_doc_id_from_source_type_and_content_hash(self, tmp_data_dir):
        """Test that write_markdown generates deterministic doc_id from source type + content hash."""
        text = "Test content"
        metadata = {'title': 'Test'}
        canonical_product = 'test_product'
        source_type = 'web_article'

        doc_id1 = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)
        doc_id2 = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        assert doc_id1 == doc_id2
        assert doc_id1.startswith('doc_web_article_')

    def test_sets_published_at_to_unknown_when_not_available(self, tmp_data_dir):
        """Test that write_markdown sets published_at to 'unknown' when not available."""
        text = "Test content"
        metadata = {'title': 'Test'}  # no published_at
        canonical_product = 'test_product'
        source_type = 'web_article'

        doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        md_file = tmp_data_dir / "md" / f"{doc_id}.md"
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        parts = content.split('---', 2)
        frontmatter = yaml.safe_load(parts[1])

        assert frontmatter['published_at'] == 'unknown'

    def test_sets_author_to_anonymous_when_not_available(self, tmp_data_dir):
        """Test that write_markdown sets author to 'anonymous' when not available."""
        text = "Test content"
        metadata = {'title': 'Test'}  # no author
        canonical_product = 'test_product'
        source_type = 'web_article'

        doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        md_file = tmp_data_dir / "md" / f"{doc_id}.md"
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        parts = content.split('---', 2)
        frontmatter = yaml.safe_load(parts[1])

        assert frontmatter['author'] == 'anonymous'

    def test_converts_html_to_clean_markdown_via_markdownify(self, tmp_data_dir):
        """Test that write_markdown converts HTML to clean Markdown via markdownify."""
        text = "<h2>Title</h2><p>This is a <strong>bold</strong> paragraph.</p>"
        metadata = {'title': 'Test'}
        canonical_product = 'test_product'
        source_type = 'web_article'

        doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        md_file = tmp_data_dir / "md" / f"{doc_id}.md"
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Body should be after frontmatter
        parts = content.split('---', 2)
        body = parts[2].strip()

        # HTML should be converted to Markdown
        assert '<h2>' not in body
        assert '<p>' not in body
        assert '<strong>' not in body
        assert 'Title' in body
        assert '-----' in body
        assert '**bold**' in body

    def test_saves_file_to_data_md_doc_id_md(self, tmp_data_dir):
        """Test that write_markdown saves file to data/md/{doc_id}.md."""
        text = "Test content"
        metadata = {'title': 'Test'}
        canonical_product = 'test_product'
        source_type = 'web_article'

        doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        expected_path = tmp_data_dir / "md" / f"{doc_id}.md"
        assert expected_path.exists()

    def test_sets_retrieved_at_to_current_iso_datetime(self, tmp_data_dir):
        """Test that write_markdown sets retrieved_at to current ISO datetime."""
        text = "Test content"
        metadata = {'title': 'Test'}
        canonical_product = 'test_product'
        source_type = 'web_article'

        fixed_time = datetime(2024, 1, 1, 12, 0, 0)
        with patch('core.ingest.md_writer.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = fixed_time
            doc_id = write_markdown(text, metadata, canonical_product, str(tmp_data_dir), source_type)

        md_file = tmp_data_dir / "md" / f"{doc_id}.md"
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        parts = content.split('---', 2)
        frontmatter = yaml.safe_load(parts[1])

        expected_time = fixed_time.isoformat() + 'Z'
        assert frontmatter['retrieved_at'] == expected_time