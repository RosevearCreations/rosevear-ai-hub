import json

import pytest
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine
from rosevear_ai_hub.event_engine import AutomationEventEngine, MQTTEvent, StateEvent
from rosevear_ai_hub.models import AppSetting, AuditEvent, Automation, AutomationRun, Base


class FakeHomeAssistantClient:
    def __init__(self) -> None:
        self.light_calls: list[tuple[str, bool]] = []
        self.switch_calls: list[tuple[str, bool]] = []
        self.scene_calls: list[str] = []
        self.current_states = [
            {
                "entity_id": "binary_sensor.workshop_motion",
                "state": "off",
                "attributes": {"friendly_name": "Workshop motion"},
            },
            {
                "entity_id": "input_boolean.workshop_occupied",
                "state": "on",
                "attributes": {"friendly_name": "Workshop occupied"},
            },
            {
                "entity_id": "sensor.workshop_temperature",
                "state": "24",
                "attributes": {"friendly_name": "Workshop temperature"},
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {"friendly_name": "Workshop light"},
            },
        ]

    async def states(self):
        return [dict(item) for item in self.current_states]

    async def set_light(self, entity_id: str, *, enabled: bool):
        self.light_calls.append((entity_id, enabled))
        state = "on" if enabled else "off"
        return [
            {
                "entity_id": entity_id,
                "state": state,
                "attributes": {"friendly_name": "Workshop light"},
            }
        ]

    async def set_switch(self, entity_id: str, *, enabled: bool):
        self.switch_calls.append((entity_id, enabled))
        return [{"entity_id": entity_id, "state": "on" if enabled else "off"}]

    async def activate_scene(self, entity_id: str):
        self.scene_calls.append(entity_id)
        return [{"entity_id": entity_id, "state": "scening"}]


def build_engine_and_session(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'event-engine.db'}")
    Base.metadata.create_all(engine)
    return engine, sessionmaker(bind=engine, expire_on_commit=False)


def state_rule(*, cooldown_seconds: int = 0, deduplication_key: str | None = None) -> dict:
    return {
        "schema_version": 1,
        "trigger": {
            "type": "state_change",
            "entity_id": "binary_sensor.workshop_motion",
            "to_state": "on",
        },
        "conditions": [
            {
                "type": "state_equals",
                "entity_id": "input_boolean.workshop_occupied",
                "state": "on",
            }
        ],
        "actions": [
            {
                "type": "tool",
                "tool_key": "home_assistant.light.set",
                "arguments": {"entity_id": "light.workshop", "state": "on"},
            }
        ],
        "cooldown_seconds": cooldown_seconds,
        "deduplication_key": deduplication_key,
    }


def mqtt_rule(payload_equals: str) -> dict:
    return {
        "schema_version": 1,
        "trigger": {
            "type": "mqtt_message",
            "topic_filter": "rosevear/sensors/+",
            "qos": 0,
            "payload_equals": payload_equals,
        },
        "conditions": [],
        "actions": [
            {
                "type": "tool",
                "tool_key": "home_assistant.light.set",
                "arguments": {"entity_id": "light.workshop", "state": "on"},
            }
        ],
        "cooldown_seconds": 0,
        "deduplication_key": "mqtt.workshop.light",
    }


def seed_rule(session_maker, definition: dict) -> int:
    with session_maker() as session:
        session.add(
            AppSetting(
                key="home_assistant.safe_control_allowlist",
                value_json=["light.workshop"],
            )
        )
        automation = Automation(
            name="Workshop automation",
            enabled=True,
            definition_json=definition,
        )
        session.add(automation)
        session.commit()
        return automation.id


@pytest.mark.asyncio
async def test_state_event_executes_allowlisted_action_and_persists_evidence(tmp_path) -> None:
    _engine, session_maker = build_engine_and_session(tmp_path)
    automation_id = seed_rule(session_maker, state_rule())
    home = FakeHomeAssistantClient()
    event_engine = AutomationEventEngine(session_maker, home)

    executed = await event_engine.process_state_event(
        StateEvent(
            entity_id="binary_sensor.workshop_motion",
            old_state="off",
            new_state="on",
            occurred_at="2026-10-08T12:30:00+00:00",
            source_event_id="ha-event-1",
        )
    )

    assert executed == 1
    assert home.light_calls == [("light.workshop", True)]

    with session_maker() as session:
        run = session.scalar(
            select(AutomationRun).where(AutomationRun.automation_id == automation_id)
        )
        assert run is not None
        assert run.status == "success"
        assert run.result_summary["actions_completed"] == 1
        assert run.result_summary["event"]["source"] == "home_assistant"

        event_types = set(session.scalars(select(AuditEvent.event_type)).all())
        assert "tool.execution.completed" in event_types
        assert "automation.run.completed" in event_types


@pytest.mark.asyncio
async def test_deduplication_and_cooldown_prevent_replay(tmp_path) -> None:
    _engine, session_maker = build_engine_and_session(tmp_path)
    seed_rule(
        session_maker,
        state_rule(cooldown_seconds=60, deduplication_key="workshop.motion.light"),
    )
    home = FakeHomeAssistantClient()
    event_engine = AutomationEventEngine(session_maker, home)
    event = StateEvent(
        entity_id="binary_sensor.workshop_motion",
        old_state="off",
        new_state="on",
        occurred_at="2026-10-08T12:31:00+00:00",
        source_event_id="ha-event-2",
    )

    assert await event_engine.process_state_event(event) == 1
    assert await event_engine.process_state_event(event) == 0
    assert home.light_calls == [("light.workshop", True)]

    with session_maker() as session:
        statuses = session.scalars(
            select(AutomationRun.status).order_by(AutomationRun.id.asc())
        ).all()
        assert statuses == ["success", "skipped"]
        skipped = session.scalar(
            select(AutomationRun)
            .where(AutomationRun.status == "skipped")
            .order_by(AutomationRun.id.desc())
        )
        assert skipped is not None
        assert skipped.result_summary["reason"] == "duplicate_event"


@pytest.mark.asyncio
async def test_mqtt_run_summary_hashes_payload_instead_of_persisting_plaintext(tmp_path) -> None:
    _engine, session_maker = build_engine_and_session(tmp_path)
    secretish_payload = "garage-side-motion-open"
    seed_rule(session_maker, mqtt_rule(secretish_payload))
    home = FakeHomeAssistantClient()
    event_engine = AutomationEventEngine(session_maker, home)

    executed = await event_engine.process_mqtt_event(
        MQTTEvent(
            topic="rosevear/sensors/motion",
            payload=secretish_payload,
            qos=0,
            retain=False,
            received_at="2026-10-08T12:32:00+00:00",
        )
    )
    assert executed == 1

    with session_maker() as session:
        run = session.scalar(select(AutomationRun).order_by(AutomationRun.id.desc()))
        assert run is not None
        serialized = json.dumps(run.result_summary, sort_keys=True)
        assert secretish_payload not in serialized
        assert "payload_sha256" in serialized


@pytest.mark.asyncio
async def test_threshold_requires_crossing_not_merely_remaining_above(tmp_path) -> None:
    _engine, session_maker = build_engine_and_session(tmp_path)
    rule = state_rule()
    rule["trigger"] = {
        "type": "state_threshold",
        "entity_id": "sensor.workshop_temperature",
        "above": 30,
    }
    seed_rule(session_maker, rule)
    home = FakeHomeAssistantClient()
    event_engine = AutomationEventEngine(session_maker, home)

    not_crossed = await event_engine.process_state_event(
        StateEvent(
            entity_id="sensor.workshop_temperature",
            old_state="31",
            new_state="32",
            occurred_at="2026-10-08T12:33:00+00:00",
        )
    )
    crossed = await event_engine.process_state_event(
        StateEvent(
            entity_id="sensor.workshop_temperature",
            old_state="29",
            new_state="31",
            occurred_at="2026-10-08T12:34:00+00:00",
        )
    )

    assert not_crossed == 0
    assert crossed == 1
    assert home.light_calls == [("light.workshop", True)]
