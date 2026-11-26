"""Build 392: explicit local sample association, never a machine command."""

import json
import os
import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, StrictBool
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    AuditEvent,
    User,
    WorkshopEquipment,
    WorkshopGatewayReceipt370,
    WorkshopJob,
)

router = APIRouter(prefix="/api/v1/workshop-sample-392", tags=["workshop-sample392"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
EVENT = "workshop392.sample_observation_linked"


class Link392(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    job_id: int = Field(gt=0)
    expected_revision: int = Field(gt=0)
    receipt_id: int = Field(gt=0)
    device_id: str = Field(pattern=r"^[A-Za-z0-9 _.,():/-]{1,96}$")
    sample_reference: str = Field(pattern=r"^DND-[A-Z0-9-]{1,48}$")
    maker_association_confirmed: StrictBool


def _latest(db):
    collector = os.environ.get("ROSEVEAR_WORKSHOP370_COLLECTOR_ID", "")
    if not collector:
        return None
    return db.scalar(
        select(WorkshopGatewayReceipt370)
        .where(WorkshopGatewayReceipt370.collector_id == collector)
        .order_by(
            WorkshopGatewayReceipt370.observed_at_ms.desc(), WorkshopGatewayReceipt370.id.desc()
        )
        .limit(1)
    )


def _devices(row):
    if row is None or len(row.payload_json) > 13000:
        return []
    try:
        packet = json.loads(row.payload_json)
        if (
            packet["collector_id"] != row.collector_id
            or packet["observed_at_ms"] != row.observed_at_ms
            or packet["expires_at_ms"] != row.expires_at_ms
            or packet["nonce"] != row.nonce
            or packet.get("commands_sent", 0) != 0
            or packet.get("physical_devices_verified", False) is not False
        ):
            return []
        return [
            {"deviceId": d["device_id"], "label": d["label"], "status": d["presence"],
             "progressPercent": d.get("progress_percent")}
            for d in packet["devices"][:48]
            if d.get("kind") == "octoprint" and d.get("proof") == "octoprint_loopback"
        ]
    except (ValueError, TypeError, KeyError):
        return []


def _fresh(row, now):
    return bool(
        row and row.observed_at_ms <= now <= row.expires_at_ms
        and now - row.observed_at_ms <= 90000
    )


@router.get("")
def board392(_owner: Owner, db: DB, response: Response):
    response.headers["Cache-Control"] = "no-store"
    row = _latest(db)
    now = int(time.time() * 1000)
    jobs = db.scalars(
        select(WorkshopJob)
        .where(WorkshopJob.archived.is_(False), WorkshopJob.category == "3d_print")
        .order_by(WorkshopJob.id.desc()).limit(100)
    ).all()
    eligible = []
    for job in jobs:
        equipment = db.get(WorkshopEquipment, job.equipment_id) if job.equipment_id else None
        if equipment and not equipment.disabled:
            eligible.append({"jobId": job.id, "revision": job.revision, "title": job.title,
                             "stage": job.status, "progressPercent": job.progress_percent})
    events = db.scalars(
        select(AuditEvent).where(AuditEvent.event_type == EVENT)
        .order_by(AuditEvent.id.desc()).limit(100)
    ).all()
    return {
        "jobs": eligible,
        "receipt": {"receiptId": row.id, "observedAtMs": row.observed_at_ms,
                    "fresh": _fresh(row, now), "devices": _devices(row)} if row else None,
        "links": [e.sanitized_arguments for e in events],
        "source": "PREVIOUSLY_ADMITTED_SIGNED_RECEIPT_NOT_REVERIFIED",
        "physicalFitVerified": False,
        "machineControlEnabled": False,
    }


@router.post("/link", status_code=201)
def link392(body: Link392, actor: Owner, db: DB, response: Response):
    response.headers["Cache-Control"] = "no-store"
    job = db.get(WorkshopJob, body.job_id)
    if not job or job.archived or job.category != "3d_print" or not job.equipment_id:
        raise HTTPException(404, "HOLD_ELIGIBLE_SAMPLE_JOB_REQUIRED")
    equipment = db.get(WorkshopEquipment, job.equipment_id)
    if not equipment or equipment.disabled or not body.maker_association_confirmed:
        raise HTTPException(409, "HOLD_EXPLICIT_ASSOCIATION_REQUIRED")
    row = _latest(db)
    if not row or row.id != body.receipt_id or not _fresh(row, int(time.time() * 1000)):
        raise HTTPException(409, "HOLD_FRESH_ADMITTED_RECEIPT_REQUIRED")
    devices = [d for d in _devices(row) if d["deviceId"] == body.device_id]
    if len(devices) != 1:
        raise HTTPException(409, "HOLD_EXACT_DEVICE_REQUIRED")
    changed = db.execute(
        update(WorkshopJob)
        .where(WorkshopJob.id == job.id, WorkshopJob.revision == body.expected_revision)
        .values(revision=body.expected_revision + 1, updated_at=datetime.now(UTC))
    )
    if changed.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "HOLD_JOB_CHANGED")
    evidence = {
        "jobId": job.id,
        "jobRevision": body.expected_revision,
        "equipmentId": job.equipment_id,
        "sampleReference": body.sample_reference,
        "receiptId": row.id,
        "collectorId": row.collector_id,
        "deviceId": body.device_id,
        "observedAtMs": row.observed_at_ms,
        "deviceStatus": devices[0]["status"],
        "reportedProgressPercent": devices[0]["progressPercent"],
        "ownerJobStage": job.status,
        "ownerJobProgressPercent": job.progress_percent,
        "association": "OWNER_REPORTED_NOT_PHYSICAL_IDENTITY",
    }
    prior = db.scalars(
        select(AuditEvent).where(
            AuditEvent.event_type == EVENT, AuditEvent.object_id == str(job.id)
        )
        .order_by(AuditEvent.id.desc()).limit(100)
    ).all()
    if len(prior) >= 100 or any(
        isinstance(e.sanitized_arguments, dict)
        and e.sanitized_arguments.get("receiptId") == row.id
        and e.sanitized_arguments.get("deviceId") == body.device_id
        for e in prior
    ):
        db.rollback()
        raise HTTPException(409, "HOLD_DUPLICATE_OR_CAPACITY")
    record_audit_event(
        db, actor_user_id=actor.id, event_type=EVENT, object_type="workshop_job",
        object_id=str(job.id), action="associate_prior_admitted_receipt",
        arguments=evidence, result={"ok": True, "machine_commands": 0, "physical_fit": False},
    )
    db.commit()
    return {"link": evidence, "physicalFitVerified": False, "machineControlEnabled": False}
