"""Secret metadata and encrypted-storage administration API."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import SecretValue, User
from rosevear_ai_hub.secrets import (
    SECRET_DEFINITIONS,
    delete_stored_secret,
    encryption_available,
    environment_secret,
    key_fingerprint,
    current_key,
    previous_key,
    rewrap_all_secrets,
    secret_definition,
    store_secret,
)

router = APIRouter(prefix="/api/v1/secrets", tags=["secrets"])


class SecretMetadataResponse(BaseModel):
    secret_key: str
    display_name: str
    description: str
    environment_variable: str
    configured: bool
    effective_source: str | None
    environment_configured: bool
    encrypted_store_configured: bool
    key_fingerprint: str | None
    rotated_at: datetime | None
    updated_at: datetime | None


class SecretStatusResponse(BaseModel):
    encryption_available: bool
    current_key_fingerprint: str | None
    previous_key_available: bool
    stored_secret_count: int
    secrets: list[SecretMetadataResponse]


class SecretWriteRequest(BaseModel):
    value: str = Field(min_length=1, max_length=16384)


class SecretDeleteResponse(BaseModel):
    deleted: bool


class SecretRewrapResponse(BaseModel):
    rewrapped: int
    current_key_fingerprint: str


def _metadata(definition, stored: SecretValue | None) -> SecretMetadataResponse:
    settings = get_settings()
    env_configured = bool(environment_secret(definition, settings))
    stored_configured = stored is not None
    source = "environment" if env_configured else ("encrypted_store" if stored_configured else None)
    return SecretMetadataResponse(
        secret_key=definition.secret_key,
        display_name=definition.display_name,
        description=definition.description,
        environment_variable=definition.environment_variable,
        configured=env_configured or stored_configured,
        effective_source=source,
        environment_configured=env_configured,
        encrypted_store_configured=stored_configured,
        key_fingerprint=stored.key_fingerprint if stored else None,
        rotated_at=stored.rotated_at if stored else None,
        updated_at=stored.updated_at if stored else None,
    )


@router.get("", response_model=SecretStatusResponse)
def secret_status(
    _: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> SecretStatusResponse:
    settings = get_settings()
    stored = {
        item.secret_key: item
        for item in db.scalars(select(SecretValue).order_by(SecretValue.secret_key.asc())).all()
    }
    raw_current = current_key(settings)
    return SecretStatusResponse(
        encryption_available=encryption_available(settings),
        current_key_fingerprint=key_fingerprint(raw_current) if raw_current else None,
        previous_key_available=previous_key(settings) is not None,
        stored_secret_count=len(stored),
        secrets=[_metadata(item, stored.get(item.secret_key)) for item in SECRET_DEFINITIONS],
    )


@router.put("/{secret_key}", response_model=SecretMetadataResponse)
def set_secret(
    secret_key: str,
    payload: SecretWriteRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> SecretMetadataResponse:
    definition = secret_definition(secret_key)
    record = store_secret(db, actor=actor, secret_key=secret_key, value=payload.value)
    return _metadata(definition, record)


@router.delete("/{secret_key}", response_model=SecretDeleteResponse)
def delete_secret(
    secret_key: str,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> SecretDeleteResponse:
    return SecretDeleteResponse(
        deleted=delete_stored_secret(db, actor=actor, secret_key=secret_key)
    )


@router.post("/rewrap", response_model=SecretRewrapResponse)
def rewrap_secrets(
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> SecretRewrapResponse:
    count = rewrap_all_secrets(db, actor=actor)
    raw_key = current_key()
    assert raw_key is not None
    return SecretRewrapResponse(
        rewrapped=count,
        current_key_fingerprint=key_fingerprint(raw_key),
    )
