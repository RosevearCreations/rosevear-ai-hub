"""Build 144: short-lived, operator-confirmed safe action drafts.

The scene planner is intentionally NOT registered as a chat tool. It does not
activate opaque native HA scenes whose underlying targets cannot be inspected.
"""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from threading import Lock
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime, get_home_assistant_runtime
from rosevear_ai_hub.api.home_assistant_controls import (
    HomeAssistantControlRequest,
    _blocked_reason,
    _domain,
    _friendly_name,
    _load_allowlist,
    _states_or_503,
    _tool_for_domain,
    control_entity,
)
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User
from rosevear_ai_hub.tool_registry import ToolRiskLevel

router = APIRouter(prefix="/api/v1/home-assistant/scene-drafts", tags=["ha-scene-drafts"])
Operator = Annotated[User, Depends(require_roles("owner", "administrator"))]
Runtime = Annotated[HomeAssistantRuntime, Depends(get_home_assistant_runtime)]
DB = Annotated[Session, Depends(get_session)]
Action = Literal["on", "off"]
Outcome = Literal["executed", "unverified", "rejected", "skipped"]


class SceneAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_id: str = Field(min_length=3, max_length=255)
    action: Action


class SceneDraftInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    actions: list[SceneAction] = Field(min_length=1, max_length=4)


class ScenePreviewItem(SceneAction):
    friendly_name: str | None
    current_state: str
    expected_effect: str


class ScenePreviewResponse(BaseModel):
    preview_id: str
    confirmation_phrase: str
    expires_in_seconds: int
    actions: list[ScenePreviewItem]
    warning: str = "Preview only; no Home Assistant command was issued."


class SceneExecuteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    preview_id: str = Field(min_length=20, max_length=100)
    confirmation_phrase: str = Field(min_length=1, max_length=100)
    actions: list[SceneAction] = Field(min_length=1, max_length=4)


class SceneReceipt(SceneAction):
    outcome: Outcome
    observed_state: str | None = None
    detail: str


class SceneExecutionResponse(BaseModel):
    outcome: Literal["executed", "partial", "unverified", "rejected"]
    preview_id: str
    receipts: list[SceneReceipt]
    warning: str = "Home Assistant state observations are not proof of physical actuation."


@dataclass(frozen=True)
class _Ticket:
    actor_id: int
    actions: tuple[tuple[str, str, str], ...]
    confirmation_phrase: str
    expires_at: float


_tickets: dict[str, _Ticket] = {}
_ticket_lock = Lock()
_TICKET_LIFETIME_SECONDS = 120
_MAX_TICKETS = 200
_DANGEROUS_HINTS = (
    "workshop",
    "machinery",
    "machine",
    "lathe",
    "saw",
    "compressor",
    "welder",
    "3d printer",
    "3d_printer",
    "chemical",
    "hotplate",
    "heat gun",
    "heater",
    "heating",
    "furnace",
    "boiler",
    "kiln",
    "forge",
    "laser",
    "cnc",
    "smoke",
    "carbon monoxide",
    "power tool",
    "garage",
    "gate",
    "lock",
    "alarm",
    "thermostat",
    "water heater",
)


def _check_actions(actions: list[SceneAction], states: list[dict], allowed: set[str], db: Session):
    index = {
        item.get("entity_id"): item for item in states if isinstance(item.get("entity_id"), str)
    }
    seen: set[str] = set()
    prepared: list[ScenePreviewItem] = []
    for action in actions:
        entity_id = action.entity_id
        domain = _domain(entity_id)
        if entity_id in seen:
            raise HTTPException(
                status_code=422, detail="Each exact entity may occur once per draft."
            )
        seen.add(entity_id)
        if domain not in {"light", "switch"}:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Scene drafts support inspected light and switch actions only; "
                    "opaque scenes are held."
                ),
            )
        if entity_id not in allowed:
            raise HTTPException(status_code=403, detail="Entity is not on the control allowlist.")
        item = index.get(entity_id)
        if not item or not isinstance(item.get("state"), str):
            raise HTTPException(
                status_code=409, detail="An exact Home Assistant target is missing."
            )
        label = _friendly_name(item)
        if _blocked_reason(entity_id, label) or any(
            hint in (entity_id + " " + (label or "")).lower().replace("-", " ")
            for hint in _DANGEROUS_HINTS
        ):
            raise HTTPException(status_code=403, detail="A safety-sensitive target is held.")
        _tool_for_domain(db, domain)
        if item["state"] not in {"on", "off"}:
            raise HTTPException(status_code=409, detail="Entity state is unknown or unavailable.")
        prepared.append(
            ScenePreviewItem(
                entity_id=entity_id,
                action=action.action,
                friendly_name=label,
                current_state=item["state"],
                expected_effect=action.action,
            )
        )
    return prepared


def _record_receipt(db: Session, actor: User, row: SceneReceipt, preview_id: str) -> None:
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="home_assistant.scene_draft.action_receipt",
        object_type="home_assistant_entity",
        object_id=row.entity_id,
        action=row.action,
        arguments={"preview_id": preview_id, "expected_state": row.action},
        result={
            "ok": row.outcome == "executed",
            "outcome": row.outcome,
            "observed_state": row.observed_state,
        },
        risk_level=int(ToolRiskLevel.LOW_RISK_ACTION),
    )


@router.post("/preview", response_model=ScenePreviewResponse)
async def preview_scene(payload: SceneDraftInput, actor: Operator, runtime: Runtime, db: DB):
    observed = await _states_or_503(runtime)
    prepared = _check_actions(payload.actions, observed, set(_load_allowlist(db)), db)
    preview_id = secrets.token_urlsafe(24)
    phrase = "RUN " + preview_id[:8]
    with _ticket_lock:
        now = time.monotonic()
        for key in list(_tickets):
            if _tickets[key].expires_at <= now:
                del _tickets[key]
        if len(_tickets) >= _MAX_TICKETS:
            raise HTTPException(
                status_code=503, detail="Too many pending scene previews; retry later."
            )
        _tickets[preview_id] = _Ticket(
            actor_id=actor.id,
            actions=tuple((item.entity_id, item.action, item.current_state) for item in prepared),
            confirmation_phrase=phrase,
            expires_at=now + _TICKET_LIFETIME_SECONDS,
        )
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="home_assistant.scene_draft.previewed",
        object_type="home_assistant_scene_draft",
        object_id=preview_id,
        action="preview",
        arguments={"count": len(prepared), "entities": [item.entity_id for item in prepared]},
        result={"ok": True, "published": False},
    )
    db.commit()
    return ScenePreviewResponse(
        preview_id=preview_id,
        confirmation_phrase=phrase,
        expires_in_seconds=_TICKET_LIFETIME_SECONDS,
        actions=prepared,
    )


@router.post("/execute", response_model=SceneExecutionResponse)
async def execute_scene(payload: SceneExecuteInput, actor: Operator, runtime: Runtime, db: DB):
    with _ticket_lock:
        ticket = _tickets.pop(payload.preview_id, None)
    if (
        ticket is None
        or ticket.actor_id != actor.id
        or ticket.expires_at <= time.monotonic()
        or payload.confirmation_phrase != ticket.confirmation_phrase
        or [(a.entity_id, a.action) for a in payload.actions]
        != [(entity_id, action) for entity_id, action, _ in ticket.actions]
    ):
        raise HTTPException(
            status_code=409, detail="Preview is stale, changed, used or unauthorized."
        )

    # Re-check every selected target and the exact original states before the first action.
    states = await _states_or_503(runtime)
    prepared = _check_actions(payload.actions, states, set(_load_allowlist(db)), db)
    if (
        tuple((item.entity_id, item.action, item.current_state) for item in prepared)
        != ticket.actions
    ):
        raise HTTPException(
            status_code=409, detail="Source state changed since preview; no actions sent."
        )

    receipts: list[SceneReceipt] = []
    interrupted = False
    for index, action in enumerate(payload.actions):
        if interrupted:
            receipt = SceneReceipt(
                **action.model_dump(), outcome="skipped", detail="Prior action not verified."
            )
        else:
            try:
                # A prior step may have changed another entity or its safety label.
                # Hold that step if its original observed state or policy changed.
                latest = await _states_or_503(runtime)
                checked = _check_actions([action], latest, set(_load_allowlist(db)), db)[0]
                if checked.current_state != ticket.actions[index][2]:
                    raise HTTPException(
                        status_code=409,
                        detail="Target changed during scene execution.",
                    )
                await control_entity(
                    HomeAssistantControlRequest(**action.model_dump()),
                    actor,
                    runtime,
                    db,
                )
            except HTTPException:
                receipt = SceneReceipt(
                    **action.model_dump(),
                    outcome="rejected",
                    detail="Provider or policy rejected action.",
                )
                interrupted = True
            else:
                try:
                    after = await _states_or_503(runtime)
                    observed = next(
                        (
                            item.get("state")
                            for item in after
                            if item.get("entity_id") == action.entity_id
                        ),
                        None,
                    )
                except HTTPException:
                    observed = None
                verified = observed == action.action
                receipt = SceneReceipt(
                    **action.model_dump(),
                    outcome="executed" if verified else "unverified",
                    observed_state=observed if isinstance(observed, str) else None,
                    detail="Home Assistant reports expected state."
                    if verified
                    else (
                        "Provider accepted call but expected state was not independently observed."
                    ),
                )
                interrupted = not verified
        receipts.append(receipt)
        _record_receipt(db, actor, receipt, payload.preview_id)
        db.commit()

    outcomes = [item.outcome for item in receipts]
    if all(outcome == "executed" for outcome in outcomes):
        overall = "executed"
    elif "executed" in outcomes:
        overall = "partial"
    elif "unverified" in outcomes:
        overall = "unverified"
    else:
        overall = "rejected"
    return SceneExecutionResponse(outcome=overall, preview_id=payload.preview_id, receipts=receipts)
