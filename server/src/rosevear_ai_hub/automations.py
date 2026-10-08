"""Versioned deterministic automation rule schema for Build 026."""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.integrations.mqtt import MQTTConfigurationError, validate_topic_filter
from rosevear_ai_hub.models import Automation, ToolRecord
from rosevear_ai_hub.tool_registry import ToolRiskLevel, sync_builtin_tools

RULE_SCHEMA_VERSION = 1
MAX_CONDITIONS = 20
MAX_ACTIONS = 20
MAX_COOLDOWN_SECONDS = 86400


class StrictRuleModel(BaseModel):
    """Reject unrecognized rule fields so saved definitions stay deterministic."""

    model_config = ConfigDict(extra="forbid")


class StateChangeTrigger(StrictRuleModel):
    type: Literal["state_change"]
    entity_id: str = Field(min_length=3, max_length=255, pattern=r"^[a-z0-9_]+\.[a-z0-9_]+$")
    from_state: str | None = Field(default=None, max_length=255)
    to_state: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def require_state_edge(self) -> "StateChangeTrigger":
        if self.from_state is None and self.to_state is None:
            raise ValueError("state_change requires from_state or to_state.")
        return self


class StateThresholdTrigger(StrictRuleModel):
    type: Literal["state_threshold"]
    entity_id: str = Field(min_length=3, max_length=255, pattern=r"^[a-z0-9_]+\.[a-z0-9_]+$")
    above: float | None = None
    below: float | None = None

    @model_validator(mode="after")
    def require_threshold(self) -> "StateThresholdTrigger":
        if self.above is None and self.below is None:
            raise ValueError("state_threshold requires above or below.")
        if self.above is not None and self.below is not None and self.above >= self.below:
            raise ValueError("state_threshold above must be less than below when both are set.")
        return self


class MQTTMessageTrigger(StrictRuleModel):
    type: Literal["mqtt_message"]
    topic_filter: str = Field(min_length=1, max_length=512)
    qos: Literal[0, 1] = 0
    payload_equals: str | None = Field(default=None, max_length=4096)

    @field_validator("topic_filter")
    @classmethod
    def validate_filter(cls, value: str) -> str:
        try:
            return validate_topic_filter(value)
        except MQTTConfigurationError as exc:
            raise ValueError(str(exc)) from exc


RuleTrigger = Annotated[
    StateChangeTrigger | StateThresholdTrigger | MQTTMessageTrigger,
    Field(discriminator="type"),
]


class StateEqualsCondition(StrictRuleModel):
    type: Literal["state_equals"]
    entity_id: str = Field(min_length=3, max_length=255, pattern=r"^[a-z0-9_]+\.[a-z0-9_]+$")
    state: str = Field(min_length=1, max_length=255)


class NumericThresholdCondition(StrictRuleModel):
    type: Literal["numeric_threshold"]
    entity_id: str = Field(min_length=3, max_length=255, pattern=r"^[a-z0-9_]+\.[a-z0-9_]+$")
    above: float | None = None
    below: float | None = None

    @model_validator(mode="after")
    def require_threshold(self) -> "NumericThresholdCondition":
        if self.above is None and self.below is None:
            raise ValueError("numeric_threshold requires above or below.")
        if self.above is not None and self.below is not None and self.above >= self.below:
            raise ValueError("numeric_threshold above must be less than below when both are set.")
        return self


RuleCondition = Annotated[
    StateEqualsCondition | NumericThresholdCondition,
    Field(discriminator="type"),
]


class ToolAction(StrictRuleModel):
    type: Literal["tool"]
    tool_key: str = Field(
        min_length=3,
        max_length=160,
        pattern=r"^[a-z0-9_]+(?:\.[a-z0-9_-]+)+$",
    )
    arguments: dict[str, Any] = Field(default_factory=dict)


class RuleDefinition(StrictRuleModel):
    """Build 026 schema. Build 027 will execute validated instances deterministically."""

    schema_version: Literal[1] = RULE_SCHEMA_VERSION
    trigger: RuleTrigger
    conditions: list[RuleCondition] = Field(default_factory=list, max_length=MAX_CONDITIONS)
    actions: list[ToolAction] = Field(min_length=1, max_length=MAX_ACTIONS)
    cooldown_seconds: int = Field(default=0, ge=0, le=MAX_COOLDOWN_SECONDS)
    deduplication_key: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        pattern=r"^[A-Za-z0-9_.:-]+$",
    )


def normalize_rule_definition(value: RuleDefinition | dict[str, Any]) -> RuleDefinition:
    if isinstance(value, RuleDefinition):
        return value
    return RuleDefinition.model_validate(value)


def canonical_rule_dict(value: RuleDefinition | dict[str, Any]) -> dict[str, Any]:
    rule = normalize_rule_definition(value)
    return rule.model_dump(mode="json")


def validate_rule_tool_references(
    session: Session,
    rule: RuleDefinition,
    *,
    enabled: bool,
) -> list[str]:
    """Validate tool references without executing anything."""

    sync_builtin_tools(session)
    keys = sorted({action.tool_key for action in rule.actions})
    rows = session.scalars(select(ToolRecord).where(ToolRecord.tool_key.in_(keys))).all()
    by_key = {row.tool_key: row for row in rows}

    for key in keys:
        tool = by_key.get(key)
        if tool is None:
            raise ValueError(f"Automation action references unknown tool: {key}.")
        if tool.risk_level >= int(ToolRiskLevel.CONFIRMATION_REQUIRED):
            raise ValueError(
                f"Automation action {key} is Level {tool.risk_level} and cannot run autonomously."
            )
        if enabled and not tool.enabled:
            raise ValueError(f"Enabled automation cannot reference disabled tool: {key}.")
    return keys


def automation_record_hash(record: Automation) -> str:
    """Fingerprint the current row so confirmations cannot be replayed across edits."""

    payload = {
        "id": record.id,
        "name": record.name,
        "enabled": record.enabled,
        "definition": record.definition_json,
    }
    text = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
