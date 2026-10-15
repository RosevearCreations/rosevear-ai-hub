"""Build 076 regression checks for identity-bound camera import acceptance."""

import hashlib

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_compatibility import CameraPlanInput
from rosevear_ai_hub.api.camera_inventory_import import (
    ImportDecision,
    ImportRequest,
    commit_import,
    field_readiness,
    preview_import,
)
from rosevear_ai_hub.database import Base
from rosevear_ai_hub.models import CameraCompatibilityRecord, CameraImportReview, User


@pytest.fixture
def owners():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        first = User(username="owner-one", password_hash="unused", role="owner")
        second = User(username="owner-two", password_hash="unused", role="administrator")
        db.add_all([first, second])
        db.commit()
        db.refresh(first)
        db.refresh(second)
        yield db, first, second
    engine.dispose()


def sample(model: str = "Camera A") -> CameraPlanInput:
    return CameraPlanInput(
        brand="littlelf",
        model=model,
        method="alexa_only",
        evidence="Vendor documents Alexa display support only.",
    )


def decision(preview, entries):
    assert preview.preview_token
    return ImportDecision(
        entries=entries,
        expected_snapshot=preview.server_snapshot,
        preview_token=preview.preview_token,
        owner_acknowledged=True,
    )


def test_preview_is_bound_to_account_and_consumed_once(owners) -> None:
    db, first, second = owners
    chosen = [sample()]
    preview = preview_import(ImportRequest(entries=chosen), first, db)
    assert preview.ready == 1
    assert preview.expires_at is not None
    assert db.scalars(select(CameraCompatibilityRecord)).all() == []

    with pytest.raises(HTTPException) as foreign:
        commit_import(decision(preview, chosen), second, db)
    assert foreign.value.status_code == 403

    saved = commit_import(decision(preview, chosen), first, db)
    assert saved.imported == 1
    assert saved.approvals_carried_over is False
    assert saved.created[0].approved_at is None

    with pytest.raises(HTTPException) as replay:
        commit_import(decision(preview, chosen), first, db)
    assert replay.value.status_code == 409
    key = hashlib.sha256(preview.preview_token.encode("utf-8")).hexdigest()
    receipt = db.get(CameraImportReview, key)
    assert receipt is not None
    assert receipt.consumed_at is not None
    assert receipt.imported_count == 1


def test_preview_rejects_expiry_or_changed_entries(owners) -> None:
    db, first, _ = owners
    chosen = [sample()]
    preview = preview_import(ImportRequest(entries=chosen), first, db)

    with pytest.raises(HTTPException) as changed:
        commit_import(decision(preview, [sample("Changed Model")]), first, db)
    assert changed.value.status_code == 409

    with pytest.raises(HTTPException) as altered:
        revised = sample()
        revised.evidence = "Different vendor documentation."
        commit_import(decision(preview, [revised]), first, db)
    assert altered.value.status_code == 409

    key = hashlib.sha256(preview.preview_token.encode("utf-8")).hexdigest()
    receipt = db.get(CameraImportReview, key)
    assert receipt is not None
    receipt.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    with pytest.raises(HTTPException) as expired:
        commit_import(decision(preview, chosen), first, db)
    assert expired.value.status_code == 409
    assert db.scalars(select(CameraCompatibilityRecord)).all() == []


def test_field_readiness_is_diagnostic_not_windows_attestation(owners) -> None:
    db, first, _ = owners
    result = field_readiness(first, db)
    assert result.local_windows_acceptance_required is True
    assert result.schema_ready is False
    assert result.camera_records == 0
    assert result.review_receipts == 0
