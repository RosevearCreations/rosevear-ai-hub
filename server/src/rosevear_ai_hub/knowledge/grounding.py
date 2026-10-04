"""Grounded-answer prompt construction and citation validation."""

from __future__ import annotations

import re
from dataclasses import dataclass

from rosevear_ai_hub.knowledge.retrieval import RetrievalHit

_CITATION_PATTERN = re.compile(r"\[K(\d+)\]")
_INSUFFICIENT = "INSUFFICIENT_EVIDENCE"


class GroundingError(RuntimeError):
    """Raised when a model answer violates the grounded-answer contract."""


@dataclass(frozen=True)
class GroundedCitation:
    """One evidence item referenced by the grounded answer."""

    citation_id: str
    hit: RetrievalHit


def build_grounded_messages(query: str, hits: list[RetrievalHit]) -> list[dict[str, str]]:
    """Build a strict evidence-only prompt."""

    evidence_blocks = []
    for index, hit in enumerate(hits, start=1):
        location = hit.location_label or "location unavailable"
        evidence_blocks.append(
            "\n".join(
                [
                    f"[K{index}]",
                    f"Source: {hit.filename}",
                    f"Location: {location}",
                    f"Evidence link: {hit.evidence_path}",
                    hit.text,
                ]
            )
        )

    system = (
        "You are a retrieval-grounded assistant. Use only the evidence blocks supplied by "
        "the user. Do not use outside knowledge. Every factual sentence must end with at least "
        "one citation in the exact form [K1], [K2], and so on. Never cite an identifier that "
        "was not supplied. If the evidence is not sufficient to answer the question, reply "
        f"with exactly {_INSUFFICIENT}."
    )
    user = f"Question: {query}\n\nEvidence:\n\n" + "\n\n".join(evidence_blocks)
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def validate_grounded_answer(
    answer: str,
    hits: list[RetrievalHit],
) -> tuple[str, list[GroundedCitation]]:
    """Validate that a provider answer cites only supplied evidence."""

    clean = answer.strip()
    if clean == _INSUFFICIENT:
        return "insufficient_evidence", []

    matches = [int(value) for value in _CITATION_PATTERN.findall(clean)]
    if not matches:
        raise GroundingError("The provider returned an answer without evidence citations.")

    unknown = [value for value in matches if value < 1 or value > len(hits)]
    if unknown:
        raise GroundingError("The provider cited evidence that was not supplied.")

    ordered_unique: list[int] = []
    for value in matches:
        if value not in ordered_unique:
            ordered_unique.append(value)

    citations = [
        GroundedCitation(citation_id=f"K{value}", hit=hits[value - 1]) for value in ordered_unique
    ]
    return "grounded", citations
