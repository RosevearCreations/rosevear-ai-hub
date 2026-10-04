from collections.abc import AsyncIterator
from typing import Any

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
from rosevear_ai_hub.providers.base import AIProvider, ProviderDescriptor, ProviderHealth
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry


async def fake_query_embed(model: str, inputs: list[str]) -> list[list[float]]:
    assert model == "test-embed"
    return [[1.0, 0.0] for _ in inputs]


class GroundedProvider(AIProvider):
    _descriptor = ProviderDescriptor(
        key="test-local",
        display_name="Test Local",
        provider_type="local",
        privacy_policy="local_only",
        supports_streaming=True,
        supports_tools=False,
        enabled=True,
    )

    @property
    def descriptor(self) -> ProviderDescriptor:
        return self._descriptor

    async def health(self) -> ProviderHealth:
        return ProviderHealth(available=True, message="Ready.", model_count=1)

    async def models(self) -> list[dict[str, Any]]:
        return [{"name": "test-chat"}]

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        assert model == "test-chat"
        assert "[K1]" in messages[-1]["content"]
        yield "The workshop compressor uses a blue drain valve. [K1]"


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
            filename="local-notes.md",
            content_hash="c" * 64,
            mime_type="text/markdown",
            source_path="originals/local-notes.md",
            size_bytes=80,
            extracted_text="# Workshop\nThe workshop compressor uses a blue drain valve.",
            metadata_json={},
            status="indexed",
        )
        session.add(document)
        session.flush()
        chunk = KnowledgeChunk(
            document_id=document.id,
            ordinal=0,
            text="The workshop compressor uses a blue drain valve.",
            start_char=11,
            end_char=58,
            citation_metadata={"ordinal": 0, "section": "Workshop"},
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
    registry = ProviderRegistry([GroundedProvider()])

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_knowledge_retrieval_service] = lambda: retrieval
    application.dependency_overrides[get_provider_registry] = lambda: registry
    return TestClient(application)


def test_search_endpoint_returns_citation_ready_results(tmp_path) -> None:
    client = build_search_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "compressor drain", "top_k": 5},
    )

    assert response.status_code == 200
    body = response.json()
    hit = body["hits"][0]
    assert hit["filename"] == "local-notes.md"
    assert hit["section"] == "Workshop"
    assert hit["location_label"] == "Workshop"
    assert hit["evidence_path"] == f"/api/v1/knowledge/evidence/{hit['chunk_id']}"


def test_evidence_endpoint_returns_verifiable_source_text(tmp_path) -> None:
    client = build_search_client(tmp_path)
    search = client.post("/api/v1/knowledge/search", json={"query": "compressor"}).json()
    chunk_id = search["hits"][0]["chunk_id"]

    response = client.get(f"/api/v1/knowledge/evidence/{chunk_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["source_name"] == "local-notes.md"
    assert body["section"] == "Workshop"
    assert "blue drain valve" in body["text"]


def test_grounded_answer_requires_and_returns_known_citations(tmp_path) -> None:
    client = build_search_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/answer",
        json={
            "query": "Which drain valve does the workshop compressor use?",
            "provider": "test-local",
            "model": "test-chat",
            "top_k": 4,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["grounding_status"] == "grounded"
    assert body["answer"].endswith("[K1]")
    assert body["citations"][0]["citation_id"] == "K1"
    assert body["citations"][0]["source_name"] == "local-notes.md"
    assert body["citations"][0]["section"] == "Workshop"


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
