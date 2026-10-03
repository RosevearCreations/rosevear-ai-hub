from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.knowledge import (
    get_knowledge_indexing_service,
    get_knowledge_ingestion_service,
)
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.knowledge.indexing import KnowledgeIndexingService
from rosevear_ai_hub.knowledge.ingestion import KnowledgeIngestionService
from rosevear_ai_hub.knowledge.vector_store import SQLAlchemyVectorStore
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, KnowledgeCollection


async def fake_embed(model: str, inputs: list[str]) -> list[list[float]]:
    assert model == "test-embed"
    return [[float(len(text)), 1.0, 0.5] for text in inputs]


def build_client(tmp_path) -> TestClient:
    engine = build_engine(f"sqlite:///{tmp_path / 'knowledge.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    with session_maker() as session:
        session.add(
            KnowledgeCollection(
                id=1,
                name="Inbox",
                description="Default local knowledge intake collection.",
                local_only=True,
            )
        )
        session.commit()

    def override_session():
        with session_maker() as session:
            yield session

    ingestion = KnowledgeIngestionService(
        tmp_path / "knowledge-files",
        max_upload_bytes=1024 * 1024,
        max_expanded_docx_bytes=4 * 1024 * 1024,
    )
    indexing = KnowledgeIndexingService(
        embed=fake_embed,
        vector_store=SQLAlchemyVectorStore(),
        embedding_provider="ollama",
        embedding_model="test-embed",
        chunk_characters=160,
        chunk_overlap_characters=30,
        embedding_batch_size=2,
    )

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_knowledge_ingestion_service] = lambda: ingestion
    application.dependency_overrides[get_knowledge_indexing_service] = lambda: indexing
    return TestClient(application)


def test_upload_list_duplicate_and_indexing(tmp_path) -> None:
    client = build_client(tmp_path)
    source_text = ("private local notes with workshop details " * 30).encode()

    response = client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("notes.txt", source_text, "text/plain")},
        data={"collection_id": "1"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["duplicate"] is False
    assert body["document"]["filename"] == "notes.txt"
    assert body["document"]["status"] == "ingested"
    assert body["document"]["source_path"].startswith("originals/")

    document_id = body["document"]["id"]
    indexed = client.post(f"/api/v1/knowledge/documents/{document_id}/index")
    assert indexed.status_code == 200
    index_body = indexed.json()
    assert index_body["status"] == "indexed"
    assert index_body["chunk_count"] > 1
    assert index_body["embedding_provider"] == "ollama"
    assert index_body["embedding_model"] == "test-embed"
    assert index_body["dimensions"] == 3

    chunks = client.get(f"/api/v1/knowledge/documents/{document_id}/chunks")
    assert chunks.status_code == 200
    assert len(chunks.json()) == index_body["chunk_count"]
    assert all(item["embedding_reference"] for item in chunks.json())

    duplicate = client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("renamed.txt", source_text, "text/plain")},
        data={"collection_id": "1"},
    )
    assert duplicate.status_code == 200
    duplicate_body = duplicate.json()
    assert duplicate_body["duplicate"] is True
    assert duplicate_body["document"]["id"] == document_id

    listing = client.get("/api/v1/knowledge/documents")
    assert listing.status_code == 200
    assert len(listing.json()) == 1
    assert listing.json()[0]["status"] == "indexed"


def test_upload_rejects_unsupported_file_type(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("payload.exe", b"MZ", "application/octet-stream")},
        data={"collection_id": "1"},
    )

    assert response.status_code == 415
    assert "Unsupported file type" in response.json()["detail"]


def test_collections_endpoint_exposes_local_default_collection(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/v1/knowledge/collections")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Inbox"
    assert response.json()[0]["local_only"] is True


def test_index_unknown_document_returns_404(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.post("/api/v1/knowledge/documents/999/index")

    assert response.status_code == 404
