"""Central audit sanitization and recording for Build 019."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from rosevear_ai_hub.models import AuditEvent

REDACTED = "[REDACTED]"
TRUNCATED = "[TRUNCATED]"
MAX_STRING_LENGTH = 1024
MAX_COLLECTION_ITEMS = 100
MAX_DEPTH = 8

_SENSITIVE_KEY_PARTS = (
    "password",
    "passwd",
    "secret",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "session_token",
    "authorization",
    "cookie",
    "credential",
    "private_key",
)


def _is_sensitive_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_").replace(" ", "_")
    return any(part in normalized for part in _SENSITIVE_KEY_PARTS)


def sanitize_audit_value(value: Any, *, key: str | None = None, depth: int = 0) -> Any:
    """Return a bounded JSON-safe representation suitable for persistent audit logs."""

    if key is not None and _is_sensitive_key(key):
        return REDACTED
    if depth >= MAX_DEPTH:
        return TRUNCATED
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, str):
        if value.lower().startswith(("bearer ", "basic ")):
            return REDACTED
        if len(value) > MAX_STRING_LENGTH:
            return value[:MAX_STRING_LENGTH] + "…"
        return value
    if isinstance(value, Mapping):
        sanitized: dict[str, Any] = {}
        for index, (raw_key, item) in enumerate(value.items()):
            if index >= MAX_COLLECTION_ITEMS:
                sanitized[TRUNCATED] = True
                break
            item_key = str(raw_key)
            sanitized[item_key] = sanitize_audit_value(
                item,
                key=item_key,
                depth=depth + 1,
            )
        return sanitized
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        items = list(value[:MAX_COLLECTION_ITEMS])
        sanitized_items = [
            sanitize_audit_value(item, depth=depth + 1)
            for item in items
        ]
        if len(value) > MAX_COLLECTION_ITEMS:
            sanitized_items.append(TRUNCATED)
        return sanitized_items
    return str(value)[:MAX_STRING_LENGTH]


def derive_result_status(result: Any) -> str:
    sanitized = sanitize_audit_value(result)
    if isinstance(sanitized, dict):
        ok = sanitized.get("ok")
        if ok is True:
            return "success"
        if ok is False:
            return "failure"
        value = sanitized.get("status") or sanitized.get("outcome")
        if isinstance(value, str) and value:
            return value[:32]
    return "unknown"


def record_audit_event(
    session: Session,
    *,
    actor_user_id: int | None,
    event_type: str,
    object_type: str,
    object_id: str | None,
    action: str,
    arguments: Any = None,
    result: Any = None,
    tool_key: str | None = None,
    risk_level: int | None = None,
    confirmation_id: str | None = None,
) -> AuditEvent:
    """Stage one immutable sanitized audit event in the caller's transaction."""

    sanitized_arguments = (
        None if arguments is None else sanitize_audit_value(arguments)
    )
    sanitized_result = None if result is None else sanitize_audit_value(result)

    event = AuditEvent(
        actor_user_id=actor_user_id,
        event_type=event_type,
        object_type=object_type,
        object_id=object_id,
        action=action,
        tool_key=tool_key,
        risk_level=risk_level,
        confirmation_id=confirmation_id,
        sanitized_arguments=sanitized_arguments,
        result=sanitized_result,
        result_status=derive_result_status(sanitized_result),
    )
    session.add(event)
    return event
