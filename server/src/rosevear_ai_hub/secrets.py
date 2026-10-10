"""Environment-backed and encrypted-at-rest secret management."""

from __future__ import annotations

import base64
import binascii
import hashlib
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Final

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.models import CameraStream, SecretValue, User

_CIPHERTEXT_PREFIX: Final = "v1"


@dataclass(frozen=True)
class SecretDefinition:
    secret_key: str
    display_name: str
    description: str
    environment_variable: str


SECRET_DEFINITIONS: tuple[SecretDefinition, ...] = (
    SecretDefinition(
        secret_key="home_assistant.token",
        display_name="Home Assistant token",
        description="Long-lived token used by the Home Assistant connector in Build 021.",
        environment_variable="HOME_ASSISTANT_TOKEN",
    ),
    SecretDefinition(
        secret_key="mqtt.password",
        display_name="MQTT password",
        description="Password used by the MQTT connector beginning in Build 025.",
        environment_variable="MQTT_PASSWORD",
    ),
    SecretDefinition(
        secret_key="devilndove.admin_token",
        display_name="Devil n Dove admin token",
        description=(
            "Bearer-equivalent admin session credential used only for Build 037 read requests."
        ),
        environment_variable="DEVILNDOVE_ADMIN_TOKEN",
    ),
    SecretDefinition(
        secret_key="rosiedazzlers.staff_session_token",
        display_name="Rosie Dazzlers staff session token",
        description=(
            "Opaque Rosie Dazzlers staff-session token used only for Build 038 read requests."
        ),
        environment_variable="ROSIEDAZZLERS_STAFF_SESSION_TOKEN",
    ),
)

_DEFINITIONS_BY_KEY = {item.secret_key: item for item in SECRET_DEFINITIONS}


def secret_definition(secret_key: str) -> SecretDefinition:
    definition = _DEFINITIONS_BY_KEY.get(secret_key)
    if definition is None:
        raise HTTPException(status_code=404, detail="Unknown secret key.")
    return definition


def _decode_key(encoded: str | None, *, label: str) -> bytes | None:
    if not encoded:
        return None
    padding = "=" * (-len(encoded) % 4)
    try:
        raw = base64.urlsafe_b64decode(encoded + padding)
    except (ValueError, binascii.Error) as exc:
        raise RuntimeError(f"{label} must be URL-safe base64.") from exc
    if len(raw) != 32:
        raise RuntimeError(f"{label} must decode to exactly 32 bytes.")
    return raw


def key_fingerprint(raw_key: bytes) -> str:
    return hashlib.sha256(raw_key).hexdigest()[:16]


def current_key(settings: Settings | None = None) -> bytes | None:
    settings = settings or get_settings()
    encoded = (
        settings.secret_encryption_key.get_secret_value()
        if settings.secret_encryption_key
        else None
    )
    return _decode_key(encoded, label="SECRET_ENCRYPTION_KEY")


def previous_key(settings: Settings | None = None) -> bytes | None:
    settings = settings or get_settings()
    encoded = (
        settings.secret_encryption_previous_key.get_secret_value()
        if settings.secret_encryption_previous_key
        else None
    )
    return _decode_key(encoded, label="SECRET_ENCRYPTION_PREVIOUS_KEY")


def encryption_available(settings: Settings | None = None) -> bool:
    return current_key(settings) is not None


def environment_secret(
    definition: SecretDefinition,
    settings: Settings | None = None,
) -> str | None:
    settings = settings or get_settings()
    configured = {
        "HOME_ASSISTANT_TOKEN": settings.home_assistant_token,
        "MQTT_PASSWORD": settings.mqtt_password,
        "DEVILNDOVE_ADMIN_TOKEN": settings.devilndove_admin_token,
        "ROSIEDAZZLERS_STAFF_SESSION_TOKEN": (
            settings.rosiedazzlers_staff_session_token
        ),
    }.get(definition.environment_variable)
    return configured.get_secret_value() if configured else None


def _encrypt(plaintext: str, raw_key: bytes, *, secret_key: str) -> str:
    nonce = os.urandom(12)
    aad = secret_key.encode("utf-8")
    encrypted = AESGCM(raw_key).encrypt(nonce, plaintext.encode("utf-8"), aad)
    return ":".join(
        (
            _CIPHERTEXT_PREFIX,
            base64.urlsafe_b64encode(nonce).decode("ascii").rstrip("="),
            base64.urlsafe_b64encode(encrypted).decode("ascii").rstrip("="),
        )
    )


def _decode_part(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _decrypt(ciphertext: str, raw_key: bytes, *, secret_key: str) -> str:
    parts = ciphertext.split(":")
    if len(parts) != 3 or parts[0] != _CIPHERTEXT_PREFIX:
        raise RuntimeError("Unsupported encrypted-secret format.")
    try:
        plaintext = AESGCM(raw_key).decrypt(
            _decode_part(parts[1]),
            _decode_part(parts[2]),
            secret_key.encode("utf-8"),
        )
    except Exception as exc:
        raise RuntimeError("Encrypted secret could not be decrypted.") from exc
    return plaintext.decode("utf-8")


def _decrypt_record(record: SecretValue, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    candidates = [key for key in (current_key(settings), previous_key(settings)) if key is not None]
    for raw_key in candidates:
        try:
            return _decrypt(record.ciphertext, raw_key, secret_key=record.secret_key)
        except RuntimeError:
            continue
    raise RuntimeError("No configured encryption key can decrypt this stored secret.")


def resolve_secret(
    session: Session,
    secret_key: str,
    settings: Settings | None = None,
) -> str | None:
    definition = secret_definition(secret_key)
    env_value = environment_secret(definition, settings)
    if env_value:
        return env_value
    record = session.scalar(select(SecretValue).where(SecretValue.secret_key == secret_key))
    return _decrypt_record(record, settings) if record is not None else None


def store_secret(
    session: Session,
    *,
    actor: User,
    secret_key: str,
    value: str,
    settings: Settings | None = None,
) -> SecretValue:
    secret_definition(secret_key)
    settings = settings or get_settings()
    raw_key = current_key(settings)
    if raw_key is None:
        raise HTTPException(
            status_code=503,
            detail="Encrypted secret storage is locked. Configure SECRET_ENCRYPTION_KEY first.",
        )
    if not value:
        raise HTTPException(status_code=422, detail="Secret value cannot be empty.")
    normalized = value

    record = session.scalar(select(SecretValue).where(SecretValue.secret_key == secret_key))
    now = datetime.now(UTC)
    if record is None:
        record = SecretValue(
            secret_key=secret_key,
            ciphertext=_encrypt(normalized, raw_key, secret_key=secret_key),
            key_fingerprint=key_fingerprint(raw_key),
            rotated_at=now,
        )
        session.add(record)
        action = "create"
    else:
        record.ciphertext = _encrypt(normalized, raw_key, secret_key=secret_key)
        record.key_fingerprint = key_fingerprint(raw_key)
        record.rotated_at = now
        action = "rotate"

    record_audit_event(
        session,
        actor_user_id=actor.id,
        event_type="secret.updated",
        object_type="secret",
        object_id=secret_key,
        action=action,
        arguments={"secret_key": secret_key, "source": "encrypted_store"},
        result={"ok": True},
    )
    session.commit()
    session.refresh(record)
    return record


def delete_stored_secret(session: Session, *, actor: User, secret_key: str) -> bool:
    secret_definition(secret_key)
    record = session.scalar(select(SecretValue).where(SecretValue.secret_key == secret_key))
    if record is None:
        return False
    session.delete(record)
    record_audit_event(
        session,
        actor_user_id=actor.id,
        event_type="secret.deleted",
        object_type="secret",
        object_id=secret_key,
        action="delete",
        arguments={"secret_key": secret_key, "source": "encrypted_store"},
        result={"ok": True},
    )
    session.commit()
    return True


def rewrap_all_secrets(
    session: Session,
    *,
    actor: User,
    settings: Settings | None = None,
) -> int:
    settings = settings or get_settings()
    raw_key = current_key(settings)
    if raw_key is None:
        raise HTTPException(status_code=503, detail="SECRET_ENCRYPTION_KEY is not configured.")

    records = session.scalars(select(SecretValue).order_by(SecretValue.id.asc())).all()
    camera_streams = session.scalars(select(CameraStream).order_by(CameraStream.id.asc())).all()

    plaintext_by_id = {record.id: _decrypt_record(record, settings) for record in records}
    camera_plaintext_by_id = {
        stream.id: decrypt_scoped_value(
            stream.source_ciphertext,
            scope=f"camera.stream.{stream.camera_id}",
            settings=settings,
        )
        for stream in camera_streams
    }

    now = datetime.now(UTC)
    fingerprint = key_fingerprint(raw_key)
    for record in records:
        record.ciphertext = _encrypt(
            plaintext_by_id[record.id],
            raw_key,
            secret_key=record.secret_key,
        )
        record.key_fingerprint = fingerprint
        record.rotated_at = now

    for stream in camera_streams:
        stream.source_ciphertext = _encrypt(
            camera_plaintext_by_id[stream.id],
            raw_key,
            secret_key=f"camera.stream.{stream.camera_id}",
        )
        stream.key_fingerprint = fingerprint

    record_audit_event(
        session,
        actor_user_id=actor.id,
        event_type="secret.rewrapped",
        object_type="secret_store",
        object_id=None,
        action="rewrap",
        arguments={
            "secret_count": len(records),
            "camera_stream_count": len(camera_streams),
        },
        result={"ok": True},
    )
    session.commit()
    return len(records) + len(camera_streams)


def encrypt_scoped_value(
    plaintext: str,
    *,
    scope: str,
    settings: Settings | None = None,
) -> tuple[str, str]:
    """Encrypt an integration-owned value without exposing it through the generic Secrets API."""

    settings = settings or get_settings()
    raw_key = current_key(settings)
    if raw_key is None:
        raise RuntimeError("SECRET_ENCRYPTION_KEY is not configured.")
    return _encrypt(plaintext, raw_key, secret_key=scope), key_fingerprint(raw_key)


def decrypt_scoped_value(
    ciphertext: str,
    *,
    scope: str,
    settings: Settings | None = None,
) -> str:
    """Decrypt an integration-owned value with current/previous-key rotation support."""

    settings = settings or get_settings()
    for raw_key in (current_key(settings), previous_key(settings)):
        if raw_key is None:
            continue
        try:
            return _decrypt(ciphertext, raw_key, secret_key=scope)
        except RuntimeError:
            continue
    raise RuntimeError("No configured encryption key can decrypt this scoped value.")
