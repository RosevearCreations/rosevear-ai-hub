"""Shared normalized identity and duplicate checks for manual camera plans."""

from __future__ import annotations

import hashlib
import json

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import CameraCompatibilityRecord


def normalized_identity(brand: str, model: str, location: str) -> tuple[str, str, str]:
    return tuple(" ".join(value.casefold().split()) for value in (brand, model, location))


def identity_fingerprint(brand: str, model: str, location: str) -> str:
    identity = normalized_identity(brand, model, location)
    return hashlib.sha256(json.dumps(identity, ensure_ascii=True).encode("utf-8")).hexdigest()


def find_duplicate(
    db: Session, brand: str, model: str, location: str, *, exclude_id: int | None = None
) -> CameraCompatibilityRecord | None:
    target = normalized_identity(brand, model, location)
    # Scan legacy Build 074 rows whose fingerprint was intentionally not backfilled.
    statement = select(CameraCompatibilityRecord).order_by(CameraCompatibilityRecord.id)
    for row in db.scalars(statement):
        if row.id != exclude_id and normalized_identity(row.brand, row.model, row.location) == target:
            return row
    return None


def ensure_no_duplicate(
    db: Session, brand: str, model: str, location: str, *, exclude_id: int | None = None
) -> str:
    if find_duplicate(db, brand, model, location, exclude_id=exclude_id) is not None:
        raise HTTPException(status_code=409, detail="An equivalent camera model and location already exist.")
    return identity_fingerprint(brand, model, location)
