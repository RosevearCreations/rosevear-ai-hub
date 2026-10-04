from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.api.knowledge import get_knowledge_retrieval_service
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.knowledge.retrieval import KnowledgeRetrievalService
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    Base,
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
)


async def fake_query_embed(model: str, inputs: list[str]) -> list[list[float]]:
    assert model == "test-embed"
    return [[1.0, 0.0] for _ in inputs]


def build_search_client(tmp_path) -> TestClient:
    engine = build_engine(f"sqlite:///{tmp_path / 'search-api.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    with Session(engine) as session:
        collection = KnowledgeCollection(
            id=1,
            name="Inbox",
            description="Default local collection.",
            local_only=True,
        )
        session.add(collection)
        document = KnowledgeDocument(
            collection_id=1,
            filename="local-notes.txt",
            content_hash="c" * 64,
            mime_type="text/plain",
            source_path="originals/local-notes.txt",
            size_bytes=80,
            extracted_text="The workshop compressor uses a blue drain valve.",
            metadata_json={},
            status="indexed",
        )
        session.add(document)
        session.flush()
        chunk = KnowledgeChunk(
            document_id=document.id,
            ordinal=0,
            text="The workshop compressor uses a blue drain valve.",
            start_char=0,
            end_char=47,
            citation_metadata={"ordinal": 0},
            embedding_reference=None,
        )
        session.add(chunk)
        session.flush()
        embedding = ChunkEmbedding(
            chunk_id=chunk.id,
            provider="ollama",
            model="test-embed",
            dimensions=2,
            vector_json=[1.0, 0.0],
        )
        session.add(embedding)
        session.flush()
        chunk.embedding_reference = f"sqlalchemy-json:{embedding.id}"
        session.commit()

    def override_session():
        with session_maker() as session:
            yield session

    retrieval = KnowledgeRetrievalService(
        embed=fake_query_embed,
        embedding_provider="ollama",
        embedding_model="test-embed",
        default_top_k=8,
    )

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_knowledge_retrieval_service] = lambda: retrieval
    return TestClient(application)


def test_search_endpoint_returns_semantic_local_results(tmp_path) -> None:
    client = build_search_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "compressor drain", "top_k": 5},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "semantic"
    assert body["fallback_reason"] is None
    assert body["hits"][0]["filename"] == "local-notes.txt"
    assert body["hits"][0]["collection_name"] == "Inbox"
    assert body["hits"][0]["method"] == "semantic"


def test_search_endpoint_supports_keyword_mode_and_filters(tmp_path) -> None:
    client = build_search_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "blue drain valve",
            "mode": "keyword",
            "collection_ids": [1],
            "document_ids": [1],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "keyword"
    assert len(body["hits"]) == 1
    assert body["hits"][0]["document_id"] == 1


def test_search_endpoint_validates_request(tmp_path) -> None:
    client = build_search_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "", "top_k": 100},
    )

    assert response.status_code == 422
