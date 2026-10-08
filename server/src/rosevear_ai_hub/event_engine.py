"""Deterministic Build 027 automation Event Engine."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from paho.mqtt.client import topic_matches_sub
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.automations import (
    AUTOMATION_EXECUTABLE_TOOL_KEYS,
    MQTTMessageTrigger,
    NumericThresholdCondition,
    RuleDefinition,
    StateChangeTrigger,
    StateEqualsCondition,
    StateThresholdTrigger,
    ToolAction,
    normalize_rule_definition,
)
from rosevear_ai_hub.confirmations import validate_arguments
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantClient, HomeAssistantError
from rosevear_ai_hub.models import AppSetting, Automation, AutomationRun, ToolRecord
from rosevear_ai_hub.tool_registry import ToolRiskLevel, sync_builtin_tools

_ALLOWLIST_SETTING_KEY = "home_assistant.safe_control_allowlist"
_HAZARD_MARKERS = (
    "alarm",
    "security",
    "smoke",
    "carbon monoxide",
    "carbon_monoxide",
    "co detector",
    "door lock",
    "garage door",
    "forge",
    "kiln",
    "laser",
    "cnc",
    "furnace",
    "boiler",
    "heater",
    "heating",
)
_TOOL_DOMAINS = {
    "home_assistant.light.set": "light",
    "home_assistant.switch.set": "switch",
    "home_assistant.scene.activate": "scene",
}


class AutomationExecutionError(RuntimeError):
    """A deterministic rule action could not be executed safely."""


@dataclass(frozen=True)
class StateEvent:
    entity_id: str
    old_state: str | None
    new_state: str | None
    occurred_at: str
    source_event_id: str | None = None


@dataclass(frozen=True)
class MQTTEvent:
    topic: str
    payload: str
    qos: int
    retain: bool
    received_at: str


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _number(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _threshold_match(value: float, *, above: float | None, below: float | None) -> bool:
    if above is not None and value <= above:
        return False
    if below is not None and value >= below:
        return False
    return True


def _threshold_crossed(
    old_state: str | None,
    new_state: str | None,
    *,
    above: float | None,
    below: float | None,
) -> bool:
    old_value = _number(old_state)
    new_value = _number(new_state)
    if old_value is None or new_value is None:
        return False
    crossed_above = above is not None and old_value <= above < new_value
    crossed_below = below is not None and old_value >= below > new_value
    return crossed_above or crossed_below


def _friendly_name(item: dict[str, Any]) -> str | None:
    attributes = item.get("attributes")
    if not isinstance(attributes, dict):
        return None
    value = attributes.get("friendly_name")
    return value if isinstance(value, str) and value else None


def _blocked_reason(entity_id: str, friendly_name: str | None) -> str | None:
    searchable = " ".join((entity_id, friendly_name or "")).lower().replace("-", " ")
    if any(marker in searchable for marker in _HAZARD_MARKERS):
        return "Automation target looks safety-sensitive or hazardous."
    return None


def _event_fingerprint(event: StateEvent | MQTTEvent) -> tuple[str, dict[str, Any]]:
    if isinstance(event, StateEvent):
        summary = {
            "source": "home_assistant",
            "entity_id": event.entity_id,
            "old_state": event.old_state,
            "new_state": event.new_state,
            "occurred_at": event.occurred_at,
            "source_event_id": event.source_event_id,
        }
    else:
        payload_hash = hashlib.sha256(event.payload.encode("utf-8")).hexdigest()
        summary = {
            "source": "mqtt",
            "topic": event.topic,
            "qos": event.qos,
            "retain": event.retain,
            "payload_sha256": payload_hash,
            "received_at": event.received_at,
        }
    canonical = json.dumps(
        summary,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest(), summary


class AutomationEventEngine:
    """Evaluate enabled rules and execute only bounded deterministic tool actions."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        home_assistant_client: HomeAssistantClient | None,
    ) -> None:
        self._session_factory = session_factory
        self._home_assistant_client = home_assistant_client

    async def process_state_event(self, event: StateEvent) -> int:
        return await self._process_event(event)

    async def process_mqtt_event(self, event: MQTTEvent) -> int:
        return await self._process_event(event)

    async def _process_event(self, event: StateEvent | MQTTEvent) -> int:
        event_hash, event_summary = _event_fingerprint(event)
        with self._session_factory() as db:
            automations = db.scalars(
                select(Automation).where(Automation.enabled.is_(True)).order_by(Automation.id.asc())
            ).all()
            matched: list[tuple[Automation, RuleDefinition]] = []
            for automation in automations:
                try:
                    rule = normalize_rule_definition(dict(automation.definition_json or {}))
                except ValueError:
                    continue
                if self._trigger_matches(rule, event):
                    matched.append((automation, rule))

            if not matched:
                return 0

            states = await self._state_snapshot(event)
            executed = 0
            for automation, rule in matched:
                if not self._conditions_match(rule, states):
                    continue

                deduplication_token = None
                if rule.deduplication_key:
                    material = f"{rule.deduplication_key}:{event_hash}"
                    deduplication_token = hashlib.sha256(material.encode("utf-8")).hexdigest()
                    if self._duplicate_seen(db, automation.id, deduplication_token):
                        self._record_skipped(
                            db,
                            automation,
                            event_summary,
                            "duplicate_event",
                            deduplication_token,
                        )
                        continue

                if self._cooldown_active(db, automation.id, rule.cooldown_seconds):
                    self._record_skipped(
                        db,
                        automation,
                        event_summary,
                        "cooldown_active",
                        deduplication_token,
                    )
                    continue

                await self._execute_rule(
                    db,
                    automation,
                    rule,
                    states,
                    event_summary,
                    deduplication_token,
                )
                executed += 1
            return executed

    def _trigger_matches(self, rule: RuleDefinition, event: StateEvent | MQTTEvent) -> bool:
        trigger = rule.trigger
        if isinstance(trigger, StateChangeTrigger):
            if not isinstance(event, StateEvent) or event.entity_id != trigger.entity_id:
                return False
            if trigger.from_state is not None and event.old_state != trigger.from_state:
                return False
            if trigger.to_state is not None and event.new_state != trigger.to_state:
                return False
            return True

        if isinstance(trigger, StateThresholdTrigger):
            return (
                isinstance(event, StateEvent)
                and event.entity_id == trigger.entity_id
                and _threshold_crossed(
                    event.old_state,
                    event.new_state,
                    above=trigger.above,
                    below=trigger.below,
                )
            )

        if isinstance(trigger, MQTTMessageTrigger):
            return (
                isinstance(event, MQTTEvent)
                and topic_matches_sub(trigger.topic_filter, event.topic)
                and (trigger.payload_equals is None or trigger.payload_equals == event.payload)
            )
        return False

    async def _state_snapshot(self, event: StateEvent | MQTTEvent) -> dict[str, dict[str, Any]]:
        states: dict[str, dict[str, Any]] = {}
        if self._home_assistant_client is not None:
            try:
                current = await self._home_assistant_client.states()
            except HomeAssistantError:
                current = []
            states = {
                item["entity_id"]: item
                for item in current
                if isinstance(item.get("entity_id"), str) and isinstance(item.get("state"), str)
            }

        if isinstance(event, StateEvent) and event.new_state is not None:
            existing = states.get(event.entity_id, {"entity_id": event.entity_id, "attributes": {}})
            states[event.entity_id] = {**existing, "state": event.new_state}
        return states

    def _conditions_match(
        self,
        rule: RuleDefinition,
        states: dict[str, dict[str, Any]],
    ) -> bool:
        for condition in rule.conditions:
            item = states.get(condition.entity_id)
            state = item.get("state") if isinstance(item, dict) else None
            if not isinstance(state, str):
                return False
            if isinstance(condition, StateEqualsCondition):
                if state != condition.state:
                    return False
            elif isinstance(condition, NumericThresholdCondition):
                value = _number(state)
                if value is None or not _threshold_match(
                    value,
                    above=condition.above,
                    below=condition.below,
                ):
                    return False
        return True

    def _duplicate_seen(self, db: Session, automation_id: int, token: str) -> bool:
        recent = db.scalars(
            select(AutomationRun)
            .where(AutomationRun.automation_id == automation_id)
            .order_by(AutomationRun.id.desc())
            .limit(100)
        ).all()
        for run in recent:
            summary = run.result_summary if isinstance(run.result_summary, dict) else {}
            if summary.get("deduplication_token") == token:
                return True
        return False

    def _cooldown_active(self, db: Session, automation_id: int, seconds: int) -> bool:
        if seconds <= 0:
            return False
        latest = db.scalar(
            select(AutomationRun)
            .where(
                AutomationRun.automation_id == automation_id,
                AutomationRun.status.in_(["success", "failed"]),
            )
            .order_by(AutomationRun.started_at.desc(), AutomationRun.id.desc())
            .limit(1)
        )
        if latest is None:
            return False
        return _as_utc(latest.started_at) > _utc_now() - timedelta(seconds=seconds)

    def _record_skipped(
        self,
        db: Session,
        automation: Automation,
        event_summary: dict[str, Any],
        reason: str,
        deduplication_token: str | None,
    ) -> None:
        now = _utc_now()
        summary = {
            "reason": reason,
            "event": event_summary,
            "deduplication_token": deduplication_token,
            "actions_completed": 0,
        }
        run = AutomationRun(
            automation_id=automation.id,
            started_at=now,
            completed_at=now,
            status="skipped",
            result_summary=summary,
        )
        db.add(run)
        db.flush()
        record_audit_event(
            db,
            actor_user_id=None,
            event_type="automation.run.skipped",
            object_type="automation",
            object_id=str(automation.id),
            action="execute",
            arguments={"name": automation.name, "reason": reason},
            result={"ok": True, "run_id": run.id, "status": "skipped"},
        )
        db.commit()

    async def _execute_rule(
        self,
        db: Session,
        automation: Automation,
        rule: RuleDefinition,
        states: dict[str, dict[str, Any]],
        event_summary: dict[str, Any],
        deduplication_token: str | None,
    ) -> None:
        run = AutomationRun(
            automation_id=automation.id,
            status="running",
            result_summary={
                "event": event_summary,
                "deduplication_token": deduplication_token,
                "actions_completed": 0,
            },
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        completed = 0
        try:
            for action in rule.actions:
                await self._execute_action(db, action, states)
                completed += 1
        except AutomationExecutionError as exc:
            run.status = "failed"
            run.completed_at = _utc_now()
            run.result_summary = {
                "event": event_summary,
                "deduplication_token": deduplication_token,
                "actions_completed": completed,
                "error": str(exc)[:500],
            }
            record_audit_event(
                db,
                actor_user_id=None,
                event_type="automation.run.failed",
                object_type="automation",
                object_id=str(automation.id),
                action="execute",
                arguments={"name": automation.name},
                result={"ok": False, "run_id": run.id, "error": str(exc)[:500]},
            )
            db.commit()
            return

        run.status = "success"
        run.completed_at = _utc_now()
        run.result_summary = {
            "event": event_summary,
            "deduplication_token": deduplication_token,
            "actions_completed": completed,
        }
        record_audit_event(
            db,
            actor_user_id=None,
            event_type="automation.run.completed",
            object_type="automation",
            object_id=str(automation.id),
            action="execute",
            arguments={"name": automation.name},
            result={"ok": True, "run_id": run.id, "actions_completed": completed},
        )
        db.commit()

    async def _execute_action(
        self,
        db: Session,
        action: ToolAction,
        states: dict[str, dict[str, Any]],
    ) -> None:
        if action.tool_key not in AUTOMATION_EXECUTABLE_TOOL_KEYS:
            raise AutomationExecutionError(
                f"Tool {action.tool_key} has no deterministic Event Engine executor."
            )

        sync_builtin_tools(db)
        tool = db.scalar(select(ToolRecord).where(ToolRecord.tool_key == action.tool_key))
        if tool is None:
            raise AutomationExecutionError(f"Tool is not registered: {action.tool_key}.")
        if not tool.enabled:
            raise AutomationExecutionError(f"Tool is disabled: {action.tool_key}.")
        if tool.risk_level != int(ToolRiskLevel.LOW_RISK_ACTION):
            raise AutomationExecutionError(
                f"Automation executor requires a Level 1 tool: {action.tool_key}."
            )

        try:
            arguments, _ = validate_arguments(tool, dict(action.arguments))
        except HTTPException as exc:
            raise AutomationExecutionError(str(exc.detail)) from exc

        entity_id = arguments.get("entity_id")
        if not isinstance(entity_id, str):
            raise AutomationExecutionError("Home Assistant automation action requires entity_id.")

        domain = _TOOL_DOMAINS[action.tool_key]
        if not entity_id.startswith(domain + "."):
            raise AutomationExecutionError("Home Assistant automation action domain mismatch.")

        setting = db.scalar(select(AppSetting).where(AppSetting.key == _ALLOWLIST_SETTING_KEY))
        allowed = (
            {item for item in setting.value_json if isinstance(item, str)}
            if setting is not None and isinstance(setting.value_json, list)
            else set()
        )
        if entity_id not in allowed:
            self._record_tool_denial(db, tool, entity_id, arguments, "Entity is not allow-listed.")
            raise AutomationExecutionError("Entity is not on the safe-control allow list.")

        target = states.get(entity_id)
        if target is None:
            self._record_tool_denial(db, tool, entity_id, arguments, "Entity state is unavailable.")
            raise AutomationExecutionError("Home Assistant entity state is unavailable.")

        reason = _blocked_reason(entity_id, _friendly_name(target))
        if reason:
            self._record_tool_denial(db, tool, entity_id, arguments, reason)
            raise AutomationExecutionError(reason)

        if self._home_assistant_client is None:
            self._record_tool_denial(
                db,
                tool,
                entity_id,
                arguments,
                "Home Assistant is not configured.",
            )
            raise AutomationExecutionError("Home Assistant is not configured.")

        try:
            if action.tool_key == "home_assistant.light.set":
                changed = await self._home_assistant_client.set_light(
                    entity_id,
                    enabled=arguments["state"] == "on",
                )
            elif action.tool_key == "home_assistant.switch.set":
                changed = await self._home_assistant_client.set_switch(
                    entity_id,
                    enabled=arguments["state"] == "on",
                )
            else:
                changed = await self._home_assistant_client.activate_scene(entity_id)
        except HomeAssistantError as exc:
            record_audit_event(
                db,
                actor_user_id=None,
                event_type="tool.execution.failed",
                object_type="home_assistant_entity",
                object_id=entity_id,
                action="automation",
                arguments=arguments,
                result={"ok": False, "error": str(exc)},
                tool_key=tool.tool_key,
                risk_level=tool.risk_level,
            )
            db.flush()
            raise AutomationExecutionError(str(exc)) from exc

        new_state = None
        for item in changed:
            if item.get("entity_id") == entity_id and isinstance(item.get("state"), str):
                new_state = item["state"]
                states[entity_id] = item
                break

        record_audit_event(
            db,
            actor_user_id=None,
            event_type="tool.execution.completed",
            object_type="home_assistant_entity",
            object_id=entity_id,
            action="automation",
            arguments=arguments,
            result={"ok": True, "accepted": True, "state": new_state},
            tool_key=tool.tool_key,
            risk_level=tool.risk_level,
        )
        db.flush()

    def _record_tool_denial(
        self,
        db: Session,
        tool: ToolRecord,
        entity_id: str,
        arguments: dict[str, Any],
        detail: str,
    ) -> None:
        record_audit_event(
            db,
            actor_user_id=None,
            event_type="tool.execution.denied",
            object_type="home_assistant_entity",
            object_id=entity_id,
            action="automation",
            arguments=arguments,
            result={"ok": False, "error": detail},
            tool_key=tool.tool_key,
            risk_level=tool.risk_level,
        )
        db.flush()
