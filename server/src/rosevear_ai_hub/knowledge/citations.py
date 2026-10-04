"""Citation metadata helpers for local knowledge evidence."""

from __future__ import annotations

import re
from typing import Any

_MARKDOWN_HEADING = re.compile(r"(?m)^(#{1,6})\s+(.+?)\s*$")


def markdown_citation_spans(text: str) -> list[dict[str, int | str]]:
    """Return section spans for Markdown headings."""

    matches = list(_MARKDOWN_HEADING.finditer(text))
    spans: list[dict[str, int | str]] = []

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        spans.append(
            {
                "kind": "section",
                "section": match.group(2).strip(),
                "start_char": start,
                "end_char": end,
            }
        )

    return spans


def page_citation_spans(page_text: list[str]) -> tuple[str, list[dict[str, int | str]]]:
    """Join extracted PDF page text and retain stable character ranges."""

    parts: list[str] = []
    spans: list[dict[str, int | str]] = []
    cursor = 0

    for index, text in enumerate(page_text):
        if index:
            parts.append("\n\n")
            cursor += 2

        start = cursor
        parts.append(text)
        cursor += len(text)

        spans.append(
            {
                "kind": "page",
                "page": index + 1,
                "start_char": start,
                "end_char": cursor,
            }
        )

    return "".join(parts), spans


def citation_metadata_for_range(
    document_metadata: Any,
    *,
    ordinal: int,
    start_char: int,
    end_char: int,
) -> dict[str, int | str]:
    """Resolve page/section metadata that overlaps one chunk."""

    metadata: dict[str, int | str] = {
        "ordinal": ordinal,
        "start_char": start_char,
        "end_char": end_char,
    }

    if not isinstance(document_metadata, dict):
        return metadata

    spans = document_metadata.get("citation_spans")
    if not isinstance(spans, list):
        return metadata

    for span in spans:
        if not isinstance(span, dict):
            continue

        span_start = span.get("start_char")
        span_end = span.get("end_char")
        if not isinstance(span_start, int) or not isinstance(span_end, int):
            continue

        overlaps = start_char < span_end and end_char > span_start
        if not overlaps:
            continue

        page = span.get("page")
        section = span.get("section")
        if isinstance(page, int):
            metadata["page"] = page
        if isinstance(section, str) and section.strip():
            metadata["section"] = section.strip()

        if "page" in metadata or "section" in metadata:
            break

    return metadata


def citation_label(metadata: Any) -> str | None:
    """Return a compact human-readable location label."""

    if not isinstance(metadata, dict):
        return None

    page = metadata.get("page")
    section = metadata.get("section")

    if isinstance(page, int) and isinstance(section, str) and section.strip():
        return f"page {page}, {section.strip()}"
    if isinstance(page, int):
        return f"page {page}"
    if isinstance(section, str) and section.strip():
        return section.strip()
    return None
