"""Live Build 027 event-source runtime for Home Assistant and MQTT."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.api.home_assistant import get_home_assistant_runtime
from rosevear_ai_hub.api.mqtt import get_mqtt_runtime
from rosevear_ai_hub.automations import MQTTMessageTrigger, normalize_rule_definition
from rosevear_ai_hub.database import SessionLocal
from rosevear_ai_hub.event_engine import AutomationEventEngine, MQTTEvent, StateEvent
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.integrations.mqtt import MQTTError, MQTTMessageRecord
from rosevear_ai_hub.models import Automation

logger = logging.getLogger(__name__)

_QUEUE_CAPACITY = 256
_RECONCILE_SECONDS = 5.0


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

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stopping.clear()
        self._loop = asyncio.get_running_loop()

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
            "last_error": self._last_error,
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
                else:
                    await self._engine.process_mqtt_event(event)
                self._processed_events += 1
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self._failed_events += 1
                self._last_error = f"Event Engine processing failed: {exc}"
                logger.exception("Event Engine processing failed")
            finally:
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
            rows = db.scalars(
                select(Automation).where(Automation.enabled.is_(True))
            ).all()
            for row in rows:
                try:
                    rule = normalize_rule_definition(dict(row.definition_json or {}))
                except ValueError:
                    continue
                trigger = rule.trigger
                if isinstance(trigger, MQTTMessageTrigger):
                    desired[trigger.topic_filter] = max(desired.get(trigger.topic_filter, 0), trigger.qos)

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
