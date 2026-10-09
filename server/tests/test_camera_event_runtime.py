import pytest
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.automation_runtime import AutomationEventRuntime
from rosevear_ai_hub.database import Base, build_engine
from rosevear_ai_hub.integrations.frigate import FrigateEvent
from rosevear_ai_hub.models import AppSetting, Automation


def session_factory(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'frigate-runtime.db'}")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)


def frigate_rule() -> dict:
    return {
        "schema_version": 1,
        "trigger": {
            "type": "frigate_event",
            "label": "person",
            "camera": "camera_one",
        },
        "conditions": [],
        "actions": [
            {
                "type": "tool",
                "tool_key": "notification.household.send",
                "arguments": {
                    "title": "Camera event",
                    "message": "A camera event matched.",
                    "severity": "info",
                },
            }
        ],
        "cooldown_seconds": 0,
        "deduplication_key": None,
    }


class FakeFrigate:
    def __init__(self, events: list[FrigateEvent]) -> None:
        self.events = events

    def recent_events(self, *, limit: int):
        return self.events[:limit]


def event(event_id: str, start_time: float) -> FrigateEvent:
    return FrigateEvent(
        event_id=event_id,
        camera="camera_one",
        label="person",
        sub_label=None,
        start_time=start_time,
        end_time=None,
        zones=("entry",),
        has_clip=False,
        has_snapshot=True,
        false_positive=False,
        score=0.9,
    )


@pytest.mark.asyncio
async def test_frigate_runtime_seeds_history_then_queues_only_new_events(
    tmp_path,
    monkeypatch,
) -> None:
    factory = session_factory(tmp_path)
    with factory() as db:
        db.add(
            Automation(
                name="Camera event automation",
                enabled=True,
                definition_json=frigate_rule(),
            )
        )
        db.commit()

    fake = FakeFrigate([event("historical-1", 1.0)])
    monkeypatch.setattr(
        "rosevear_ai_hub.automation_runtime.get_frigate_client",
        lambda: fake,
    )

    runtime = AutomationEventRuntime(factory)
    assert await runtime._poll_frigate_once() == 0
    assert runtime._queue.qsize() == 0

    with factory() as db:
        setting = db.query(AppSetting).filter_by(key="frigate.event_runtime.seen_ids").one()
        assert setting.value_json == ["historical-1"]

    fake.events = [event("new-2", 2.0), event("historical-1", 1.0)]
    assert await runtime._poll_frigate_once() == 1

    kind, queued = runtime._queue.get_nowait()
    runtime._queue.task_done()
    assert kind == "frigate"
    assert queued.event_id == "new-2"
    assert runtime.snapshot()["frigate_rule_count"] == 1
    assert runtime.snapshot()["frigate_online"] is True


def test_frigate_seen_ids_reload_across_runtime_restart(tmp_path) -> None:
    factory = session_factory(tmp_path)
    with factory() as db:
        db.add(
            AppSetting(
                key="frigate.event_runtime.seen_ids",
                value_json=["event-a", "event-b"],
            )
        )
        db.commit()

    runtime = AutomationEventRuntime(factory)
    with factory() as db:
        runtime._load_frigate_seen_state(db)

    assert runtime._frigate_seen_initialized is True
    assert runtime._frigate_seen_ids == {"event-a", "event-b"}
