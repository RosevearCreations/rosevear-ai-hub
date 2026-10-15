"""Build 075: preview-first, conflict-safe owner camera inventory import."""

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_compatibility import CameraPlanInput, create_plan
from rosevear_ai_hub.api.camera_inventory_import import (
    ImportDecision,
    ImportRequest,
    commit_import,
    preview_import,
)
from rosevear_ai_hub.database import Base
from rosevear_ai_hub.models import CameraCompatibilityLedger, CameraCompatibilityRecord, User


@pytest.fixture
def db_and_owner() -> tuple[Session, User]:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        actor = User(username="import-owner", password_hash="unused", role="owner")
        session.add(actor)
        session.commit()
        session.refresh(actor)
        yield session, actor
    engine.dispose()


def item(
    brand: str = "Blink",
    model: str = "Indoor",
    location: str = "Living Room",
) -> CameraPlanInput:
    return CameraPlanInput(
        brand=brand,
        model=model,
        location=location,
        method="alexa_only",
        evidence="Model-specific manufacturer integration documentation.",
    )


def test_import_preview_commit_no_auto_approval_and_retry_safe(db_and_owner) -> None:
    db, actor = db_and_owner
    entries = [item(), item("littlelf", "Test Model", "Door")]
    before = preview_import(ImportRequest(entries=entries), actor, db)
    assert before.ready == 2 and before.conflicts == 0
    assert db.scalars(select(CameraCompatibilityRecord)).all() == []

    result = commit_import(
        ImportDecision(
            entries=entries,
            expected_snapshot=before.server_snapshot,
            preview_token=before.preview_token or "",
            owner_acknowledged=True,
        ),
        actor,
        db,
    )
    assert result.imported == 2
    assert result.approvals_carried_over is False
    assert all(row.approved_at is None for row in result.created)
    assert len(db.scalars(select(CameraCompatibilityLedger)).all()) == 2

    with pytest.raises(HTTPException) as replay:
        commit_import(
            ImportDecision(
                entries=entries,
                expected_snapshot=before.server_snapshot,
                preview_token=before.preview_token or "",
                owner_acknowledged=True,
            ),
            actor,
            db,
        )
    assert replay.value.status_code == 409
    later = preview_import(ImportRequest(entries=entries), actor, db)
    assert later.ready == 0 and later.conflicts == 2


def test_conflicts_not_overwritten_or_imported(db_and_owner) -> None:
    db, actor = db_and_owner
    original = create_plan(item(), actor, db)
    duplicate = item(brand=" BLINK ", model="  indoor ", location="living  room")
    preview = preview_import(ImportRequest(entries=[duplicate]), actor, db)
    assert preview.conflicts == 1
    assert preview.rows[0].existing_id == original.id
    with pytest.raises(HTTPException) as conflict:
        commit_import(
            ImportDecision(
                entries=[duplicate],
                expected_snapshot=preview.server_snapshot,
                preview_token=preview.preview_token or "x" * 40,
                owner_acknowledged=True,
            ),
            actor,
            db,
        )
    assert conflict.value.status_code == 409
    assert len(db.scalars(select(CameraCompatibilityRecord)).all()) == 1


def test_stale_snapshot_and_missing_ack_are_rejected(db_and_owner) -> None:
    db, actor = db_and_owner
    planned = item()
    preview = preview_import(ImportRequest(entries=[planned]), actor, db)
    create_plan(item("Nooie", "Outdoor", "Driveway"), actor, db)

    with pytest.raises(HTTPException) as stale:
        commit_import(
            ImportDecision(
                entries=[planned],
                expected_snapshot=preview.server_snapshot,
                preview_token=preview.preview_token or "x" * 40,
                owner_acknowledged=True,
            ),
            actor,
            db,
        )
    assert stale.value.status_code == 409
    with pytest.raises(HTTPException) as missing_ack:
        commit_import(
            ImportDecision(
                entries=[planned],
                expected_snapshot=preview.server_snapshot,
                preview_token=preview.preview_token or "x" * 40,
                owner_acknowledged=False,
            ),
            actor,
            db,
        )
    assert missing_ack.value.status_code == 422


def test_batch_duplicates_and_secret_values_rejected(db_and_owner) -> None:
    db, actor = db_and_owner
    with pytest.raises(HTTPException) as repeated:
        preview_import(ImportRequest(entries=[item(), item("blink", "INDOOR")]), actor, db)
    assert repeated.value.status_code == 422
    with pytest.raises(HTTPException) as unsafe:
        preview_import(
            ImportRequest(
                entries=[
                    CameraPlanInput(
                        brand="Blink", model="Indoor", evidence="rtsp://user:password@192.168.1.5"
                    )
                ]
            ),
            actor,
            db,
        )
    assert unsafe.value.status_code == 422
