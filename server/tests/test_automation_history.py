from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.automation_history import recover_interrupted_automation_runs
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.event_engine import AutomationEventEngine, StateEvent
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AppSetting, AuditEvent, Automation, AutomationRun, Base


class UnexpectedFailureHomeAssistant:
    async def states(self):
        return [
            {
                "entity_id": "binary_sensor.workshop_motion",
                "state": "on",
                "attributes": {"friendly_name": "Workshop motion"},
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {"friendly_name": "Workshop light"},
            },
        ]

    async def set_light(self, entity_id: str, *, enabled: bool):
        raise RuntimeError("simulated adapter bug")

    async def set_switch(self, entity_id: str, *, enabled: bool):
        return []

    async def activate_scene(self, entity_id: str):
        return []


class HealthyHomeAssistant:
    async def states(self):
        return [
            {
                "entity_id": "binary_sensor.workshop_motion",
                "state": "on",
                "attributes": {"friendly_name": "Workshop motion"},
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {"friendly_name": "Workshop light"},
            },
        ]

    async def set_light(self, entity_id: str, *, enabled: bool):
        return [{"entity_id": entity_id, "state": "on" if enabled else "off"}]

    async def set_switch(self, entity_id: str, *, enabled: bool):
        return []

    async def activate_scene(self, entity_id: str):
        return []


def _session_maker(tmp_path, filename: str):
    engine = build_engine(f"sqlite:///{tmp_path / filename}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


def _rule(*, cooldown_seconds: int = 0) -> dict:
    return {
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
                "tool_key": "home_assistant.light.set",
                "arguments": {"entity_id": "light.workshop", "state": "on"},
            }
        ],
        "cooldown_seconds": cooldown_seconds,
        "deduplication_key": None,
    }


def _seed_automation(session_maker, *, cooldown_seconds: int = 0) -> int:
    with session_maker() as session:
        session.add(
            AppSetting(
                key="home_assistant.safe_control_allowlist",
                value_json=["light.workshop"],
            )
        )
        automation = Automation(
            name="Workshop motion light",
            enabled=True,
            definition_json=_rule(cooldown_seconds=cooldown_seconds),
        )
        session.add(automation)
        session.commit()
        return automation.id


def _build_client(tmp_path):
    session_maker = _session_maker(tmp_path, "history-api.db")

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


def test_history_api_filters_and_summarizes_run_evidence(tmp_path) -> None:
    client, session_maker = _build_client(tmp_path)
    automation_id = _seed_automation(session_maker)
    started = datetime(2026, 10, 8, 20, 0, tzinfo=UTC)

    with session_maker() as session:
        session.add_all(
            [
                AutomationRun(
                    automation_id=automation_id,
                    started_at=started,
                    completed_at=started,
                    status="success",
                    result_summary={
                        "event": {"source": "home_assistant"},
                        "actions_completed": 1,
                    },
                ),
                AutomationRun(
                    automation_id=automation_id,
                    started_at=started,
                    completed_at=started,
                    status="failed",
                    result_summary={
                        "event": {"source": "home_assistant"},
                        "actions_completed": 0,
                        "failure_kind": "execution_error",
                        "error": "Entity state is unavailable.",
                        "automatic_retry": False,
                    },
                ),
                AutomationRun(
                    automation_id=automation_id,
                    started_at=started,
                    completed_at=started,
                    status="interrupted",
                    result_summary={
                        "event": {"source": "mqtt", "payload_sha256": "a" * 64},
                        "actions_completed": 1,
                        "failure_kind": "runtime_restart",
                        "automatic_retry": False,
                    },
                ),
                AutomationRun(
                    automation_id=automation_id,
                    started_at=started,
                    completed_at=started,
                    status="skipped",
                    result_summary={"reason": "cooldown_active", "actions_completed": 0},
                ),
            ]
        )
        session.commit()

    filtered = client.get("/api/v1/automations/history?status=failed&limit=25")
    assert filtered.status_code == 200, filtered.text
    body = filtered.json()
    assert body["total"] == 1
    assert body["runs"][0]["automation_name"] == "Workshop motion light"
    assert body["runs"][0]["status"] == "failed"
    assert body["runs"][0]["result_summary"]["automatic_retry"] is False

    summary = client.get("/api/v1/automations/history/summary")
    assert summary.status_code == 200, summary.text
    summary_body = summary.json()
    assert summary_body["total_runs"] == 4
    assert summary_body["success_count"] == 1
    assert summary_body["failed_count"] == 1
    assert summary_body["interrupted_count"] == 1
    assert summary_body["failure_count"] == 2
    assert summary_body["skipped_count"] == 1
    assert summary_body["automations_with_failures"] == 1
    assert summary_body["automatic_retry_enabled"] is False


def test_restart_recovery_marks_running_run_interrupted_without_replay(tmp_path) -> None:
    session_maker = _session_maker(tmp_path, "recovery.db")
    automation_id = _seed_automation(session_maker)

    with session_maker() as session:
        run = AutomationRun(
            automation_id=automation_id,
            status="running",
            result_summary={
                "event": {"source": "home_assistant"},
                "actions_completed": 1,
            },
        )
        session.add(run)
        session.commit()
        run_id = run.id

    with session_maker() as session:
        recovered = recover_interrupted_automation_runs(session)
    assert recovered == 1

    with session_maker() as session:
        run = session.get(AutomationRun, run_id)
        assert run is not None
        assert run.status == "interrupted"
        assert run.completed_at is not None
        assert run.result_summary["failure_kind"] == "runtime_restart"
        assert run.result_summary["automatic_retry"] is False
        assert run.result_summary["partial_execution_possible"] is True
        assert run.result_summary["actions_completed"] == 1

        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "automation.run.interrupted")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        assert event.result["automatic_retry"] is False


@pytest.mark.asyncio
async def test_unexpected_action_failure_is_contained_and_persisted(tmp_path) -> None:
    session_maker = _session_maker(tmp_path, "unexpected.db")
    automation_id = _seed_automation(session_maker)
    engine = AutomationEventEngine(session_maker, UnexpectedFailureHomeAssistant())

    attempted = await engine.process_state_event(
        StateEvent(
            entity_id="binary_sensor.workshop_motion",
            old_state="off",
            new_state="on",
            occurred_at="2026-10-08T20:10:00+00:00",
        )
    )

    assert attempted == 1
    with session_maker() as session:
        run = session.scalar(
            select(AutomationRun)
            .where(AutomationRun.automation_id == automation_id)
            .order_by(AutomationRun.id.desc())
        )
        assert run is not None
        assert run.status == "failed"
        assert run.result_summary["failure_kind"] == "unexpected_error"
        assert run.result_summary["automatic_retry"] is False
        assert run.result_summary["error"] == "Unexpected Event Engine action failure."


@pytest.mark.asyncio
async def test_interrupted_run_participates_in_cooldown_to_prevent_immediate_replay(
    tmp_path,
) -> None:
    session_maker = _session_maker(tmp_path, "interrupted-cooldown.db")
    automation_id = _seed_automation(session_maker, cooldown_seconds=60)

    with session_maker() as session:
        session.add(
            AutomationRun(
                automation_id=automation_id,
                started_at=datetime.now(UTC),
                completed_at=datetime.now(UTC),
                status="interrupted",
                result_summary={
                    "failure_kind": "runtime_restart",
                    "automatic_retry": False,
                    "actions_completed": 1,
                },
            )
        )
        session.commit()

    engine = AutomationEventEngine(session_maker, HealthyHomeAssistant())
    attempted = await engine.process_state_event(
        StateEvent(
            entity_id="binary_sensor.workshop_motion",
            old_state="off",
            new_state="on",
            occurred_at="2026-10-08T20:11:00+00:00",
        )
    )

    assert attempted == 0
    with session_maker() as session:
        latest = session.scalar(
            select(AutomationRun)
            .where(AutomationRun.automation_id == automation_id)
            .order_by(AutomationRun.id.desc())
        )
        assert latest is not None
        assert latest.status == "skipped"
        assert latest.result_summary["reason"] == "cooldown_active"
