"""Deterministic text chunking for local knowledge indexing."""

from __future__ import annotations

from dataclasses import dataclass


class ChunkingError(ValueError):
    """Raised when chunk configuration is invalid."""


@dataclass(frozen=True)
class TextChunk:
    """One text slice with stable character offsets."""

    ordinal: int
    text: str
    start_char: int
    end_char: int
    citation_metadata: dict[str, int | str]


def chunk_text(
    text: str,
    *,
    max_characters: int,
    overlap_characters: int,
) -> list[TextChunk]:
    """Split text into bounded, overlapping chunks at readable boundaries."""

    if max_characters < 100:
        raise ChunkingError("Chunk size must be at least 100 characters.")
    if overlap_characters < 0:
        raise ChunkingError("Chunk overlap cannot be negative.")
    if overlap_characters >= max_characters:
        raise ChunkingError("Chunk overlap must be smaller than chunk size.")
    if not text.strip():
        return []

    chunks: list[TextChunk] = []
    start = 0
    ordinal = 0
    text_length = len(text)

    while start < text_length:
        hard_end = min(text_length, start + max_characters)
        end = hard_end

        if hard_end < text_length:
            search_start = min(hard_end, start + max_characters // 2)
            candidates = [
                text.rfind("\n\n", search_start, hard_end),
                text.rfind("\n", search_start, hard_end),
                text.rfind(" ", search_start, hard_end),
            ]
            boundary = max(candidates)
            if boundary > start:
                end = boundary

        raw = text[start:end]
        leading = len(raw) - len(raw.lstrip())
        trailing = len(raw) - len(raw.rstrip())
        actual_start = start + leading
        actual_end = end - trailing
        content = text[actual_start:actual_end]

        if content:
            chunks.append(
                TextChunk(
                    ordinal=ordinal,
                    text=content,
                    start_char=actual_start,
                    end_char=actual_end,
                    citation_metadata={
                        "ordinal": ordinal,
                        "start_char": actual_start,
                        "end_char": actual_end,
                    },
                )
            )
            ordinal += 1

        if end >= text_length:
            break

        next_start = max(start + 1, end - overlap_characters)
        start = next_start

    return chunks
