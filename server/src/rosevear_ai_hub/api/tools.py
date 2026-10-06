"""Tool registry administration API for Build 017."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import Integration, ToolRecord, User
from rosevear_ai_hub.tool_registry import (
    ToolRiskLevel,
    confirmation_policy,
    risk_label,
    sync_builtin_tools,
)

router = APIRouter(prefix="/api/v1/tools", tags=["tools"])


class ToolResponse(BaseModel):
    id: int
    tool_key: str
    display_name: str
    description: str
    integration_key: str | None
    integration_name: str | None
    capabilities: list[str]
    risk_level: int
    risk_label: str
    confirmation_policy: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    enabled: bool
    built_in: bool
    created_at: datetime
    updated_at: datetime


class ToolUpdateRequest(BaseModel):
    enabled: bool


class ToolRegistrySummary(BaseModel):
    tool_count: int
    enabled_count: int
    disabled_count: int
    counts_by_risk: dict[str, int]
    capabilities: list[str]


def _response(
    tool: ToolRecord,
    integration: Integration | None,
) -> ToolResponse:
    return ToolResponse(
        id=tool.id,
        tool_key=tool.tool_key,
        display_name=tool.display_name,
        description=tool.description,
        integration_key=integration.integration_key if integration else None,
        integration_name=integration.name if integration else None,
        capabilities=list(tool.capabilities_json or []),
        risk_level=tool.risk_level,
        risk_label=risk_label(tool.risk_level),
        confirmation_policy=confirmation_policy(tool.risk_level),
        input_schema=dict(tool.input_schema_json or {}),
        output_schema=dict(tool.output_schema_json or {}),
        enabled=tool.enabled,
        built_in=tool.built_in,
        created_at=tool.created_at,
        updated_at=tool.updated_at,
    )


def _load_rows(db: Session) -> list[tuple[ToolRecord, Integration | None]]:
    sync_builtin_tools(db)
    db.commit()
    return list(
        db.execute(
            select(ToolRecord, Integration)
            .outerjoin(Integration, ToolRecord.integration_id == Integration.id)
            .order_by(ToolRecord.risk_level.asc(), ToolRecord.tool_key.asc())
        ).all()
    )


@router.get("", response_model=list[ToolResponse])
def list_tools(
    db: Annotated[Session, Depends(get_session)],
) -> list[ToolResponse]:
    return [_response(tool, integration) for tool, integration in _load_rows(db)]


@router.get("/summary", response_model=ToolRegistrySummary)
def registry_summary(
    db: Annotated[Session, Depends(get_session)],
) -> ToolRegistrySummary:
    rows = _load_rows(db)
    counts_by_risk = {
        "read": 0,
        "low_risk_action": 0,
        "confirmation_required": 0,
        "prohibited_autonomous": 0,
    }
    capabilities: set[str] = set()
    enabled_count = 0

    for tool, _ in rows:
        label = risk_label(tool.risk_level)
        counts_by_risk[label] = counts_by_risk.get(label, 0) + 1
        capabilities.update(tool.capabilities_json or [])
        if tool.enabled:
            enabled_count += 1

    return ToolRegistrySummary(
        tool_count=len(rows),
        enabled_count=enabled_count,
        disabled_count=len(rows) - enabled_count,
        counts_by_risk=counts_by_risk,
        capabilities=sorted(capabilities),
    )


@router.get("/{tool_key}", response_model=ToolResponse)
def get_tool(
    tool_key: str,
    db: Annotated[Session, Depends(get_session)],
) -> ToolResponse:
    sync_builtin_tools(db)
    db.commit()
    row = db.execute(
        select(ToolRecord, Integration)
        .outerjoin(Integration, ToolRecord.integration_id == Integration.id)
        .where(ToolRecord.tool_key == tool_key)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Tool not found.")
    return _response(row[0], row[1])


@router.patch("/{tool_key}", response_model=ToolResponse)
def update_tool(
    tool_key: str,
    payload: ToolUpdateRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> ToolResponse:
    sync_builtin_tools(db)
    tool = db.scalar(select(ToolRecord).where(ToolRecord.tool_key == tool_key))
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found.")

    if payload.enabled and tool.risk_level == int(ToolRiskLevel.PROHIBITED_AUTONOMOUS):
        raise HTTPException(
            status_code=409,
            detail="Level 3 tools cannot be enabled for autonomous execution.",
        )

    changed = tool.enabled != payload.enabled
    tool.enabled = payload.enabled
    if changed:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="tool.registry.updated",
            object_type="tool",
            object_id=tool.tool_key,
            action="enable" if tool.enabled else "disable",
            arguments={"enabled": tool.enabled},
            result={"ok": True},
            tool_key=tool.tool_key,
            risk_level=tool.risk_level,
        )
    db.commit()
    db.refresh(tool)
    integration = db.get(Integration, tool.integration_id) if tool.integration_id else None
    return _response(tool, integration)
