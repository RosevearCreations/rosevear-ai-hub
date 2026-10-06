from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.api.knowledge import get_knowledge_ingestion_service
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.knowledge.ingestion import KnowledgeIngestionService
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    Base,
    ChunkEmbedding,
    KnowledgeChunk,
    KnowledgeCollection,
    KnowledgeDocument,
)


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'knowledge-admin.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    storage_root = tmp_path / "knowledge-files"

    with session_maker() as session:
        session.add_all(
            [
                KnowledgeCollection(
                    id=1,
                    name="Inbox",
                    description="Default intake.",
                    local_only=True,
                ),
                KnowledgeCollection(
                    id=2,
                    name="Workshop",
                    description="Workshop references.",
                    local_only=True,
                ),
            ]
        )
        session.commit()

    def override_session():
        with session_maker() as session:
            yield session

    ingestion = KnowledgeIngestionService(
        storage_root,
        max_upload_bytes=1024 * 1024,
        max_expanded_docx_bytes=4 * 1024 * 1024,
    )

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_knowledge_ingestion_service] = lambda: ingestion
    client = TestClient(application)
    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert bootstrap.status_code == 201
    enabled = client.patch(
        "/api/v1/tools/knowledge.document.delete",
        json={"enabled": True},
    )
    assert enabled.status_code == 200
    return client, session_maker, storage_root


def approve_delete_confirmation(client: TestClient, document_id: int) -> str:
    prepared = client.post(
        "/api/v1/confirmations",
        json={
            "tool_key": "knowledge.document.delete",
            "arguments": {"document_id": document_id},
        },
    )
    assert prepared.status_code == 201
    confirmation_id = prepared.json()["id"]

    approved = client.post(f"/api/v1/confirmations/{confirmation_id}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    return confirmation_id


def seed_document(session_maker, storage_root: Path) -> int:
    source = storage_root / "originals" / "test.txt"
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text("local workshop document", encoding="utf-8")

    with session_maker() as session:
        document = KnowledgeDocument(
            collection_id=1,
            filename="test.txt",
            content_hash="a" * 64,
            mime_type="text/plain",
            source_path="originals/test.txt",
            size_bytes=source.stat().st_size,
            extracted_text="local workshop document",
            metadata_json={"format": "txt"},
            status="indexed",
        )
        session.add(document)
        session.flush()

        chunk = KnowledgeChunk(
            document_id=document.id,
            ordinal=0,
            text="local workshop document",
            start_char=0,
            end_char=23,
            citation_metadata={},
            embedding_reference="embedding:test",
        )
        session.add(chunk)
        session.flush()

        session.add(
            ChunkEmbedding(
                chunk_id=chunk.id,
                provider="ollama",
                model="test-embed",
                dimensions=3,
                vector_json=[1.0, 0.0, 0.0],
            )
        )
        session.commit()
        return document.id


def test_collection_create_update_and_status(tmp_path) -> None:
    client, _, _ = build_client(tmp_path)

    created = client.post(
        "/api/v1/knowledge/collections",
        json={
            "name": "Business",
            "description": "Business operations.",
            "local_only": False,
        },
    )
    assert created.status_code == 201
    collection_id = created.json()["id"]
    assert created.json()["local_only"] is False

    updated = client.patch(
        f"/api/v1/knowledge/collections/{collection_id}",
        json={"description": "Private business operations.", "local_only": True},
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Private business operations."
    assert updated.json()["local_only"] is True

    status = client.get("/api/v1/knowledge/admin/status")
    assert status.status_code == 200
    assert status.json()["collection_count"] == 3
    assert status.json()["local_only_collection_count"] == 3
    assert status.json()["document_count"] == 0


def test_duplicate_collection_name_returns_conflict(tmp_path) -> None:
    client, _, _ = build_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/collections",
        json={"name": "Inbox", "local_only": True},
    )

    assert response.status_code == 409


def test_document_move_delete_and_source_cleanup(tmp_path) -> None:
    client, session_maker, storage_root = build_client(tmp_path)
    document_id = seed_document(session_maker, storage_root)

    moved = client.patch(
        f"/api/v1/knowledge/documents/{document_id}/collection",
        json={"collection_id": 2},
    )
    assert moved.status_code == 200
    assert moved.json()["collection_id"] == 2

    status = client.get("/api/v1/knowledge/admin/status").json()
    assert status["document_count"] == 1
    assert status["indexed_document_count"] == 1
    assert status["chunk_count"] == 1
    assert status["embedding_count"] == 1

    missing_confirmation = client.delete(f"/api/v1/knowledge/documents/{document_id}")
    assert missing_confirmation.status_code == 428

    confirmation_id = approve_delete_confirmation(client, document_id)
    deleted = client.delete(
        f"/api/v1/knowledge/documents/{document_id}?confirmation_id={confirmation_id}"
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True, "source_deleted": True}
    assert not (storage_root / "originals" / "test.txt").exists()

    with Session(session_maker.kw["bind"]) as session:
        assert session.get(KnowledgeDocument, document_id) is None
        assert session.scalars(select(KnowledgeChunk)).all() == []
        assert session.scalars(select(ChunkEmbedding)).all() == []


def test_collection_delete_requires_empty_non_default_collection(tmp_path) -> None:
    client, session_maker, storage_root = build_client(tmp_path)
    document_id = seed_document(session_maker, storage_root)

    occupied = client.delete("/api/v1/knowledge/collections/1")
    assert occupied.status_code == 409

    confirmation_id = approve_delete_confirmation(client, document_id)
    client.delete(f"/api/v1/knowledge/documents/{document_id}?confirmation_id={confirmation_id}")

    default_collection = client.delete("/api/v1/knowledge/collections/1")
    assert default_collection.status_code == 409
    assert "default Inbox" in default_collection.json()["detail"]

    removable = client.delete("/api/v1/knowledge/collections/2")
    assert removable.status_code == 200
    assert removable.json()["deleted"] is True
