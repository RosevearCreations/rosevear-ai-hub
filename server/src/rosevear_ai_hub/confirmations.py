"""Persistent confirmation workflow and replay prevention for Build 018."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.models import AuditEvent, ConfirmationRequest, ToolRecord, User
from rosevear_ai_hub.tool_registry import ToolRiskLevel, risk_label, sync_builtin_tools

PENDING = "pending"
APPROVED = "approved"
REJECTED = "rejected"
EXPIRED = "expired"
CONSUMED = "consumed"
FINAL_STATUSES = {REJECTED, EXPIRED, CONSUMED}


def utc_now() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def canonical_arguments(arguments: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Return JSON-round-tripped arguments plus a stable SHA-256 digest."""

    try:
        canonical_text = json.dumps(
            arguments,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tool arguments must be valid JSON values.",
        ) from exc

    normalized = json.loads(canonical_text)
    digest = hashlib.sha256(canonical_text.encode("utf-8")).hexdigest()
    return normalized, digest


def validate_arguments(tool: ToolRecord, arguments: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Validate untrusted tool arguments against the registered input schema."""

    schema = dict(tool.input_schema_json or {})
    try:
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema)
    except SchemaError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registered tool schema is invalid.",
        ) from exc

    errors = sorted(validator.iter_errors(arguments), key=lambda item: list(item.absolute_path))
    if errors:
        first = errors[0]
        path = ".".join(str(part) for part in first.absolute_path)
        location = f" at {path}" if path else ""
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tool arguments are invalid{location}: {first.message}",
        )

    return canonical_arguments(arguments)


def build_preview(tool: ToolRecord, arguments: dict[str, Any]) -> dict[str, Any]:
    """Build the server-owned exact action preview shown before approval."""

    argument_text = ", ".join(
        f"{key}={json.dumps(value, ensure_ascii=False, sort_keys=True)}"
        for key, value in sorted(arguments.items())
    )
    summary = tool.display_name if not argument_text else f"{tool.display_name}: {argument_text}"
    return {
        "tool_key": tool.tool_key,
        "tool_name": tool.display_name,
        "description": tool.description,
        "risk_level": tool.risk_level,
        "risk_label": risk_label(tool.risk_level),
        "summary": summary,
        "arguments": arguments,
    }


def expire_if_needed(session: Session, request: ConfirmationRequest) -> bool:
    """Lazily expire a pending or approved request when its deadline has passed."""

    if request.status not in {PENDING, APPROVED}:
        return False
    if as_utc(request.expires_at) > utc_now():
        return False

    request.status = EXPIRED
    session.add(
        AuditEvent(
            actor_user_id=None,
            event_type="confirmation.expired",
            object_type="confirmation",
            object_id=request.id,
            action="expire",
            sanitized_arguments={
                "tool_key": request.tool_key,
                "arguments_hash": request.arguments_hash,
            },
            result={"ok": True},
        )
    )
    session.flush()
    return True


def expire_stale_confirmations(session: Session) -> int:
    requests = session.scalars(
        select(ConfirmationRequest).where(ConfirmationRequest.status.in_([PENDING, APPROVED]))
    ).all()
    expired = sum(1 for item in requests if expire_if_needed(session, item))
    if expired:
        session.commit()
    return expired


def prepare_confirmation(
    session: Session,
    *,
    actor: User,
    tool_key: str,
    arguments: dict[str, Any],
) -> ConfirmationRequest:
    """Create one pending, exact-action confirmation request."""

    sync_builtin_tools(session)
    tool = session.scalar(select(ToolRecord).where(ToolRecord.tool_key == tool_key))
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found.")
    if not tool.enabled:
        raise HTTPException(status_code=409, detail="Tool is disabled.")

    if tool.risk_level == int(ToolRiskLevel.PROHIBITED_AUTONOMOUS):
        raise HTTPException(
            status_code=409,
            detail="Level 3 actions cannot enter the autonomous confirmation workflow.",
        )
    if tool.risk_level != int(ToolRiskLevel.CONFIRMATION_REQUIRED):
        raise HTTPException(
            status_code=409,
            detail="This tool does not require the Build 018 confirmation workflow.",
        )

    normalized, arguments_hash = validate_arguments(tool, arguments)
    now = utc_now()
    ttl = get_settings().confirmation_ttl_seconds
    request = ConfirmationRequest(
        id=str(uuid4()),
        requested_by_user_id=actor.id,
        tool_id=tool.id,
        tool_key=tool.tool_key,
        risk_level=tool.risk_level,
        arguments_json=normalized,
        arguments_hash=arguments_hash,
        preview_json=build_preview(tool, normalized),
        status=PENDING,
        expires_at=now + timedelta(seconds=ttl),
    )
    session.add(request)
    session.add(
        AuditEvent(
            actor_user_id=actor.id,
            event_type="confirmation.requested",
            object_type="confirmation",
            object_id=request.id,
            action="request",
            sanitized_arguments={
                "tool_key": request.tool_key,
                "arguments_hash": request.arguments_hash,
            },
            result={"ok": True, "expires_at": request.expires_at.isoformat()},
        )
    )
    session.commit()
    session.refresh(request)
    return request


def decide_confirmation(
    session: Session,
    *,
    request: ConfirmationRequest,
    actor: User,
    decision: str,
) -> ConfirmationRequest:
    """Approve or reject a still-pending request exactly once."""

    if expire_if_needed(session, request):
        session.commit()
        raise HTTPException(status_code=410, detail="Confirmation request has expired.")
    if request.status == EXPIRED:
        raise HTTPException(status_code=410, detail="Confirmation request has expired.")
    if request.status != PENDING:
        raise HTTPException(
            status_code=409,
            detail=f"Confirmation request is already {request.status}.",
        )
    if decision not in {APPROVED, REJECTED}:
        raise ValueError("Unsupported confirmation decision.")

    now = utc_now()
    request.status = decision
    request.decided_by_user_id = actor.id
    request.decided_at = now
    session.add(
        AuditEvent(
            actor_user_id=actor.id,
            event_type=f"confirmation.{decision}",
            object_type="confirmation",
            object_id=request.id,
            action=decision,
            sanitized_arguments={
                "tool_key": request.tool_key,
                "arguments_hash": request.arguments_hash,
            },
            result={"ok": True},
        )
    )
    session.commit()
    session.refresh(request)
    return request


def consume_confirmation(
    session: Session,
    *,
    confirmation_id: str,
    actor: User,
    tool_key: str,
    arguments: dict[str, Any],
) -> ConfirmationRequest:
    """Atomically consume one approved confirmation for the exact action.

    The caller must commit the action and this state transition in the same
    transaction. If the action fails and rolls back, the approval remains
    available until expiry. A successful transaction cannot consume it twice.
    """

    request = session.get(ConfirmationRequest, confirmation_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Confirmation request not found.")

    if expire_if_needed(session, request):
        session.commit()
        raise HTTPException(status_code=410, detail="Confirmation request has expired.")
    if request.status == EXPIRED:
        raise HTTPException(status_code=410, detail="Confirmation request has expired.")

    normalized, arguments_hash = canonical_arguments(arguments)
    if request.tool_key != tool_key or request.arguments_hash != arguments_hash:
        raise HTTPException(
            status_code=409,
            detail="Confirmation does not match this exact action.",
        )
    if request.arguments_json != normalized:
        raise HTTPException(
            status_code=409,
            detail="Confirmation arguments do not match this exact action.",
        )
    if actor.id not in {request.requested_by_user_id, request.decided_by_user_id}:
        raise HTTPException(
            status_code=403,
            detail="This confirmation belongs to a different user.",
        )
    if request.status != APPROVED:
        raise HTTPException(
            status_code=409,
            detail=f"Confirmation request is {request.status}, not approved.",
        )

    now = utc_now()
    result = session.execute(
        update(ConfirmationRequest)
        .where(
            ConfirmationRequest.id == request.id,
            ConfirmationRequest.status == APPROVED,
        )
        .values(status=CONSUMED, consumed_at=now)
    )
    if result.rowcount != 1:
        raise HTTPException(
            status_code=409,
            detail="Confirmation has already been consumed.",
        )

    session.add(
        AuditEvent(
            actor_user_id=actor.id,
            event_type="confirmation.consumed",
            object_type="confirmation",
            object_id=request.id,
            action="consume",
            sanitized_arguments={
                "tool_key": request.tool_key,
                "arguments_hash": request.arguments_hash,
            },
            result={"ok": True},
        )
    )
    session.flush()
    session.expire(request)
    return request
