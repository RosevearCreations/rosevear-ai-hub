"""Build 078: reconcile manually attested camera import evidence, fail closed."""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_import_assurance import (
    AcceptanceInput,
    assurance,
    record_owner_acceptance,
)
from rosevear_ai_hub.api.camera_import_reconciliation import reconcile
from rosevear_ai_hub.database import Base
from rosevear_ai_hub.models import CameraCompatibilityRecord, User


@pytest.fixture
def owner_db():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0022')"))
    with Session(engine) as db:
        owner = User(username="camera-owner-078", password_hash="unused", role="owner")
        db.add(owner)
        db.commit()
        db.refresh(owner)
        yield db, owner
    engine.dispose()


def observation(snapshot, decision="accepted", checks=True):
    return AcceptanceInput(
        expected_snapshot=snapshot,
        decision=decision,
        backup_drill_confirmed=checks,
        ha_connected_confirmed=checks,
        mqtt_connected_confirmed=checks,
        camera_status_confirmed=checks,
    )


def test_missing_hold_and_accepted_manual_evidence(owner_db) -> None:
    db, owner = owner_db
    initial = reconcile(db)
    assert initial.status == "HOLD"
    assert initial.reasons == ["NO_OWNER_EVIDENCE"]
    assert not initial.runtime_verified_automatically
    assert not initial.isolated_recovery_verified_automatically

    snapshot = assurance(db).inventory_snapshot
    record_owner_acceptance(observation(snapshot, "hold", False), owner, db)
    held = reconcile(db)
    assert held.status == "HOLD"
    assert "LATEST_DECISION_HOLD" in held.reasons

    accepted = record_owner_acceptance(observation(snapshot), owner, db)
    current = reconcile(db)
    assert current.status == "MANUAL_REVIEW_CURRENT"
    assert current.latest_evidence_id == accepted.id
    assert current.evidence_count == 2
    assert not current.runtime_verified_automatically


def test_stale_or_incomplete_evidence_never_passes(owner_db) -> None:
    db, owner = owner_db
    snapshot = assurance(db).inventory_snapshot
    record_owner_acceptance(observation(snapshot), owner, db)
    db.add(
        CameraCompatibilityRecord(
            brand="Blink",
            model="Camera Model",
            location="Den",
            method="unverified",
            evidence="",
            revision=1,
        )
    )
    db.commit()
    stale = reconcile(db)
    assert stale.status == "HOLD"
    assert "INVENTORY_CHANGED" in stale.reasons
    assert "CAMERA_COUNT_CHANGED" in stale.reasons
