from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.confirmations import consume_confirmation
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, ConfirmationRequest, User


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'confirmations.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
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
    return client, session_maker


def prepare_delete(client: TestClient, document_id: int = 42) -> dict:
    response = client.post(
        "/api/v1/confirmations",
        json={
            "tool_key": "knowledge.document.delete",
            "arguments": {"document_id": document_id},
        },
    )
    assert response.status_code == 201
    return response.json()


def test_exact_action_preview_and_schema_validation(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    created = prepare_delete(client)
    assert created["status"] == "pending"
    assert created["tool_key"] == "knowledge.document.delete"
    assert created["risk_level"] == 2
    assert created["arguments"] == {"document_id": 42}
    assert created["preview"]["arguments"] == {"document_id": 42}
    assert created["preview"]["risk_label"] == "confirmation_required"
    assert "document_id=42" in created["preview"]["summary"]
    assert len(created["arguments_hash"]) == 64

    invalid = client.post(
        "/api/v1/confirmations",
        json={
            "tool_key": "knowledge.document.delete",
            "arguments": {"document_id": "forty-two"},
        },
    )
    assert invalid.status_code == 422
    assert "Tool arguments are invalid" in invalid.json()["detail"]

    extra = client.post(
        "/api/v1/confirmations",
        json={
            "tool_key": "knowledge.document.delete",
            "arguments": {"document_id": 42, "surprise": True},
        },
    )
    assert extra.status_code == 422

    not_required = client.post(
        "/api/v1/confirmations",
        json={
            "tool_key": "knowledge.search",
            "arguments": {"query": "test"},
        },
    )
    assert not_required.status_code == 409
    assert "does not require" in not_required.json()["detail"]


def test_approve_reject_and_repeat_decisions_are_blocked(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    created = prepare_delete(client)
    approved = client.post(f"/api/v1/confirmations/{created['id']}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["decided_by_user_id"] is not None

    repeat = client.post(f"/api/v1/confirmations/{created['id']}/approve")
    assert repeat.status_code == 409
    assert "already approved" in repeat.json()["detail"]

    second = prepare_delete(client, document_id=43)
    rejected = client.post(f"/api/v1/confirmations/{second['id']}/reject")
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    approve_rejected = client.post(f"/api/v1/confirmations/{second['id']}/approve")
    assert approve_rejected.status_code == 409
    assert "already rejected" in approve_rejected.json()["detail"]


def test_expired_confirmation_cannot_be_approved(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)
    created = prepare_delete(client)

    with session_maker() as session:
        request = session.get(ConfirmationRequest, created["id"])
        assert request is not None
        request.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        session.commit()

    expired = client.post(f"/api/v1/confirmations/{created['id']}/approve")
    assert expired.status_code == 410

    refreshed = client.get(f"/api/v1/confirmations/{created['id']}")
    assert refreshed.status_code == 200
    assert refreshed.json()["status"] == "expired"


def test_household_user_can_request_but_not_approve(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    created_user = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created_user.status_code == 201

    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )

    created = prepare_delete(client, document_id=55)
    forbidden = client.post(f"/api/v1/confirmations/{created['id']}/approve")
    assert forbidden.status_code == 403

    own = client.get("/api/v1/confirmations?status=pending")
    assert own.status_code == 200
    assert [item["id"] for item in own.json()] == [created["id"]]


def test_exact_approval_is_single_use_and_cannot_be_replayed(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)
    created = prepare_delete(client, document_id=77)
    approved = client.post(f"/api/v1/confirmations/{created['id']}/approve")
    assert approved.status_code == 200

    with session_maker() as session:
        owner = session.scalar(select(User).where(User.username == "owner"))
        assert owner is not None

        mismatch = None
        try:
            consume_confirmation(
                session,
                confirmation_id=created["id"],
                actor=owner,
                tool_key="knowledge.document.delete",
                arguments={"document_id": 78},
            )
        except Exception as exc:
            mismatch = exc
        assert mismatch is not None
        session.rollback()

        consumed = consume_confirmation(
            session,
            confirmation_id=created["id"],
            actor=owner,
            tool_key="knowledge.document.delete",
            arguments={"document_id": 77},
        )
        assert consumed.id == created["id"]
        session.commit()

        replay = None
        try:
            consume_confirmation(
                session,
                confirmation_id=created["id"],
                actor=owner,
                tool_key="knowledge.document.delete",
                arguments={"document_id": 77},
            )
        except Exception as exc:
            replay = exc
        assert replay is not None
        session.rollback()

        stored = session.get(ConfirmationRequest, created["id"])
        assert stored is not None
        assert stored.status == "consumed"
        assert stored.consumed_at is not None

        events = session.scalars(
            select(AuditEvent).where(AuditEvent.object_id == created["id"])
        ).all()
        event_types = {event.event_type for event in events}
        assert {
            "confirmation.requested",
            "confirmation.approved",
            "confirmation.consumed",
        }.issubset(event_types)
