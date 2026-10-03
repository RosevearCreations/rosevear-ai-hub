import pytest

from rosevear_ai_hub.knowledge.chunking import ChunkingError, chunk_text


def test_chunk_text_is_bounded_overlapping_and_offset_stable() -> None:
    text = (
        "Alpha section with useful details. " * 20
        + "\n\n"
        + "Beta section with more useful details. " * 20
    )

    chunks = chunk_text(
        text,
        max_characters=240,
        overlap_characters=40,
    )

    assert len(chunks) > 2
    assert [chunk.ordinal for chunk in chunks] == list(range(len(chunks)))

    for chunk in chunks:
        assert len(chunk.text) <= 240
        assert text[chunk.start_char : chunk.end_char] == chunk.text
        assert chunk.citation_metadata["start_char"] == chunk.start_char
        assert chunk.citation_metadata["end_char"] == chunk.end_char

    assert chunks[1].start_char < chunks[0].end_char


def test_chunk_text_handles_empty_input() -> None:
    assert chunk_text("   \n", max_characters=200, overlap_characters=20) == []


def test_chunk_text_rejects_invalid_overlap() -> None:
    with pytest.raises(ChunkingError, match="smaller than chunk size"):
        chunk_text("content", max_characters=200, overlap_characters=200)
