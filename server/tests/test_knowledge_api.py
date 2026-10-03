from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.knowledge import get_knowledge_ingestion_service
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.knowledge.ingestion import KnowledgeIngestionService
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, KnowledgeCollection


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

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_knowledge_ingestion_service] = lambda: ingestion
    return TestClient(application)


def test_upload_list_and_duplicate_detection(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("notes.txt", b"private local notes", "text/plain")},
        data={"collection_id": "1"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["duplicate"] is False
    assert body["document"]["filename"] == "notes.txt"
    assert body["document"]["status"] == "ingested"
    assert body["document"]["extracted_characters"] == len("private local notes")
    assert body["document"]["source_path"].startswith("originals/")

    duplicate = client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("renamed.txt", b"private local notes", "text/plain")},
        data={"collection_id": "1"},
    )
    assert duplicate.status_code == 200
    duplicate_body = duplicate.json()
    assert duplicate_body["duplicate"] is True
    assert duplicate_body["document"]["id"] == body["document"]["id"]

    listing = client.get("/api/v1/knowledge/documents")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


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
