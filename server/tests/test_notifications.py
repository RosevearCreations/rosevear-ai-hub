import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.event_engine import AutomationEventEngine, StateEvent
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    AuditEvent,
    Automation,
    AutomationRun,
    Base,
    Notification,
    NotificationReceipt,
)


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'notifications.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201
    return client, session_maker


def test_local_notification_inbox_is_persistent_and_per_user(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)

    created = client.post(
        "/api/v1/notifications/test",
        json={
            "title": "Workshop check",
            "message": "Workshop temperature needs attention.",
            "severity": "warning",
        },
    )
    assert created.status_code == 201, created.text
    notification_id = created.json()["id"]
    assert created.json()["unread"] is True
    assert created.json()["audience"] == "household"

    summary = client.get("/api/v1/notifications/summary")
    assert summary.status_code == 200
    assert summary.json()["total"] == 1
    assert summary.json()["unread"] == 1
    assert summary.json()["warning"] == 1

    unread = client.get("/api/v1/notifications?status=unread&limit=10")
    assert unread.status_code == 200
    assert unread.json()["total"] == 1
    assert unread.json()["notifications"][0]["title"] == "Workshop check"

    marked = client.post(f"/api/v1/notifications/{notification_id}/read", json={})
    assert marked.status_code == 200
    assert marked.json()["unread"] is False
    assert marked.json()["read_at"] is not None

    created_user = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created_user.status_code == 201
    family_id = created_user.json()["id"]

    assert client.post("/api/v1/auth/logout").status_code == 200
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "family-password-123"},
    )
    assert login.status_code == 200

    family_summary = client.get("/api/v1/notifications/summary")
    assert family_summary.status_code == 200
    assert family_summary.json()["unread"] == 1

    dismissed = client.post(f"/api/v1/notifications/{notification_id}/dismiss", json={})
    assert dismissed.status_code == 200
    assert dismissed.json()["updated"] == 1
    assert client.get("/api/v1/notifications?status=all").json()["total"] == 0

    with session_maker() as session:
        record = session.get(Notification, notification_id)
        family_receipt = session.scalar(
            select(NotificationReceipt).where(
                NotificationReceipt.notification_id == notification_id,
                NotificationReceipt.user_id == family_id,
            )
        )
        audit = session.scalar(
            select(AuditEvent).where(AuditEvent.event_type == "notification.created")
        )
        assert record is not None
        assert family_receipt is not None
        assert family_receipt.dismissed_at is not None
        assert audit is not None
        assert audit.tool_key == "notification.household.send"
        assert audit.risk_level == 1


@pytest.mark.asyncio
async def test_event_engine_can_create_level_one_household_notification(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'notification-automation.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    definition = {
        "schema_version": 1,
        "trigger": {
            "type": "state_change",
            "entity_id": "binary_sensor.workshop_motion",
            "to_state": "on",
        },
        "conditions": [],
        "actions": [
            {
                "type": "tool",
                "tool_key": "notification.household.send",
                "arguments": {
                    "title": "Workshop motion",
                    "message": "Motion was detected in the workshop.",
                    "severity": "info",
                },
            }
        ],
        "cooldown_seconds": 0,
        "deduplication_key": "workshop.motion.notification",
    }

    with session_maker() as session:
        automation = Automation(
            name="Workshop motion notification",
            enabled=True,
            definition_json=definition,
        )
        session.add(automation)
        session.commit()
        automation_id = automation.id

    event_engine = AutomationEventEngine(session_maker, None)
    executed = await event_engine.process_state_event(
        StateEvent(
            entity_id="binary_sensor.workshop_motion",
            old_state="off",
            new_state="on",
            occurred_at="2026-10-08T22:30:00+00:00",
            source_event_id="notification-event-1",
        )
    )

    assert executed == 1
    with session_maker() as session:
        notification = session.scalar(select(Notification).order_by(Notification.id.desc()))
        run = session.scalar(
            select(AutomationRun)
            .where(AutomationRun.automation_id == automation_id)
            .order_by(AutomationRun.id.desc())
        )
        tool_audit = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.tool_key == "notification.household.send")
            .order_by(AuditEvent.id.desc())
        )
        assert notification is not None
        assert notification.title == "Workshop motion"
        assert notification.message == "Motion was detected in the workshop."
        assert notification.severity == "info"
        assert notification.source_type == "automation"
        assert run is not None
        assert run.status == "success"
        assert run.result_summary["actions_completed"] == 1
        assert tool_audit is not None
        assert tool_audit.risk_level == 1
