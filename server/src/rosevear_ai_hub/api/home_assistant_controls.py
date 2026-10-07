"""Safe Home Assistant device controls for Build 023."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.confirmations import validate_arguments
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.models import AppSetting, ToolRecord, User
from rosevear_ai_hub.tool_registry import ToolRiskLevel, sync_builtin_tools

router = APIRouter(prefix="/api/v1/home-assistant", tags=["home-assistant-controls"])

_ALLOWLIST_SETTING_KEY = "home_assistant.safe_control_allowlist"
_ALLOWED_DOMAINS = {"light", "switch", "scene"}
_TOOL_KEYS = {
    "light": "home_assistant.light.set",
    "switch": "home_assistant.switch.set",
    "scene": "home_assistant.scene.activate",
}
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


class HomeAssistantControlCandidate(BaseModel):
    entity_id: str
    domain: str
    friendly_name: str | None = None
    state: str
    allowed: bool
    blocked_reason: str | None = None


class HomeAssistantControlPolicyResponse(BaseModel):
    allowed_entity_ids: list[str]
    candidates: list[HomeAssistantControlCandidate]


class HomeAssistantControlPolicyUpdate(BaseModel):
    allowed_entity_ids: list[str] = Field(default_factory=list, max_length=250)
    acknowledge_low_risk_only: bool = False


class HomeAssistantControlRequest(BaseModel):
    entity_id: str = Field(min_length=3, max_length=255)
    action: Literal["on", "off", "activate"]


class HomeAssistantControlResponse(BaseModel):
    accepted: bool
    entity_id: str
    domain: str
    action: str
    tool_key: str
    state: str | None = None


HomeAssistantRuntimeDependency = Annotated[
    HomeAssistantRuntime,
    Depends(get_home_assistant_runtime),
]


def _load_allowlist(db: Session) -> list[str]:
    setting = db.scalar(select(AppSetting).where(AppSetting.key == _ALLOWLIST_SETTING_KEY))
    if setting is None or not isinstance(setting.value_json, list):
        return []
    values = [value for value in setting.value_json if isinstance(value, str)]
    return sorted(set(values))


def _store_allowlist(db: Session, entity_ids: list[str]) -> None:
    normalized = sorted(set(entity_ids))
    setting = db.scalar(select(AppSetting).where(AppSetting.key == _ALLOWLIST_SETTING_KEY))
    if setting is None:
        db.add(AppSetting(key=_ALLOWLIST_SETTING_KEY, value_json=normalized))
    else:
        setting.value_json = normalized


def _domain(entity_id: str) -> str:
    return entity_id.split(".", 1)[0] if "." in entity_id else ""


def _friendly_name(item: dict[str, Any]) -> str | None:
    attributes = item.get("attributes")
    if not isinstance(attributes, dict):
        return None
    value = attributes.get("friendly_name")
    return value if isinstance(value, str) and value else None


def _blocked_reason(entity_id: str, friendly_name: str | None) -> str | None:
    domain = _domain(entity_id)
    if domain not in _ALLOWED_DOMAINS:
        return "Only light, switch, and scene entities are eligible for Build 023 controls."
    searchable = " ".join((entity_id, friendly_name or "")).lower().replace("-", " ")
    if any(marker in searchable for marker in _HAZARD_MARKERS):
        return "This target looks safety-sensitive or hazardous and cannot be delegated."
    return None


def _candidate(
    item: dict[str, Any],
    allowed: set[str],
) -> HomeAssistantControlCandidate | None:
    entity_id = item.get("entity_id")
    state_value = item.get("state")
    if not isinstance(entity_id, str) or not isinstance(state_value, str):
        return None
    if _domain(entity_id) not in _ALLOWED_DOMAINS:
        return None
    friendly_name = _friendly_name(item)
    return HomeAssistantControlCandidate(
        entity_id=entity_id,
        domain=_domain(entity_id),
        friendly_name=friendly_name,
        state=state_value,
        allowed=entity_id in allowed,
        blocked_reason=_blocked_reason(entity_id, friendly_name),
    )


async def _states_or_503(runtime: HomeAssistantRuntime) -> list[dict[str, Any]]:
    if runtime.client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Home Assistant is not configured for device controls.",
        )
    try:
        return await runtime.client.states()
    except HomeAssistantError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


def _tool_for_domain(db: Session, domain: str) -> ToolRecord:
    sync_builtin_tools(db)
    tool_key = _TOOL_KEYS[domain]
    tool = db.scalar(select(ToolRecord).where(ToolRecord.tool_key == tool_key))
    if tool is None:
        raise HTTPException(status_code=500, detail="Safe-control tool is not registered.")
    if tool.risk_level != int(ToolRiskLevel.LOW_RISK_ACTION):
        raise HTTPException(status_code=500, detail="Safe-control tool risk policy is invalid.")
    if not tool.enabled:
        raise HTTPException(status_code=409, detail="This safe-control tool is disabled.")
    return tool


def _deny_control(
    db: Session,
    actor: User,
    *,
    entity_id: str,
    action: str,
    detail: str,
    status_code: int,
    tool_key: str | None = None,
) -> None:
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="tool.execution.denied",
        object_type="home_assistant_entity",
        object_id=entity_id or None,
        action=action,
        arguments={"entity_id": entity_id, "action": action},
        result={"ok": False, "error": detail},
        tool_key=tool_key,
        risk_level=int(ToolRiskLevel.LOW_RISK_ACTION),
    )
    db.commit()
    raise HTTPException(status_code=status_code, detail=detail)


@router.get("/control-policy", response_model=HomeAssistantControlPolicyResponse)
async def get_control_policy(
    runtime: HomeAssistantRuntimeDependency,
    db: Annotated[Session, Depends(get_session)],
) -> HomeAssistantControlPolicyResponse:
    states = await _states_or_503(runtime)
    allowed = set(_load_allowlist(db))
    candidates = [
        candidate for item in states if (candidate := _candidate(item, allowed)) is not None
    ]
    candidates.sort(key=lambda item: (item.domain, item.friendly_name or item.entity_id))
    return HomeAssistantControlPolicyResponse(
        allowed_entity_ids=sorted(allowed),
        candidates=candidates,
    )


@router.put("/control-policy", response_model=HomeAssistantControlPolicyResponse)
async def update_control_policy(
    payload: HomeAssistantControlPolicyUpdate,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    runtime: HomeAssistantRuntimeDependency,
    db: Annotated[Session, Depends(get_session)],
) -> HomeAssistantControlPolicyResponse:
    if payload.allowed_entity_ids and not payload.acknowledge_low_risk_only:
        raise HTTPException(
            status_code=422,
            detail="Confirm that every selected entity is a low-risk household control.",
        )

    states = await _states_or_503(runtime)
    state_by_id = {
        item["entity_id"]: item for item in states if isinstance(item.get("entity_id"), str)
    }
    requested = sorted(set(payload.allowed_entity_ids))
    for entity_id in requested:
        item = state_by_id.get(entity_id)
        if item is None:
            raise HTTPException(status_code=422, detail=f"Unknown entity: {entity_id}")
        reason = _blocked_reason(entity_id, _friendly_name(item))
        if reason:
            raise HTTPException(status_code=422, detail=f"{entity_id}: {reason}")

    _store_allowlist(db, requested)
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="home_assistant.control_policy.updated",
        object_type="home_assistant_control_policy",
        object_id=_ALLOWLIST_SETTING_KEY,
        action="update_allowlist",
        arguments={"allowed_entity_ids": requested},
        result={"ok": True, "allowed_count": len(requested)},
        risk_level=int(ToolRiskLevel.PROHIBITED_AUTONOMOUS),
    )
    db.commit()

    allowed = set(requested)
    candidates = [
        candidate for item in states if (candidate := _candidate(item, allowed)) is not None
    ]
    candidates.sort(key=lambda item: (item.domain, item.friendly_name or item.entity_id))
    return HomeAssistantControlPolicyResponse(
        allowed_entity_ids=requested,
        candidates=candidates,
    )


@router.post("/control", response_model=HomeAssistantControlResponse)
async def control_entity(
    payload: HomeAssistantControlRequest,
    actor: Annotated[
        User,
        Depends(require_roles("owner", "administrator", "household_user")),
    ],
    runtime: HomeAssistantRuntimeDependency,
    db: Annotated[Session, Depends(get_session)],
) -> HomeAssistantControlResponse:
    entity_id = payload.entity_id.strip()
    domain = _domain(entity_id)
    tool_key = _TOOL_KEYS.get(domain)

    if domain not in _ALLOWED_DOMAINS:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail="Unsupported Home Assistant control domain.",
            status_code=422,
        )

    allowed = set(_load_allowlist(db))
    if entity_id not in allowed:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail="Entity is not on the safe-control allow list.",
            status_code=403,
            tool_key=tool_key,
        )

    try:
        states = await _states_or_503(runtime)
    except HTTPException as exc:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail=str(exc.detail),
            status_code=exc.status_code,
            tool_key=tool_key,
        )

    target = next((item for item in states if item.get("entity_id") == entity_id), None)
    if target is None:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail="Home Assistant entity was not found.",
            status_code=404,
            tool_key=tool_key,
        )

    reason = _blocked_reason(entity_id, _friendly_name(target))
    if reason:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail=reason,
            status_code=409,
            tool_key=tool_key,
        )

    if domain == "scene":
        if payload.action != "activate":
            _deny_control(
                db,
                actor,
                entity_id=entity_id,
                action=payload.action,
                detail="Scenes only support activate.",
                status_code=422,
                tool_key=tool_key,
            )
    elif payload.action not in {"on", "off"}:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail="Lights and switches support on or off.",
            status_code=422,
            tool_key=tool_key,
        )

    try:
        tool = _tool_for_domain(db, domain)
    except HTTPException as exc:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail=str(exc.detail),
            status_code=exc.status_code,
            tool_key=tool_key,
        )

    arguments = (
        {"entity_id": entity_id}
        if domain == "scene"
        else {"entity_id": entity_id, "state": payload.action}
    )
    normalized_arguments, _ = validate_arguments(tool, arguments)

    if runtime.client is None:
        _deny_control(
            db,
            actor,
            entity_id=entity_id,
            action=payload.action,
            detail="Home Assistant is not configured.",
            status_code=503,
            tool_key=tool.tool_key,
        )

    try:
        if domain == "light":
            changed = await runtime.client.set_light(
                entity_id,
                enabled=payload.action == "on",
            )
        elif domain == "switch":
            changed = await runtime.client.set_switch(
                entity_id,
                enabled=payload.action == "on",
            )
        else:
            changed = await runtime.client.activate_scene(entity_id)
    except HomeAssistantError as exc:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="tool.execution.failed",
            object_type="home_assistant_entity",
            object_id=entity_id,
            action=payload.action,
            arguments=normalized_arguments,
            result={"ok": False, "error": str(exc)},
            tool_key=tool.tool_key,
            risk_level=tool.risk_level,
        )
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    new_state = None
    for item in changed:
        if item.get("entity_id") == entity_id and isinstance(item.get("state"), str):
            new_state = item["state"]
            break

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="tool.execution.completed",
        object_type="home_assistant_entity",
        object_id=entity_id,
        action=payload.action,
        arguments=normalized_arguments,
        result={"ok": True, "accepted": True, "state": new_state},
        tool_key=tool.tool_key,
        risk_level=tool.risk_level,
    )
    db.commit()

    return HomeAssistantControlResponse(
        accepted=True,
        entity_id=entity_id,
        domain=domain,
        action=payload.action,
        tool_key=tool.tool_key,
        state=new_state,
    )
