"""Local semantic retrieval with keyword fallback and source filters."""

from __future__ import annotations

import math
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import (
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
)
from rosevear_ai_hub.providers.base import ProviderError

EmbeddingFunction = Callable[[str, list[str]], Awaitable[list[list[float]]]]

_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_'-]+")


class KnowledgeRetrievalError(RuntimeError):
    """Raised when an explicitly requested retrieval method cannot complete."""


@dataclass(frozen=True)
class RetrievalFilters:
    """Optional collection and source-document filters."""

    collection_ids: tuple[int, ...] = ()
    document_ids: tuple[int, ...] = ()


@dataclass(frozen=True)
class RetrievalHit:
    """One ranked local knowledge result."""

    chunk_id: int
    document_id: int
    collection_id: int
    filename: str
    collection_name: str
    ordinal: int
    text: str
    start_char: int
    end_char: int
    score: float
    method: str


@dataclass(frozen=True)
class RetrievalResult:
    """Search result set plus the method actually used."""

    query: str
    method: str
    hits: list[RetrievalHit]
    fallback_reason: str | None = None


class KnowledgeRetrievalService:
    """Search indexed local chunks with semantic ranking and keyword fallback."""

    def __init__(
        self,
        *,
        embed: EmbeddingFunction,
        embedding_provider: str,
        embedding_model: str,
        default_top_k: int = 8,
    ) -> None:
        self.embed = embed
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self.default_top_k = max(1, min(default_top_k, 50))

    async def search(
        self,
        session: Session,
        query: str,
        *,
        top_k: int | None = None,
        filters: RetrievalFilters | None = None,
        mode: str = "auto",
    ) -> RetrievalResult:
        clean_query = query.strip()
        if not clean_query:
            raise KnowledgeRetrievalError("Search query cannot be empty.")

        if mode not in {"auto", "semantic", "keyword"}:
            raise KnowledgeRetrievalError("Search mode must be auto, semantic, or keyword.")

        result_limit = max(1, min(top_k or self.default_top_k, 50))
        active_filters = filters or RetrievalFilters()

        if mode == "keyword":
            return RetrievalResult(
                query=clean_query,
                method="keyword",
                hits=self._keyword_search(
                    session,
                    clean_query,
                    result_limit,
                    active_filters,
                ),
            )

        try:
            semantic_hits = await self._semantic_search(
                session,
                clean_query,
                result_limit,
                active_filters,
            )
        except (ProviderError, KnowledgeRetrievalError, ValueError) as exc:
            if mode == "semantic":
                raise KnowledgeRetrievalError(str(exc)) from exc

            return RetrievalResult(
                query=clean_query,
                method="keyword",
                hits=self._keyword_search(
                    session,
                    clean_query,
                    result_limit,
                    active_filters,
                ),
                fallback_reason=str(exc),
            )

        if semantic_hits:
            return RetrievalResult(
                query=clean_query,
                method="semantic",
                hits=semantic_hits,
            )

        if mode == "semantic":
            return RetrievalResult(
                query=clean_query,
                method="semantic",
                hits=[],
            )

        return RetrievalResult(
            query=clean_query,
            method="keyword",
            hits=self._keyword_search(
                session,
                clean_query,
                result_limit,
                active_filters,
            ),
            fallback_reason="No compatible local embedding vectors matched the active filters.",
        )

    async def _semantic_search(
        self,
        session: Session,
        query: str,
        limit: int,
        filters: RetrievalFilters,
    ) -> list[RetrievalHit]:
        vectors = await self.embed(self.embedding_model, [query])
        if len(vectors) != 1 or not vectors[0]:
            raise KnowledgeRetrievalError("Embedding provider did not return a query vector.")

        query_vector = vectors[0]
        statement = (
            select(
                ChunkEmbedding,
                KnowledgeChunk,
                KnowledgeDocument,
                KnowledgeCollection,
            )
            .join(KnowledgeChunk, KnowledgeChunk.id == ChunkEmbedding.chunk_id)
            .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
            .join(
                KnowledgeCollection,
                KnowledgeCollection.id == KnowledgeDocument.collection_id,
            )
            .where(
                ChunkEmbedding.provider == self.embedding_provider,
                ChunkEmbedding.model == self.embedding_model,
                KnowledgeDocument.status == "indexed",
            )
        )
        statement = self._apply_filters(statement, filters)
        rows = session.execute(statement).all()

        ranked: list[RetrievalHit] = []
        for embedding, chunk, document, collection in rows:
            stored = embedding.vector_json
            if not isinstance(stored, list) or not stored:
                continue

            try:
                vector = [float(value) for value in stored]
            except (TypeError, ValueError):
                continue

            if len(vector) != len(query_vector):
                continue

            score = _cosine_similarity(query_vector, vector)
            ranked.append(
                self._hit(
                    chunk,
                    document,
                    collection,
                    score=score,
                    method="semantic",
                )
            )

        ranked.sort(key=lambda hit: (-hit.score, hit.document_id, hit.ordinal))
        return ranked[:limit]

    def _keyword_search(
        self,
        session: Session,
        query: str,
        limit: int,
        filters: RetrievalFilters,
    ) -> list[RetrievalHit]:
        terms = _tokens(query)
        if not terms:
            return []

        statement = (
            select(KnowledgeChunk, KnowledgeDocument, KnowledgeCollection)
            .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
            .join(
                KnowledgeCollection,
                KnowledgeCollection.id == KnowledgeDocument.collection_id,
            )
            .where(KnowledgeDocument.status == "indexed")
        )
        statement = self._apply_filters(statement, filters)
        rows = session.execute(statement).all()

        phrase = query.casefold()
        ranked: list[RetrievalHit] = []
        for chunk, document, collection in rows:
            haystack = chunk.text.casefold()
            matched_terms = sum(1 for term in terms if term in haystack)
            if matched_terms == 0:
                continue

            occurrence_count = sum(haystack.count(term) for term in terms)
            coverage = matched_terms / len(terms)
            phrase_bonus = 1.0 if phrase in haystack else 0.0
            density = min(1.0, occurrence_count / max(1, len(terms) * 3))
            score = coverage + (0.35 * density) + (0.65 * phrase_bonus)

            ranked.append(
                self._hit(
                    chunk,
                    document,
                    collection,
                    score=score,
                    method="keyword",
                )
            )

        ranked.sort(key=lambda hit: (-hit.score, hit.document_id, hit.ordinal))
        return ranked[:limit]

    @staticmethod
    def _apply_filters(statement, filters: RetrievalFilters):
        if filters.collection_ids:
            statement = statement.where(
                KnowledgeDocument.collection_id.in_(filters.collection_ids)
            )
        if filters.document_ids:
            statement = statement.where(KnowledgeDocument.id.in_(filters.document_ids))
        return statement

    @staticmethod
    def _hit(
        chunk: KnowledgeChunk,
        document: KnowledgeDocument,
        collection: KnowledgeCollection,
        *,
        score: float,
        method: str,
    ) -> RetrievalHit:
        return RetrievalHit(
            chunk_id=chunk.id,
            document_id=document.id,
            collection_id=collection.id,
            filename=document.filename,
            collection_name=collection.name,
            ordinal=chunk.ordinal,
            text=chunk.text,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            score=score,
            method=method,
        )


def _tokens(value: str) -> list[str]:
    """Return unique query tokens while preserving first-seen order."""

    seen: set[str] = set()
    tokens: list[str] = []
    for match in _TOKEN_PATTERN.findall(value.casefold()):
        if match not in seen:
            seen.add(match)
            tokens.append(match)
    return tokens


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        raise ValueError("Embedding vectors must have matching non-zero dimensions.")

    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)
