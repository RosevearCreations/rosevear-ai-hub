from sqlalchemy.orm import Session

from rosevear_ai_hub.database import build_engine
from rosevear_ai_hub.knowledge.retrieval import (
    KnowledgeRetrievalService,
    RetrievalFilters,
)
from rosevear_ai_hub.models import (
    Base,
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
)
from rosevear_ai_hub.providers.base import ProviderUnavailableError


async def query_embed(model: str, inputs: list[str]) -> list[list[float]]:
    assert model == "test-embed"
    assert len(inputs) == 1
    return [[1.0, 0.0]]


async def offline_embed(model: str, inputs: list[str]) -> list[list[float]]:
    raise ProviderUnavailableError("embedding provider offline")


def seed_retrieval_data(session: Session) -> tuple[int, int]:
    inbox = KnowledgeCollection(
        id=1,
        name="Inbox",
        description="local",
        local_only=True,
    )
    workshop = KnowledgeCollection(
        id=2,
        name="Workshop",
        description="shop",
        local_only=True,
    )
    session.add_all([inbox, workshop])

    first = KnowledgeDocument(
        collection_id=1,
        filename="general.txt",
        content_hash="a" * 64,
        mime_type="text/plain",
        source_path="originals/general.txt",
        size_bytes=100,
        extracted_text="General local notes about schedules.",
        metadata_json={},
        status="indexed",
    )
    second = KnowledgeDocument(
        collection_id=2,
        filename="forge.md",
        content_hash="b" * 64,
        mime_type="text/markdown",
        source_path="originals/forge.md",
        size_bytes=100,
        extracted_text="Forge burner tuning and workshop ventilation notes.",
        metadata_json={},
        status="indexed",
    )
    session.add_all([first, second])
    session.flush()

    first_chunk = KnowledgeChunk(
        document_id=first.id,
        ordinal=0,
        text="General local notes about schedules.",
        start_char=0,
        end_char=36,
        citation_metadata={"ordinal": 0},
        embedding_reference=None,
    )
    second_chunk = KnowledgeChunk(
        document_id=second.id,
        ordinal=0,
        text="Forge burner tuning and workshop ventilation notes.",
        start_char=0,
        end_char=51,
        citation_metadata={"ordinal": 0},
        embedding_reference=None,
    )
    session.add_all([first_chunk, second_chunk])
    session.flush()

    first_embedding = ChunkEmbedding(
        chunk_id=first_chunk.id,
        provider="ollama",
        model="test-embed",
        dimensions=2,
        vector_json=[0.0, 1.0],
    )
    second_embedding = ChunkEmbedding(
        chunk_id=second_chunk.id,
        provider="ollama",
        model="test-embed",
        dimensions=2,
        vector_json=[1.0, 0.0],
    )
    session.add_all([first_embedding, second_embedding])
    session.flush()

    first_chunk.embedding_reference = f"sqlalchemy-json:{first_embedding.id}"
    second_chunk.embedding_reference = f"sqlalchemy-json:{second_embedding.id}"
    session.commit()
    return first.id, second.id


async def test_semantic_retrieval_ranks_closest_chunk(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'retrieval.db'}")
    Base.metadata.create_all(engine)
    service = KnowledgeRetrievalService(
        embed=query_embed,
        embedding_provider="ollama",
        embedding_model="test-embed",
        default_top_k=8,
    )

    with Session(engine) as session:
        _, forge_document_id = seed_retrieval_data(session)
        result = await service.search(session, "workshop forge")

    assert result.method == "semantic"
    assert result.fallback_reason is None
    assert result.hits[0].document_id == forge_document_id
    assert result.hits[0].filename == "forge.md"
    assert result.hits[0].score == 1.0


async def test_retrieval_applies_collection_and_document_filters(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'filters.db'}")
    Base.metadata.create_all(engine)
    service = KnowledgeRetrievalService(
        embed=query_embed,
        embedding_provider="ollama",
        embedding_model="test-embed",
    )

    with Session(engine) as session:
        general_id, forge_id = seed_retrieval_data(session)

        collection_result = await service.search(
            session,
            "notes",
            filters=RetrievalFilters(collection_ids=(1,)),
        )
        document_result = await service.search(
            session,
            "notes",
            filters=RetrievalFilters(document_ids=(forge_id,)),
        )

    assert [hit.document_id for hit in collection_result.hits] == [general_id]
    assert [hit.document_id for hit in document_result.hits] == [forge_id]


async def test_auto_mode_falls_back_to_keyword_when_embeddings_are_offline(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'fallback.db'}")
    Base.metadata.create_all(engine)
    service = KnowledgeRetrievalService(
        embed=offline_embed,
        embedding_provider="ollama",
        embedding_model="test-embed",
    )

    with Session(engine) as session:
        _, forge_id = seed_retrieval_data(session)
        result = await service.search(session, "forge ventilation")

    assert result.method == "keyword"
    assert result.fallback_reason == "embedding provider offline"
    assert result.hits[0].document_id == forge_id
    assert result.hits[0].method == "keyword"
    assert result.hits[0].score > 1.0
