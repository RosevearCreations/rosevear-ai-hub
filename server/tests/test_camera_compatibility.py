"""Build 074 regressions: no stream activation and revision-bound approvals."""

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_compatibility import (
    CameraPlanInput,
    approve_plan,
    create_plan,
    plan_ledger,
    safe,
    update_plan,
)
from rosevear_ai_hub.database import Base
from rosevear_ai_hub.models import CameraCompatibilityRecord, User


def test_compatibility_approval_revoked_on_edit_and_logged() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        actor = User(username="camera-owner", password_hash="not-used", role="owner")
        session.add(actor)
        session.commit()
        session.refresh(actor)
        item = create_plan(
            CameraPlanInput(brand="Blink", model="Test Model"),
            actor,
            session,
        )
        assert item.approved_at is None
        with pytest.raises(HTTPException) as error:
            approve_plan(actor, session, item.id)
        assert error.value.status_code == 422
        edited = update_plan(
            CameraPlanInput(
                brand="Blink",
                model="Test Model",
                method="alexa_only",
                evidence="Manufacturer documents Alexa integration.",
            ),
            actor,
            session,
            item.id,
        )
        assert edited.revision == 2
        approved = approve_plan(actor, session, item.id)
        assert approved.approved_by_user_id == actor.id
        assert approved.revision == 2
        with pytest.raises(HTTPException) as replay:
            approve_plan(actor, session, item.id)
        assert replay.value.status_code == 409
        update_plan(
            CameraPlanInput(brand="Blink", model="Other model"),
            actor,
            session,
            item.id,
        )
        assert session.get(CameraCompatibilityRecord, item.id).approved_at is None
        actions = [event.action for event in plan_ledger(actor, session, item.id)]
        assert actions == ["updated", "approved", "updated", "created"]


def test_credentials_and_urls_not_admitted_as_identity() -> None:
    for value in ("rtsp://192.168.1.2", "password=abc", "token=abc", ""):
        with pytest.raises(HTTPException) as error:
            safe(value)
        assert error.value.status_code == 422
