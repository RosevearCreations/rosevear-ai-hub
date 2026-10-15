"""Build 077: append-only owner field observations cannot certify remote runtime health."""

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_import_assurance import (
    AcceptanceInput,
    assurance,
    record_owner_acceptance,
)
from rosevear_ai_hub.database import Base
from rosevear_ai_hub.models import (
    CameraCompatibilityRecord,
    CameraImportAcceptanceEvidence,
    User,
)


@pytest.fixture
def owner_db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0022')"))
    with Session(engine) as db:
        owner = User(username="camera-owner-077", password_hash="unused", role="owner")
        db.add(owner)
        db.commit()
        db.refresh(owner)
        yield db, owner
    engine.dispose()


def payload(snapshot: str, decision: str = "accepted", checks: bool = True):
    return AcceptanceInput(
        expected_snapshot=snapshot,
        decision=decision,
        backup_drill_confirmed=checks,
        ha_connected_confirmed=checks,
        mqtt_connected_confirmed=checks,
        camera_status_confirmed=checks,
    )


def test_owner_acceptance_is_append_only_and_explicit(owner_db) -> None:
    db, owner = owner_db
    before = assurance(db)
    assert before.schema_ready
    assert before.latest is None
    assert not before.windows_runtime_verified_automatically

    with pytest.raises(HTTPException) as incomplete:
        record_owner_acceptance(payload(before.inventory_snapshot, checks=False), owner, db)
    assert incomplete.value.status_code == 422

    hold = record_owner_acceptance(payload(before.inventory_snapshot, "hold", False), owner, db)
    accepted = record_owner_acceptance(payload(before.inventory_snapshot), owner, db)
    assert hold.id != accepted.id
    assert hold.decision == "hold"
    assert accepted.decision == "accepted"
    after = assurance(db)
    assert after.latest is not None
    assert after.latest.id == accepted.id
    assert after.latest_snapshot_current
    assert after.evidence_is_manual_only
    assert not after.windows_runtime_verified_automatically
    assert len(db.scalars(select(CameraImportAcceptanceEvidence)).all()) == 2


def test_owner_acceptance_invalidated_by_camera_inventory_change(owner_db) -> None:
    db, owner = owner_db
    initial = assurance(db)
    record_owner_acceptance(payload(initial.inventory_snapshot), owner, db)
    db.add(
        CameraCompatibilityRecord(
            brand="Nooie",
            model="Safe test model",
            location="Test",
            method="unverified",
            evidence="",
            revision=1,
        )
    )
    db.commit()
    later = assurance(db)
    assert not later.latest_snapshot_current
    with pytest.raises(HTTPException) as stale:
        record_owner_acceptance(payload(initial.inventory_snapshot), owner, db)
    assert stale.value.status_code == 409
