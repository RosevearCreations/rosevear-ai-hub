"""Persistent local notification service for Build 030."""

from __future__ import annotations

from sqlalchemy.orm import Session

from rosevear_ai_hub.models import Notification

NOTIFICATION_SEVERITIES = ("info", "warning", "urgent")


def normalize_notification_text(value: str, *, field: str, maximum: int) -> str:
    cleaned = " ".join(value.strip().split())
    if not cleaned:
        raise ValueError(f"Notification {field} cannot be blank.")
    if len(cleaned) > maximum:
        raise ValueError(f"Notification {field} exceeds {maximum} characters.")
    return cleaned


def create_household_notification(
    db: Session,
    *,
    title: str,
    message: str,
    severity: str,
    source_type: str,
    source_id: str | None = None,
    created_by_user_id: int | None = None,
) -> Notification:
    if severity not in NOTIFICATION_SEVERITIES:
        raise ValueError("Notification severity must be info, warning, or urgent.")
    source = normalize_notification_text(source_type, field="source type", maximum=64)
    record = Notification(
        audience="household",
        title=normalize_notification_text(title, field="title", maximum=160),
        message=normalize_notification_text(message, field="message", maximum=2000),
        severity=severity,
        source_type=source,
        source_id=source_id[:255] if source_id else None,
        created_by_user_id=created_by_user_id,
    )
    db.add(record)
    db.flush()
    return record
