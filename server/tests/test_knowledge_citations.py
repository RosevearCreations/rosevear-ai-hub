from rosevear_ai_hub.knowledge.citations import (
    citation_metadata_for_range,
    markdown_citation_spans,
    page_citation_spans,
)


def test_markdown_headings_create_section_spans() -> None:
    text = "# Workshop\nVentilation notes.\n\n## Forge\nBurner notes."
    spans = markdown_citation_spans(text)

    assert [item["section"] for item in spans] == ["Workshop", "Forge"]

    metadata = citation_metadata_for_range(
        {"citation_spans": spans},
        ordinal=1,
        start_char=text.index("Burner"),
        end_char=len(text),
    )
    assert metadata["section"] == "Forge"


def test_pdf_page_ranges_resolve_page_number() -> None:
    text, spans = page_citation_spans(["First page text.", "Second page text."])

    assert text == "First page text.\n\nSecond page text."

    start = text.index("Second")
    metadata = citation_metadata_for_range(
        {"citation_spans": spans},
        ordinal=1,
        start_char=start,
        end_char=len(text),
    )
    assert metadata["page"] == 2
