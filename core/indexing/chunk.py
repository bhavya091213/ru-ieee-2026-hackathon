import os
import yaml
import hashlib
import json
from typing import List, Dict


def chunk_documents(
    md_dir: str,
    output_path: str,
    canonical_product: str,
    target_tokens: int = 500,
    overlap_tokens: int = 50,
) -> List[Dict]:
    """Split all Markdown files in md_dir into chunks and write JSONL.

    Args:
        md_dir: Path to directory containing .md files with YAML frontmatter.
        output_path: Path to write output JSONL file.
        canonical_product: Product slug for filtering (only chunk files matching this product).
        target_tokens: Target chunk size in tokens (approximate, using word count).
        overlap_tokens: Number of overlapping tokens between consecutive chunks.

    Returns:
        List of chunk record dicts (also written to output_path as JSONL).
    """
    chunks = []

    for filename in os.listdir(md_dir):
        if not filename.endswith('.md'):
            continue

        filepath = os.path.join(md_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            continue  # invalid format

        try:
            frontmatter = yaml.safe_load(parts[1])
        except yaml.YAMLError:
            continue  # invalid YAML

        body = parts[2].lstrip()  # remove leading whitespace after frontmatter

        if frontmatter.get('canonical_product') != canonical_product:
            continue

        doc_id = frontmatter.get('doc_id')
        if not doc_id:
            continue

        # Split body into sections based on headers
        sections = []
        current_section = {'title': None, 'text': '', 'start': 0}
        lines = body.split('\n')
        char_pos = 0

        for i, line in enumerate(lines):
            if line.startswith('#'):
                if current_section['text']:
                    current_section['end'] = char_pos
                    sections.append(current_section)
                current_section = {
                    'title': line.lstrip('#').strip(),
                    'text': '',
                    'start': char_pos
                }
            else:
                current_section['text'] += line + '\n'
                char_pos += len(line) + 1  # +1 for \n

        if current_section['text']:
            current_section['end'] = len(body)
            sections.append(current_section)

        # Now, for each section, split into paragraphs and chunk
        for section in sections:
            section_text = section['text']
            paragraphs = [p.strip() for p in section_text.split('\n\n') if p.strip()]

            current_chunk_text = ''
            current_words = 0
            chunk_start = section['start']

            for para in paragraphs:
                para_words = para.split()
                para_word_count = len(para_words)

                if para_word_count == 0:
                    continue

                # If paragraph is too long, split it into smaller pieces
                if para_word_count > target_tokens:
                    # Split paragraph into chunks of target_tokens
                    for i in range(0, para_word_count, target_tokens - current_words if current_words > 0 else target_tokens):
                        piece_words = para_words[i:i + target_tokens]
                        piece_text = ' '.join(piece_words)
                        piece_word_count = len(piece_words)

                        if current_words + piece_word_count > target_tokens and current_chunk_text:
                            # Finish current chunk
                            chunk_end = chunk_start + len(current_chunk_text)
                            chunk_id = hashlib.sha256(
                                f"{doc_id}:{chunk_start}:{chunk_end}".encode()
                            ).hexdigest()[:16]

                            chunk_record = {
                                "chunk_id": chunk_id,
                                "doc_id": doc_id,
                                "text": current_chunk_text.strip(),
                                "section_title": section['title'],
                                "char_start": chunk_start,
                                "char_end": chunk_end,
                                "metadata": {
                                    "canonical_product": canonical_product,
                                    "source_type": frontmatter.get('source_type'),
                                    "published_at": str(frontmatter.get('published_at')) if frontmatter.get('published_at') else None
                                }
                            }
                            chunks.append(chunk_record)

                            # Start new chunk with overlap
                            words_list = current_chunk_text.split()
                            if len(words_list) > overlap_tokens:
                                overlap_text = ' '.join(words_list[-overlap_tokens:])
                                overlap_len = len(overlap_text)
                                current_chunk_text = overlap_text + ' ' + piece_text
                                current_words = len(current_chunk_text.split())
                                chunk_start = chunk_end - overlap_len - 1  # adjust for space
                            else:
                                current_chunk_text = piece_text
                                current_words = piece_word_count
                                chunk_start = chunk_end
                        else:
                            if current_chunk_text:
                                current_chunk_text += ' ' + piece_text
                            else:
                                current_chunk_text = piece_text
                            current_words += piece_word_count
                else:
                    # Normal paragraph handling
                    if current_words + para_word_count > target_tokens and current_chunk_text:
                        # Finish current chunk
                        chunk_end = chunk_start + len(current_chunk_text)
                        chunk_id = hashlib.sha256(
                            f"{doc_id}:{chunk_start}:{chunk_end}".encode()
                        ).hexdigest()[:16]

                        chunk_record = {
                            "chunk_id": chunk_id,
                            "doc_id": doc_id,
                            "text": current_chunk_text.strip(),
                            "section_title": section['title'],
                            "char_start": chunk_start,
                            "char_end": chunk_end,
                            "metadata": {
                                "canonical_product": canonical_product,
                                "source_type": frontmatter.get('source_type'),
                                "published_at": str(frontmatter.get('published_at')) if frontmatter.get('published_at') else None
                            }
                        }
                        chunks.append(chunk_record)

                        # Start new chunk with overlap
                        words_list = current_chunk_text.split()
                        if len(words_list) > overlap_tokens:
                            overlap_text = ' '.join(words_list[-overlap_tokens:])
                            overlap_len = len(overlap_text)
                            current_chunk_text = overlap_text + ' ' + para
                            current_words = len(current_chunk_text.split())
                            chunk_start = chunk_end - overlap_len - 1  # adjust for space
                        else:
                            current_chunk_text = para
                            current_words = para_word_count
                            chunk_start = chunk_end
                    else:
                        if current_chunk_text:
                            current_chunk_text += '\n\n' + para
                        else:
                            current_chunk_text = para
                        current_words += para_word_count

            # Last chunk in section
            if current_chunk_text:
                chunk_end = chunk_start + len(current_chunk_text)
                chunk_id = hashlib.sha256(
                    f"{doc_id}:{chunk_start}:{chunk_end}".encode()
                ).hexdigest()[:16]

                chunk_record = {
                    "chunk_id": chunk_id,
                    "doc_id": doc_id,
                    "text": current_chunk_text.strip(),
                    "section_title": section['title'],
                    "char_start": chunk_start,
                    "char_end": chunk_end,
                    "metadata": {
                        "canonical_product": canonical_product,
                        "source_type": frontmatter.get('source_type'),
                        "published_at": str(frontmatter.get('published_at')) if frontmatter.get('published_at') else None
                    }
                }
                chunks.append(chunk_record)

    # Write to JSONL
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        for chunk in chunks:
            json.dump(chunk, f, ensure_ascii=False)
            f.write('\n')

    return chunks