from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.audit import REDACTED, record_audit_event, sanitize_audit_value
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, User


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'audit.db'}")
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
    return client, session_maker


def test_sanitizer_redacts_sensitive_values_and_bounds_payloads() -> None:
    value = {
        "username": "owner",
        "password": "super-secret-password",
        "nested": {
            "access_token": "abc123",
            "authorization": "Bearer xyz",
            "safe": "visible",
        },
        "header": "Bearer should-not-persist",
        "token": "plain-token",
        "home_assistant_token": "ha-token",
        "token_count": 12,
        "long": "x" * 1200,
    }

    sanitized = sanitize_audit_value(value)

    assert sanitized["username"] == "owner"
    assert sanitized["password"] == REDACTED
    assert sanitized["nested"]["access_token"] == REDACTED
    assert sanitized["nested"]["authorization"] == REDACTED
    assert sanitized["nested"]["safe"] == "visible"
    assert sanitized["header"] == REDACTED
    assert sanitized["token"] == REDACTED
    assert sanitized["home_assistant_token"] == REDACTED
    assert sanitized["token_count"] == 12
    assert sanitized["long"].endswith("…")
    assert len(sanitized["long"]) == 1025


def test_record_audit_event_populates_filterable_metadata(tmp_path) -> None:
    _, session_maker = build_client(tmp_path)

    with session_maker() as session:
        owner = session.scalar(select(User).where(User.username == "owner"))
        assert owner is not None
        record_audit_event(
            session,
            actor_user_id=owner.id,
            event_type="tool.execution.completed",
            object_type="knowledge_document",
            object_id="42",
            action="delete",
            arguments={"document_id": 42, "password": "never-store-this"},
            result={"ok": True, "deleted": True},
            tool_key="knowledge.document.delete",
            risk_level=2,
            confirmation_id="00000000-0000-0000-0000-000000000123",
        )
        session.commit()

        event = session.scalar(
            select(AuditEvent).where(AuditEvent.event_type == "tool.execution.completed")
        )
        assert event is not None
        assert event.actor_user_id == owner.id
        assert event.tool_key == "knowledge.document.delete"
        assert event.risk_level == 2
        assert event.confirmation_id == "00000000-0000-0000-0000-000000000123"
        assert event.sanitized_arguments == {
            "document_id": 42,
            "password": REDACTED,
        }
        assert event.result == {"ok": True, "deleted": True}
        assert event.result_status == "success"


def test_owner_can_filter_paginate_and_summarize_audit_events(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)

    with session_maker() as session:
        owner = session.scalar(select(User).where(User.username == "owner"))
        assert owner is not None
        now = datetime.now(UTC)
        first = record_audit_event(
            session,
            actor_user_id=owner.id,
            event_type="tool.execution.completed",
            object_type="knowledge_document",
            object_id="42",
            action="delete",
            arguments={"document_id": 42},
            result={"ok": True},
            tool_key="knowledge.document.delete",
            risk_level=2,
            confirmation_id="confirmation-42",
        )
        first.created_at = now - timedelta(minutes=2)
        second = record_audit_event(
            session,
            actor_user_id=owner.id,
            event_type="tool.execution.failed",
            object_type="knowledge_document",
            object_id="43",
            action="delete",
            arguments={"document_id": 43},
            result={"ok": False, "reason": "test"},
            tool_key="knowledge.document.delete",
            risk_level=2,
            confirmation_id="confirmation-43",
        )
        second.created_at = now - timedelta(minutes=1)
        session.commit()

    filtered = client.get(
        "/api/v1/audit/events",
        params={
            "tool_key": "knowledge.document.delete",
            "result_status": "failure",
            "search": "execution",
            "limit": 1,
            "offset": 0,
        },
    )
    assert filtered.status_code == 200
    payload = filtered.json()
    assert payload["total"] == 1
    assert payload["limit"] == 1
    assert payload["offset"] == 0
    assert len(payload["events"]) == 1
    event = payload["events"][0]
    assert event["event_type"] == "tool.execution.failed"
    assert event["actor"]["username"] == "owner"
    assert event["tool_key"] == "knowledge.document.delete"
    assert event["result_status"] == "failure"
    assert event["sanitized_arguments"] == {"document_id": 43}

    summary = client.get("/api/v1/audit/summary")
    assert summary.status_code == 200
    summary_payload = summary.json()
    assert summary_payload["total_events"] >= 4
    assert summary_payload["success_count"] >= 3
    assert summary_payload["failure_count"] >= 1
    assert summary_payload["actor_count"] >= 1
    assert summary_payload["tool_event_count"] >= 2
    assert summary_payload["newest_event_at"] is not None
    assert summary_payload["oldest_event_at"] is not None


def test_household_user_cannot_read_audit_log(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )

    assert client.get("/api/v1/audit/events").status_code == 403
    assert client.get("/api/v1/audit/summary").status_code == 403
