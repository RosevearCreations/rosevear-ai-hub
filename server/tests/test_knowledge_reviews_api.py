"""Build 055 private source reviews; metadata stays local without schema changes."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import KnowledgeCollection, KnowledgeDocument


def make_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'knowledge-reviews.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        db.add(KnowledgeCollection(id=1, name="Inbox", local_only=True))
        db.add(
            KnowledgeDocument(
                id=7,
                collection_id=1,
                filename="maker-note.md",
                content_hash="f" * 64,
                mime_type="text/markdown",
                source_path="7.md",
                size_bytes=9,
                extracted_text="Example.",
                metadata_json={"page_count": 1, "origin": "manual"},
                status="ingested",
            )
        )
        db.commit()

    def dependency():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = dependency
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client, sessions


def test_source_review_persists_without_losing_ingestion_metadata(tmp_path) -> None:
    client, sessions = make_client(tmp_path)
    result = client.patch(
        "/api/v1/knowledge/documents/7/review",
        json={"status": "flagged", "note": "Check origin before trusting this."},
    )
    assert result.status_code == 200
    assert result.json()["document_id"] == 7
    assert result.json()["status"] == "flagged"
    assert result.json()["reviewed_by_user_id"] == 1
    assert client.get("/api/v1/knowledge/reviews").json()[0]["status"] == "flagged"
    with sessions() as db:
        record = db.get(KnowledgeDocument, 7)
        assert record.metadata_json["page_count"] == 1
        assert record.metadata_json["origin"] == "manual"
        assert record.metadata_json["hub_source_review"]["status"] == "flagged"
        assert record.status == "ingested"


def test_review_limits_and_unknown_document_do_not_write(tmp_path) -> None:
    client, _ = make_client(tmp_path)
    assert client.patch(
        "/api/v1/knowledge/documents/89/review",
        json={"status": "approved", "note": ""},
    ).status_code == 404
    assert client.patch(
        "/api/v1/knowledge/documents/7/review",
        json={"status": "approved", "note": "x" * 501},
    ).status_code == 422
    assert client.patch(
        "/api/v1/knowledge/documents/7/review",
        json={"status": "deleted", "note": ""},
    ).status_code == 422
    assert client.get("/api/v1/knowledge/reviews").json() == []


def test_viewer_cannot_read_review_notes_or_change_review(tmp_path) -> None:
    client, _ = make_client(tmp_path)
    assert client.patch(
        "/api/v1/knowledge/documents/7/review",
        json={"status": "approved", "note": "Owner-only source assessment"},
    ).status_code == 200
    assert client.post(
        "/api/v1/auth/users",
        json={
            "username": "review-reader",
            "password": "reader-password-123",
            "role": "read_only",
        },
    ).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "review-reader", "password": "reader-password-123"},
    ).status_code == 200
    assert client.get("/api/v1/knowledge/reviews").status_code == 403
    assert client.patch(
        "/api/v1/knowledge/documents/7/review",
        json={"status": "flagged", "note": "Not permitted"},
    ).status_code == 403
    assert client.get("/api/v1/knowledge/documents").status_code == 200
