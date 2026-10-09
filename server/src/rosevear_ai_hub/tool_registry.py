"""Normalized tool registry for Build 017.

This module describes tools and persists administrative enable/disable state.
It deliberately does not execute tools. Confirmation and execution arrive in
later builds.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import Integration, ToolRecord


class ToolRiskLevel(IntEnum):
    """Canonical tool risk classes from the Source of Truth."""

    READ = 0
    LOW_RISK_ACTION = 1
    CONFIRMATION_REQUIRED = 2
    PROHIBITED_AUTONOMOUS = 3


RISK_LABELS: dict[ToolRiskLevel, str] = {
    ToolRiskLevel.READ: "read",
    ToolRiskLevel.LOW_RISK_ACTION: "low_risk_action",
    ToolRiskLevel.CONFIRMATION_REQUIRED: "confirmation_required",
    ToolRiskLevel.PROHIBITED_AUTONOMOUS: "prohibited_autonomous",
}


@dataclass(frozen=True)
class ToolDefinition:
    """Code-owned metadata for one stable tool contract."""

    tool_key: str
    display_name: str
    description: str
    integration_key: str
    integration_name: str
    capabilities: tuple[str, ...]
    risk_level: ToolRiskLevel
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    default_enabled: bool


def object_schema(
    properties: dict[str, Any],
    *,
    required: tuple[str, ...] = (),
) -> dict[str, Any]:
    """Return the normalized object schema used by Hub tools."""

    return {
        "type": "object",
        "properties": properties,
        "required": list(required),
        "additionalProperties": False,
    }


BUILTIN_TOOL_DEFINITIONS: tuple[ToolDefinition, ...] = (
    ToolDefinition(
        tool_key="automation.rule.change",
        display_name="Change automation rule",
        description=(
            "Create, update, or delete one deterministic automation rule. "
            "Every change requires the Build 018 exact confirmation workflow."
        ),
        integration_key="core.automation",
        integration_name="Automations",
        capabilities=("automation.write",),
        risk_level=ToolRiskLevel.CONFIRMATION_REQUIRED,
        input_schema=object_schema(
            {
                "operation": {"type": "string", "enum": ["create", "update", "delete"]},
                "automation_id": {"type": ["integer", "null"], "minimum": 1},
                "name": {"type": ["string", "null"], "minLength": 1, "maxLength": 160},
                "enabled": {"type": ["boolean", "null"]},
                "definition": {"type": ["object", "null"]},
                "expected_current_hash": {
                    "type": ["string", "null"],
                    "pattern": "^[a-f0-9]{64}$",
                },
            },
            required=(
                "operation",
                "automation_id",
                "name",
                "enabled",
                "definition",
                "expected_current_hash",
            ),
        ),
        output_schema=object_schema(
            {
                "operation": {"type": "string", "enum": ["create", "update", "delete"]},
                "automation_id": {"type": ["integer", "null"]},
                "deleted": {"type": "boolean"},
            },
            required=("operation", "deleted"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="knowledge.search",
        display_name="Search local knowledge",
        description="Search indexed local knowledge and return grounded evidence chunks.",
        integration_key="core.knowledge",
        integration_name="Knowledge",
        capabilities=("knowledge.read", "knowledge.search"),
        risk_level=ToolRiskLevel.READ,
        input_schema=object_schema(
            {
                "query": {"type": "string", "minLength": 1},
                "top_k": {"type": "integer", "minimum": 1, "maximum": 50},
                "mode": {
                    "type": "string",
                    "enum": ["auto", "semantic", "keyword"],
                },
                "collection_ids": {
                    "type": "array",
                    "items": {"type": "integer", "minimum": 1},
                },
                "document_ids": {
                    "type": "array",
                    "items": {"type": "integer", "minimum": 1},
                },
            },
            required=("query",),
        ),
        output_schema=object_schema(
            {
                "query": {"type": "string"},
                "method": {"type": "string", "enum": ["semantic", "keyword"]},
                "fallback_reason": {"type": ["string", "null"]},
                "hits": {"type": "array", "items": {"type": "object"}},
            },
            required=("query", "method", "hits"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="knowledge.answer",
        display_name="Answer from local knowledge",
        description="Generate an answer grounded in local knowledge with citations.",
        integration_key="core.knowledge",
        integration_name="Knowledge",
        capabilities=("ai.generate", "knowledge.answer", "knowledge.read"),
        risk_level=ToolRiskLevel.READ,
        input_schema=object_schema(
            {
                "query": {"type": "string", "minLength": 1},
                "provider": {"type": "string", "minLength": 1},
                "model": {"type": "string", "minLength": 1},
                "top_k": {"type": "integer", "minimum": 1, "maximum": 50},
                "mode": {
                    "type": "string",
                    "enum": ["auto", "semantic", "keyword"],
                },
                "collection_ids": {
                    "type": "array",
                    "items": {"type": "integer", "minimum": 1},
                },
                "document_ids": {
                    "type": "array",
                    "items": {"type": "integer", "minimum": 1},
                },
            },
            required=("query", "provider", "model"),
        ),
        output_schema=object_schema(
            {
                "answer": {"type": "string"},
                "grounding_status": {
                    "type": "string",
                    "enum": ["grounded", "insufficient_evidence", "rejected"],
                },
                "citations": {"type": "array", "items": {"type": "object"}},
            },
            required=("answer", "grounding_status", "citations"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="knowledge.document.delete",
        display_name="Delete knowledge document",
        description=(
            "Delete an ingested source document and its local chunks and embeddings. "
            "Execution requires the Build 018 confirmation workflow."
        ),
        integration_key="core.knowledge",
        integration_name="Knowledge",
        capabilities=("knowledge.delete", "knowledge.write"),
        risk_level=ToolRiskLevel.CONFIRMATION_REQUIRED,
        input_schema=object_schema(
            {"document_id": {"type": "integer", "minimum": 1}},
            required=("document_id",),
        ),
        output_schema=object_schema(
            {
                "deleted": {"type": "boolean"},
                "source_deleted": {"type": "boolean"},
            },
            required=("deleted", "source_deleted"),
        ),
        default_enabled=False,
    ),
    ToolDefinition(
        tool_key="notification.household.send",
        display_name="Send household notification",
        description=(
            "Create one persistent local in-app notification for authenticated household users. "
            "This never sends email, SMS, push, or other external messages."
        ),
        integration_key="core.notifications",
        integration_name="Notifications",
        capabilities=("notification.write", "notification.household"),
        risk_level=ToolRiskLevel.LOW_RISK_ACTION,
        input_schema=object_schema(
            {
                "title": {"type": "string", "minLength": 1, "maxLength": 160},
                "message": {"type": "string", "minLength": 1, "maxLength": 2000},
                "severity": {
                    "type": "string",
                    "enum": ["info", "warning", "urgent"],
                },
            },
            required=("title", "message", "severity"),
        ),
        output_schema=object_schema(
            {
                "accepted": {"type": "boolean"},
                "notification_id": {"type": "integer", "minimum": 1},
                "audience": {"type": "string", "enum": ["household"]},
            },
            required=("accepted", "notification_id", "audience"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="home_assistant.light.set",
        display_name="Set Home Assistant light",
        description=(
            "Turn one explicitly allow-listed, non-safety Home Assistant light on or off."
        ),
        integration_key="home_assistant",
        integration_name="Home Assistant",
        capabilities=("home.read", "home.light.control"),
        risk_level=ToolRiskLevel.LOW_RISK_ACTION,
        input_schema=object_schema(
            {
                "entity_id": {
                    "type": "string",
                    "pattern": "^light\\.[a-z0-9_]+$",
                },
                "state": {"type": "string", "enum": ["on", "off"]},
            },
            required=("entity_id", "state"),
        ),
        output_schema=object_schema(
            {
                "accepted": {"type": "boolean"},
                "entity_id": {"type": "string"},
                "state": {"type": ["string", "null"]},
            },
            required=("accepted", "entity_id"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="home_assistant.switch.set",
        display_name="Set Home Assistant switch",
        description=(
            "Turn one explicitly allow-listed, non-safety Home Assistant switch on or off."
        ),
        integration_key="home_assistant",
        integration_name="Home Assistant",
        capabilities=("home.read", "home.switch.control"),
        risk_level=ToolRiskLevel.LOW_RISK_ACTION,
        input_schema=object_schema(
            {
                "entity_id": {
                    "type": "string",
                    "pattern": "^switch\\.[a-z0-9_]+$",
                },
                "state": {"type": "string", "enum": ["on", "off"]},
            },
            required=("entity_id", "state"),
        ),
        output_schema=object_schema(
            {
                "accepted": {"type": "boolean"},
                "entity_id": {"type": "string"},
                "state": {"type": ["string", "null"]},
            },
            required=("accepted", "entity_id"),
        ),
        default_enabled=True,
    ),
    ToolDefinition(
        tool_key="home_assistant.scene.activate",
        display_name="Activate Home Assistant scene",
        description=(
            "Activate one explicitly allow-listed scene classified by an Owner/Admin as non-safety."
        ),
        integration_key="home_assistant",
        integration_name="Home Assistant",
        capabilities=("home.read", "home.scene.activate"),
        risk_level=ToolRiskLevel.LOW_RISK_ACTION,
        input_schema=object_schema(
            {
                "entity_id": {
                    "type": "string",
                    "pattern": "^scene\\.[a-z0-9_]+$",
                },
            },
            required=("entity_id",),
        ),
        output_schema=object_schema(
            {
                "accepted": {"type": "boolean"},
                "entity_id": {"type": "string"},
            },
            required=("accepted", "entity_id"),
        ),
        default_enabled=True,
    ),
)


def _validate_definition(definition: ToolDefinition) -> None:
    if not definition.tool_key or "." not in definition.tool_key:
        raise ValueError("Tool keys must be stable dotted identifiers.")
    if not definition.capabilities:
        raise ValueError(f"{definition.tool_key} must declare at least one capability.")
    if len(set(definition.capabilities)) != len(definition.capabilities):
        raise ValueError(f"{definition.tool_key} contains duplicate capabilities.")
    for schema_name, schema in (
        ("input", definition.input_schema),
        ("output", definition.output_schema),
    ):
        if schema.get("type") != "object":
            raise ValueError(f"{definition.tool_key} {schema_name} schema must be an object.")
        if not isinstance(schema.get("properties"), dict):
            raise ValueError(f"{definition.tool_key} {schema_name} schema needs properties.")
        if schema.get("additionalProperties") is not False:
            raise ValueError(
                f"{definition.tool_key} {schema_name} schema must reject unknown properties."
            )


for _definition in BUILTIN_TOOL_DEFINITIONS:
    _validate_definition(_definition)


def risk_label(risk_level: int) -> str:
    try:
        return RISK_LABELS[ToolRiskLevel(risk_level)]
    except ValueError:
        return "invalid"


def confirmation_policy(risk_level: int) -> str:
    try:
        risk = ToolRiskLevel(risk_level)
    except ValueError:
        return "invalid"
    if risk is ToolRiskLevel.READ:
        return "none"
    if risk is ToolRiskLevel.LOW_RISK_ACTION:
        return "configurable"
    if risk is ToolRiskLevel.CONFIRMATION_REQUIRED:
        return "required"
    return "prohibited_autonomous"


def sync_builtin_tools(session: Session) -> list[ToolRecord]:
    """Synchronize code-owned contracts while preserving operator enable state."""

    integration_ids: dict[str, int] = {}
    for definition in BUILTIN_TOOL_DEFINITIONS:
        if definition.integration_key in integration_ids:
            continue

        integration = session.scalar(
            select(Integration).where(Integration.integration_key == definition.integration_key)
        )
        if integration is None:
            integration = Integration(
                integration_key=definition.integration_key,
                type="core",
                name=definition.integration_name,
                enabled=True,
            )
            session.add(integration)
            session.flush()
        else:
            integration.type = "core"
            integration.name = definition.integration_name
        integration_ids[definition.integration_key] = integration.id

    records: list[ToolRecord] = []
    for definition in BUILTIN_TOOL_DEFINITIONS:
        record = session.scalar(
            select(ToolRecord).where(ToolRecord.tool_key == definition.tool_key)
        )
        if record is None:
            record = ToolRecord(
                integration_id=integration_ids[definition.integration_key],
                tool_key=definition.tool_key,
                display_name=definition.display_name,
                description=definition.description,
                capabilities_json=list(definition.capabilities),
                risk_level=int(definition.risk_level),
                input_schema_json=definition.input_schema,
                output_schema_json=definition.output_schema,
                enabled=definition.default_enabled,
                built_in=True,
            )
            session.add(record)
        else:
            record.integration_id = integration_ids[definition.integration_key]
            record.display_name = definition.display_name
            record.description = definition.description
            record.capabilities_json = list(definition.capabilities)
            record.risk_level = int(definition.risk_level)
            record.input_schema_json = definition.input_schema
            record.output_schema_json = definition.output_schema
            record.built_in = True
        records.append(record)

    session.flush()
    return records
