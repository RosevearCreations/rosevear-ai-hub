"""Live event-source runtime for Home Assistant, MQTT, and Frigate."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.api.home_assistant import get_home_assistant_runtime
from rosevear_ai_hub.api.mqtt import get_mqtt_runtime
from rosevear_ai_hub.automation_history import recover_interrupted_automation_runs
from rosevear_ai_hub.automations import (
    FrigateEventTrigger,
    MQTTMessageTrigger,
    normalize_rule_definition,
)
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import SessionLocal
from rosevear_ai_hub.event_engine import (
    AutomationEventEngine,
    FrigateEvent,
    MQTTEvent,
    StateEvent,
)
from rosevear_ai_hub.integrations.frigate import FrigateError, get_frigate_client
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.integrations.mqtt import MQTTError, MQTTMessageRecord
from rosevear_ai_hub.models import AppSetting, Automation

logger = logging.getLogger(__name__)

_QUEUE_CAPACITY = 256
_RECONCILE_SECONDS = 5.0
_FRIGATE_SEEN_SETTING_KEY = "frigate.event_runtime.seen_ids"
_MAX_FRIGATE_SEEN_IDS = 500


class AutomationEventRuntime:
    """Own live event subscriptions without exposing integration credentials."""

    def __init__(
        self,
        session_factory: sessionmaker[Session] = SessionLocal,
        *,
        queue_capacity: int = _QUEUE_CAPACITY,
    ) -> None:
        self._session_factory = session_factory
        self._queue: asyncio.Queue[tuple[str, Any]] = asyncio.Queue(maxsize=queue_capacity)
        self._queue_capacity = queue_capacity
        self._loop: asyncio.AbstractEventLoop | None = None
        self._engine: AutomationEventEngine | None = None
        self._home_assistant_client = None
        self._mqtt_client = None
        self._tasks: list[asyncio.Task[Any]] = []
        self._running = False
        self._stopping = asyncio.Event()
        self._processed_events = 0
        self._dropped_events = 0
        self._failed_events = 0
        self._mqtt_rule_subscriptions: set[str] = set()
        self._last_error: str | None = None
        self._recovered_interrupted_runs = 0
        self._frigate_rule_count = 0
        self._frigate_online = False
        self._frigate_last_poll_at: str | None = None
        self._frigate_seen_ids: set[str] = set()
        self._frigate_seen_initialized = False
        self._frigate_pending_ids: set[str] = set()

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stopping.clear()
        self._loop = asyncio.get_running_loop()

        try:
            with self._session_factory() as db:
                self._recovered_interrupted_runs = recover_interrupted_automation_runs(db)
                self._load_frigate_seen_state(db)
        except Exception as exc:
            self._last_error = f"Automation run recovery failed: {exc}"
            logger.exception("Automation run recovery failed")

        try:
            with self._session_factory() as db:
                home_runtime = get_home_assistant_runtime(db)
            self._home_assistant_client = home_runtime.client
        except Exception as exc:
            self._last_error = f"Home Assistant Event Engine setup failed: {exc}"
            logger.warning(self._last_error)

        try:
            with self._session_factory() as db:
                mqtt_runtime = get_mqtt_runtime(db)
            self._mqtt_client = mqtt_runtime.client
        except Exception as exc:
            self._last_error = f"MQTT Event Engine setup failed: {exc}"
            logger.warning(self._last_error)

        self._engine = AutomationEventEngine(
            self._session_factory,
            self._home_assistant_client,
        )
        if self._mqtt_client is not None:
            self._mqtt_client.add_message_listener(self._on_mqtt_message)

        self._tasks.append(asyncio.create_task(self._worker(), name="automation-event-worker"))
        self._tasks.append(
            asyncio.create_task(self._mqtt_reconcile_loop(), name="automation-mqtt-reconcile")
        )
        self._tasks.append(
            asyncio.create_task(self._frigate_poll_loop(), name="automation-frigate-events")
        )
        if self._home_assistant_client is not None:
            self._tasks.append(
                asyncio.create_task(self._home_assistant_loop(), name="automation-ha-events")
            )

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        self._stopping.set()
        if self._mqtt_client is not None:
            self._mqtt_client.remove_message_listener(self._on_mqtt_message)
        for task in self._tasks:
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()

    def snapshot(self) -> dict[str, Any]:
        return {
            "running": self._running,
            "queue_depth": self._queue.qsize(),
            "queue_capacity": self._queue_capacity,
            "processed_events": self._processed_events,
            "dropped_events": self._dropped_events,
            "failed_events": self._failed_events,
            "home_assistant_configured": self._home_assistant_client is not None,
            "mqtt_configured": self._mqtt_client is not None,
            "mqtt_rule_subscriptions": sorted(self._mqtt_rule_subscriptions),
            "frigate_configured": bool(get_settings().frigate_base_url),
            "frigate_online": self._frigate_online,
            "frigate_rule_count": self._frigate_rule_count,
            "frigate_seen_event_count": len(self._frigate_seen_ids),
            "frigate_last_poll_at": self._frigate_last_poll_at,
            "last_error": self._last_error,
            "recovered_interrupted_runs": self._recovered_interrupted_runs,
        }

    def _on_mqtt_message(self, record: MQTTMessageRecord) -> None:
        loop = self._loop
        if loop is None or not self._running:
            return
        loop.call_soon_threadsafe(self._enqueue_mqtt_nowait, record)

    def _enqueue_mqtt_nowait(self, record: MQTTMessageRecord) -> None:
        try:
            self._queue.put_nowait(
                (
                    "mqtt",
                    MQTTEvent(
                        topic=record.topic,
                        payload=record.payload,
                        qos=record.qos,
                        retain=record.retain,
                        received_at=record.received_at,
                    ),
                )
            )
        except asyncio.QueueFull:
            self._dropped_events += 1
            self._last_error = "Event Engine queue is full; an MQTT event was dropped."

    async def _home_assistant_loop(self) -> None:
        assert self._home_assistant_client is not None
        backoff = 1.0
        while self._running:
            try:
                async for raw in self._home_assistant_client.state_change_events():
                    if not self._running:
                        return
                    event = self._normalize_home_assistant_event(raw)
                    if event is not None:
                        await self._queue.put(("state", event))
                    backoff = 1.0
            except asyncio.CancelledError:
                raise
            except HomeAssistantError as exc:
                self._last_error = str(exc)
                logger.warning("Home Assistant Event Engine listener: %s", exc)
                try:
                    await asyncio.wait_for(self._stopping.wait(), timeout=backoff)
                except TimeoutError:
                    pass
                backoff = min(backoff * 2, 30.0)

    def _normalize_home_assistant_event(self, raw: dict[str, Any]) -> StateEvent | None:
        data = raw.get("data")
        if not isinstance(data, dict):
            return None
        entity_id = data.get("entity_id")
        if not isinstance(entity_id, str):
            return None
        old = data.get("old_state")
        new = data.get("new_state")
        old_state = old.get("state") if isinstance(old, dict) else None
        new_state = new.get("state") if isinstance(new, dict) else None
        if old_state is not None and not isinstance(old_state, str):
            old_state = None
        if new_state is not None and not isinstance(new_state, str):
            new_state = None
        occurred_at = raw.get("time_fired")
        if not isinstance(occurred_at, str):
            occurred_at = ""
        context = raw.get("context")
        source_event_id = context.get("id") if isinstance(context, dict) else None
        if source_event_id is not None and not isinstance(source_event_id, str):
            source_event_id = None
        return StateEvent(
            entity_id=entity_id,
            old_state=old_state,
            new_state=new_state,
            occurred_at=occurred_at,
            source_event_id=source_event_id,
        )

    async def _worker(self) -> None:
        while self._running:
            try:
                kind, event = await self._queue.get()
            except asyncio.CancelledError:
                raise
            try:
                if self._engine is None:
                    continue
                if kind == "state":
                    await self._engine.process_state_event(event)
                elif kind == "mqtt":
                    await self._engine.process_mqtt_event(event)
                else:
                    await self._engine.process_frigate_event(event)
                self._processed_events += 1
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._failed_events += 1
                self._last_error = f"Event Engine processing failed: {exc}"
                logger.exception("Event Engine processing failed")
            finally:
                if kind == "frigate":
                    try:
                        self._mark_frigate_event_seen(event.event_id)
                    except Exception:
                        logger.exception("Failed to persist Frigate event runtime checkpoint")
                    self._frigate_pending_ids.discard(event.event_id)
                self._queue.task_done()

    async def _mqtt_reconcile_loop(self) -> None:
        while self._running:
            try:
                self._reconcile_mqtt_subscriptions()
            except Exception as exc:
                self._last_error = f"MQTT automation subscription reconciliation failed: {exc}"
                logger.warning(self._last_error)
            try:
                await asyncio.wait_for(self._stopping.wait(), timeout=_RECONCILE_SECONDS)
            except TimeoutError:
                pass

    def _reconcile_mqtt_subscriptions(self) -> None:
        client = self._mqtt_client
        if client is None or not client.connected:
            return
        desired: dict[str, int] = {}
        with self._session_factory() as db:
            rows = db.scalars(select(Automation).where(Automation.enabled.is_(True))).all()
            for row in rows:
                try:
                    rule = normalize_rule_definition(dict(row.definition_json or {}))
                except ValueError:
                    continue
                trigger = rule.trigger
                if isinstance(trigger, MQTTMessageTrigger):
                    desired[trigger.topic_filter] = max(
                        desired.get(trigger.topic_filter, 0),
                        trigger.qos,
                    )

        existing = set(client.snapshot().get("subscriptions", []))
        for topic_filter, qos in desired.items():
            if topic_filter in existing:
                self._mqtt_rule_subscriptions.add(topic_filter)
                continue
            try:
                client.subscribe(topic_filter, qos=qos)
                self._mqtt_rule_subscriptions.add(topic_filter)
            except MQTTError as exc:
                self._last_error = f"MQTT automation subscription failed: {exc}"

    async def _frigate_poll_loop(self) -> None:
        while self._running:
            try:
                await self._poll_frigate_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._last_error = f"Frigate automation polling failed: {exc}"
                logger.warning(self._last_error)
            try:
                await asyncio.wait_for(
                    self._stopping.wait(),
                    timeout=get_settings().frigate_event_poll_seconds,
                )
            except TimeoutError:
                pass

    async def _poll_frigate_once(self) -> int:
        self._frigate_rule_count = self._enabled_frigate_rule_count()
        if self._frigate_rule_count == 0:
            return 0

        try:
            client = get_frigate_client()
            events = await asyncio.to_thread(
                client.recent_events,
                limit=get_settings().frigate_event_limit,
            )
        except FrigateError as exc:
            self._frigate_online = False
            self._last_error = f"Frigate automation source unavailable: {exc}"
            return 0

        self._frigate_online = True
        self._frigate_last_poll_at = datetime.now(UTC).isoformat()

        if not self._frigate_seen_initialized:
            self._initialize_frigate_seen_ids([event.event_id for event in events])
            return 0

        queued = 0
        for event in sorted(events, key=lambda item: (item.start_time, item.event_id)):
            if event.event_id in self._frigate_seen_ids:
                continue
            if event.event_id in self._frigate_pending_ids:
                continue
            self._frigate_pending_ids.add(event.event_id)
            await self._queue.put(
                (
                    "frigate",
                    FrigateEvent(
                        event_id=event.event_id,
                        camera=event.camera,
                        label=event.label,
                        sub_label=event.sub_label,
                        start_time=event.start_time,
                        end_time=event.end_time,
                        zones=event.zones,
                        has_clip=event.has_clip,
                        has_snapshot=event.has_snapshot,
                        false_positive=event.false_positive,
                        score=event.score,
                    ),
                )
            )
            queued += 1
        return queued

    def _enabled_frigate_rule_count(self) -> int:
        count = 0
        with self._session_factory() as db:
            rows = db.scalars(select(Automation).where(Automation.enabled.is_(True))).all()
            for row in rows:
                try:
                    rule = normalize_rule_definition(dict(row.definition_json or {}))
                except ValueError:
                    continue
                if isinstance(rule.trigger, FrigateEventTrigger):
                    count += 1
        return count

    def _load_frigate_seen_state(self, db: Session) -> None:
        setting = db.scalar(
            select(AppSetting).where(AppSetting.key == _FRIGATE_SEEN_SETTING_KEY)
        )
        if setting is None:
            self._frigate_seen_ids = set()
            self._frigate_seen_initialized = False
            return
        value = setting.value_json
        self._frigate_seen_ids = (
            {item for item in value if isinstance(item, str)} if isinstance(value, list) else set()
        )
        self._frigate_seen_initialized = True

    def _initialize_frigate_seen_ids(self, event_ids: list[str]) -> None:
        values = list(dict.fromkeys(event_ids))[-_MAX_FRIGATE_SEEN_IDS:]
        with self._session_factory() as db:
            setting = db.scalar(
                select(AppSetting).where(AppSetting.key == _FRIGATE_SEEN_SETTING_KEY)
            )
            if setting is None:
                setting = AppSetting(key=_FRIGATE_SEEN_SETTING_KEY, value_json=values)
                db.add(setting)
            else:
                setting.value_json = values
            db.commit()
        self._frigate_seen_ids = set(values)
        self._frigate_seen_initialized = True

    def _mark_frigate_event_seen(self, event_id: str) -> None:
        if not event_id:
            return
        self._frigate_seen_ids.add(event_id)
        with self._session_factory() as db:
            setting = db.scalar(
                select(AppSetting).where(AppSetting.key == _FRIGATE_SEEN_SETTING_KEY)
            )
            current = (
                [item for item in setting.value_json if isinstance(item, str)]
                if setting is not None and isinstance(setting.value_json, list)
                else []
            )
            values = list(dict.fromkeys([*current, event_id]))[-_MAX_FRIGATE_SEEN_IDS:]
            if setting is None:
                setting = AppSetting(key=_FRIGATE_SEEN_SETTING_KEY, value_json=values)
                db.add(setting)
            else:
                setting.value_json = values
            db.commit()
        self._frigate_seen_ids = set(values)
        self._frigate_seen_initialized = True
