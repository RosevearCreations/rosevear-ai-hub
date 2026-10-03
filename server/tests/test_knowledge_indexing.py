from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.database import build_engine
from rosevear_ai_hub.knowledge.indexing import KnowledgeIndexingService
from rosevear_ai_hub.knowledge.vector_store import SQLAlchemyVectorStore
from rosevear_ai_hub.models import (
    Base,
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
)


async def fake_embed(model: str, inputs: list[str]) -> list[list[float]]:
    assert model == "test-embed"
    return [[float(len(text)), float(index + 1), 1.0] for index, text in enumerate(inputs)]


def seed_document(session: Session, text: str) -> KnowledgeDocument:
    collection = KnowledgeCollection(
        id=1,
        name="Inbox",
        description="test",
        local_only=True,
    )
    session.add(collection)
    document = KnowledgeDocument(
        collection_id=1,
        filename="notes.txt",
        content_hash="a" * 64,
        mime_type="text/plain",
        source_path="originals/test.txt",
        size_bytes=len(text.encode()),
        extracted_text=text,
        metadata_json={"format": "txt"},
        status="ingested",
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


async def test_indexing_persists_chunks_vectors_and_document_state(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'index.db'}")
    Base.metadata.create_all(engine)

    service = KnowledgeIndexingService(
        embed=fake_embed,
        vector_store=SQLAlchemyVectorStore(),
        embedding_provider="ollama",
        embedding_model="test-embed",
        chunk_characters=180,
        chunk_overlap_characters=30,
        embedding_batch_size=2,
    )

    with Session(engine) as session:
        document = seed_document(session, "Local workshop notes. " * 80)
        result = await service.index_document(session, document)

        chunks = session.scalars(
            select(KnowledgeChunk)
            .where(KnowledgeChunk.document_id == document.id)
            .order_by(KnowledgeChunk.ordinal.asc())
        ).all()
        embeddings = session.scalars(select(ChunkEmbedding)).all()

        assert result.status == "indexed"
        assert result.chunk_count == len(chunks)
        assert result.chunk_count > 1
        assert result.dimensions == 3
        assert len(embeddings) == len(chunks)
        assert all(chunk.embedding_reference for chunk in chunks)
        assert all(item.model == "test-embed" for item in embeddings)
        assert document.indexed_at is not None


async def test_indexing_empty_extracted_text_marks_no_text(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'empty.db'}")
    Base.metadata.create_all(engine)

    service = KnowledgeIndexingService(
        embed=fake_embed,
        vector_store=SQLAlchemyVectorStore(),
        embedding_provider="ollama",
        embedding_model="test-embed",
        chunk_characters=180,
        chunk_overlap_characters=30,
        embedding_batch_size=2,
    )

    with Session(engine) as session:
        document = seed_document(session, "   ")
        result = await service.index_document(session, document)

        assert result.status == "no_text"
        assert result.chunk_count == 0
        assert result.dimensions is None
        assert session.scalars(select(KnowledgeChunk)).all() == []
