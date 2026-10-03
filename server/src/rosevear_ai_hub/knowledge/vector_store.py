"""Vector-storage abstraction for local knowledge embeddings."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy import delete
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import ChunkEmbedding, KnowledgeChunk


@dataclass(frozen=True)
class StoredVector:
    """Normalized stored-vector metadata."""

    reference: str
    dimensions: int
    provider: str
    model: str


class VectorStore(ABC):
    """Storage contract that can later be backed by pgvector or another engine."""

    @abstractmethod
    def replace(
        self,
        session: Session,
        chunk: KnowledgeChunk,
        *,
        provider: str,
        model: str,
        vector: list[float],
    ) -> StoredVector:
        """Replace the vector associated with one chunk."""

    @abstractmethod
    def delete_for_document(self, session: Session, document_id: int) -> None:
        """Delete embeddings owned by one document."""


class SQLAlchemyVectorStore(VectorStore):
    """Portable JSON-vector backend used by the initial SQLite deployment."""

    reference_prefix = "sqlalchemy-json"

    def replace(
        self,
        session: Session,
        chunk: KnowledgeChunk,
        *,
        provider: str,
        model: str,
        vector: list[float],
    ) -> StoredVector:
        if not vector:
            raise ValueError("Embedding vector cannot be empty.")

        session.execute(delete(ChunkEmbedding).where(ChunkEmbedding.chunk_id == chunk.id))
        record = ChunkEmbedding(
            chunk_id=chunk.id,
            provider=provider,
            model=model,
            dimensions=len(vector),
            vector_json=vector,
        )
        session.add(record)
        session.flush()

        reference = f"{self.reference_prefix}:{record.id}"
        chunk.embedding_reference = reference
        return StoredVector(
            reference=reference,
            dimensions=len(vector),
            provider=provider,
            model=model,
        )

    def delete_for_document(self, session: Session, document_id: int) -> None:
        chunk_ids = session.query(KnowledgeChunk.id).filter(
            KnowledgeChunk.document_id == document_id
        )
        session.execute(delete(ChunkEmbedding).where(ChunkEmbedding.chunk_id.in_(chunk_ids)))
