"""Chunking and local embedding orchestration."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import delete
from sqlalchemy.orm import Session

from rosevear_ai_hub.knowledge.chunking import TextChunk, chunk_text
from rosevear_ai_hub.knowledge.vector_store import VectorStore
from rosevear_ai_hub.models import KnowledgeChunk, KnowledgeDocument

EmbeddingFunction = Callable[[str, list[str]], Awaitable[list[list[float]]]]


class KnowledgeIndexingError(RuntimeError):
    """Raised when chunking or embedding cannot complete safely."""


@dataclass(frozen=True)
class IndexingResult:
    """Result of one complete document indexing pass."""

    document_id: int
    chunk_count: int
    embedding_provider: str
    embedding_model: str
    dimensions: int | None
    status: str


class KnowledgeIndexingService:
    """Create chunks, request local embeddings, and persist vector references."""

    def __init__(
        self,
        *,
        embed: EmbeddingFunction,
        vector_store: VectorStore,
        embedding_provider: str,
        embedding_model: str,
        chunk_characters: int,
        chunk_overlap_characters: int,
        embedding_batch_size: int,
    ) -> None:
        self.embed = embed
        self.vector_store = vector_store
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self.chunk_characters = chunk_characters
        self.chunk_overlap_characters = chunk_overlap_characters
        self.embedding_batch_size = max(1, embedding_batch_size)

    async def index_document(
        self,
        session: Session,
        document: KnowledgeDocument,
    ) -> IndexingResult:
        chunks = chunk_text(
            document.extracted_text,
            max_characters=self.chunk_characters,
            overlap_characters=self.chunk_overlap_characters,
        )

        self._replace_chunks(session, document, chunks)

        if not chunks:
            document.status = "no_text"
            document.indexed_at = datetime.now(UTC)
            session.commit()
            return IndexingResult(
                document_id=document.id,
                chunk_count=0,
                embedding_provider=self.embedding_provider,
                embedding_model=self.embedding_model,
                dimensions=None,
                status=document.status,
            )

        persisted_chunks = (
            session.query(KnowledgeChunk)
            .filter(KnowledgeChunk.document_id == document.id)
            .order_by(KnowledgeChunk.ordinal.asc())
            .all()
        )

        dimensions: int | None = None
        try:
            for offset in range(0, len(persisted_chunks), self.embedding_batch_size):
                batch = persisted_chunks[offset : offset + self.embedding_batch_size]
                vectors = await self.embed(
                    self.embedding_model,
                    [chunk.text for chunk in batch],
                )
                if len(vectors) != len(batch):
                    raise KnowledgeIndexingError(
                        "Embedding provider returned a different number of vectors than inputs."
                    )

                for chunk, vector in zip(batch, vectors, strict=True):
                    if not vector:
                        raise KnowledgeIndexingError("Embedding provider returned an empty vector.")
                    if dimensions is None:
                        dimensions = len(vector)
                    elif len(vector) != dimensions:
                        raise KnowledgeIndexingError(
                            "Embedding provider returned inconsistent vector dimensions."
                        )

                    self.vector_store.replace(
                        session,
                        chunk,
                        provider=self.embedding_provider,
                        model=self.embedding_model,
                        vector=vector,
                    )

            document.status = "indexed"
            document.indexed_at = datetime.now(UTC)
            session.commit()
        except Exception:
            session.rollback()
            fresh_document = session.get(KnowledgeDocument, document.id)
            if fresh_document is not None:
                fresh_document.status = "index_error"
                session.commit()
            raise

        return IndexingResult(
            document_id=document.id,
            chunk_count=len(persisted_chunks),
            embedding_provider=self.embedding_provider,
            embedding_model=self.embedding_model,
            dimensions=dimensions,
            status=document.status,
        )

    def _replace_chunks(
        self,
        session: Session,
        document: KnowledgeDocument,
        chunks: list[TextChunk],
    ) -> None:
        self.vector_store.delete_for_document(session, document.id)
        session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document.id))

        for chunk in chunks:
            session.add(
                KnowledgeChunk(
                    document_id=document.id,
                    ordinal=chunk.ordinal,
                    text=chunk.text,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    citation_metadata=chunk.citation_metadata,
                    embedding_reference=None,
                )
            )
        session.flush()
