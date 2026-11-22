"""Build 376 — safe orchestration plans and offline-only deterministic simulation.

This router NEVER dispatches a tool, Home Assistant action, MQTT message or
provider request. External app telemetry is a runtime observation, not Git
source divergence or a rule-authorizing commit.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.automations import automation_record_hash, normalize_rule_definition
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    Automation,
    AutomationSequence376,
    AutomationSequenceSimulation376,
    User,
)

router = APIRouter(prefix="/api/v1/automation-sequencing-376", tags=["automation-sequencing"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
SOURCE = Literal["home_assistant", "mqtt", "frigate", "external_app"]
MAX_STEPS = 12
MAX_PLANS = 100
MAX_ATTEMPTS = 500
CAUSE = re.compile(r"^[A-Za-z0-9_.:-]{1,80}$")


class Step(BaseModel):
    model_config = ConfigDict(extra="forbid")
    automation_id: int = Field(gt=0)
    depends_on: list[int] = Field(default_factory=list, max_length=MAX_STEPS)


class PlanIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=3, max_length=120)
    steps: list[Step] = Field(min_length=1, max_length=MAX_STEPS)
    cooldown_seconds: int = Field(default=60, ge=30, le=86400)
    expected_revision: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def check_graph(self) -> PlanIn:
        if self.title != self.title.strip() or any(ord(c) < 32 for c in self.title):
            raise ValueError("Use a short printable title.")
        calculate_order(self.steps)
        return self


class ApprovalIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    expected_source_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    owner_confirmed: bool = False


class SimulationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cause_id: str = Field(min_length=1, max_length=80)
    unavailable_sources: list[SOURCE] = Field(default_factory=list, max_length=4)
    expected_revision: int = Field(ge=1)

    @model_validator(mode="after")
    def check_cause(self) -> SimulationIn:
        if not CAUSE.fullmatch(self.cause_id):
            raise ValueError("Use an opaque, non-secret cause identifier.")
        if len(set(self.unavailable_sources)) != len(self.unavailable_sources):
            raise ValueError("Unavailable source values must be distinct.")
        return self


def calculate_order(steps: list[Step]) -> list[int]:
    """Stable topological ordering; reject cycles, missing edges and duplicates."""
    items = {s.automation_id: s for s in steps}
    if len(items) != len(steps):
        raise ValueError("Each automation may occur only once.")
    for item in steps:
        if (
            len(item.depends_on) != len(set(item.depends_on))
            or item.automation_id in item.depends_on
            or any(parent not in items for parent in item.depends_on)
        ):
            raise ValueError("Dependencies must reference distinct other steps.")
    ordered: list[int] = []
    visiting: set[int] = set()
    visited: set[int] = set()

    def visit(current: int) -> None:
        if current in visiting:
            raise ValueError("Dependency cycle is not allowed.")
        if current in visited:
            return
        visiting.add(current)
        for dep in sorted(items[current].depends_on):
            visit(dep)
        visiting.remove(current)
        visited.add(current)
        ordered.append(current)

    for identity in sorted(items):
        visit(identity)
    return ordered


def _source_snapshot(db: Session, steps: list[Step]) -> tuple[str, list[dict]]:
    ids = [step.automation_id for step in steps]
    rows = db.scalars(select(Automation).where(Automation.id.in_(ids))).all()
    records = {row.id: row for row in rows}
    if len(records) != len(ids):
        raise HTTPException(status_code=409, detail="HOLD_MISSING_AUTOMATION")
    sanitized: list[dict] = []
    for id_ in calculate_order(steps):
        row = records[id_]
        try:
            rule = normalize_rule_definition(dict(row.definition_json or {}))
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=409, detail="HOLD_INVALID_SOURCE_RULE") from exc
        keys = sorted({action.tool_key for action in rule.actions})
        # Never return action argument values. Source tool categories are only
        # an informational preview; nothing here grants executor permissions.
        sanitized.append(
            {
                "automationId": row.id,
                "name": row.name[:120],
                "enabled": row.enabled,
                "triggerType": rule.trigger.type,
                "toolKeys": keys,
                "sourceHash": automation_record_hash(row),
            }
        )
    digest = hashlib.sha256(
        json.dumps(
            [(r["automationId"], r["sourceHash"]) for r in sanitized],
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return digest, sanitized


def _steps(row: AutomationSequence376) -> list[Step]:
    return [Step.model_validate(item) for item in row.steps_json]


def _row(db: Session, plan_id: int, actor: User) -> AutomationSequence376:
    item = db.get(AutomationSequence376, plan_id)
    if item is None or item.owner_id != actor.id:
        raise HTTPException(status_code=404, detail="Owner plan not found.")
    return item


def _public(row: AutomationSequence376) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "steps": row.steps_json,
        "cooldownSeconds": row.cooldown_seconds,
        "revision": row.revision,
        "sourceHash": row.source_hash,
        "approvedHash": row.approved_hash,
        "approvedAt": row.approved_at.isoformat() if row.approved_at else None,
        "mode": "SIMULATION_ONLY_NO_ACTIONS",
        "executionEnabled": False,
    }


def _evaluate(db: Session, plan: AutomationSequence376) -> dict:
    try:
        digest, rules = _source_snapshot(db, _steps(plan))
    except HTTPException as exc:
        return {
            "state": exc.detail,
            "sourceHash": None,
            "orderedRules": [],
            "readyForSimulation": False,
            "blockers": [exc.detail],
        }
    blockers = []
    if digest != plan.source_hash:
        blockers.append("HOLD_SOURCE_RULE_REVISION_CHANGED")
    if plan.approved_hash != digest:
        blockers.append("HOLD_OWNER_APPROVAL_REQUIRED")
    if any(not rule["enabled"] for rule in rules):
        blockers.append("HOLD_DISABLED_RULE")
    if any("home_assistant.scene.activate" in rule["toolKeys"] for rule in rules):
        blockers.append("HOLD_OPAQUE_SCENE_ACTION")
    if any("home_assistant.switch.set" in rule["toolKeys"] for rule in rules):
        blockers.append("HOLD_POTENTIAL_MACHINE_SWITCH")
    return {
        "state": "REVIEWED_DRY_RUN_READY" if not blockers else "HOLD",
        "sourceHash": digest,
        "orderedRules": rules,
        "readyForSimulation": not blockers,
        "blockers": blockers,
    }


@router.get("/plans")
def list_plans(actor: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    rows = db.scalars(
        select(AutomationSequence376)
        .where(AutomationSequence376.owner_id == actor.id)
        .order_by(AutomationSequence376.id.asc())
        .limit(MAX_PLANS)
    ).all()
    return {"plans": [_public(row) for row in rows], "executorConnected": False}


@router.post("/plans", status_code=201)
def create_plan(payload: PlanIn, actor: Owner, db: DB) -> dict:
    if payload.expected_revision != 0:
        raise HTTPException(status_code=422, detail="New plans must start at revision zero.")
    existing = db.scalars(
        select(AutomationSequence376.id)
        .where(AutomationSequence376.owner_id == actor.id)
        .limit(MAX_PLANS)
    ).all()
    if len(existing) >= MAX_PLANS:
        raise HTTPException(status_code=409, detail="Owner plan capacity reached.")
    digest, _ = _source_snapshot(db, payload.steps)
    row = AutomationSequence376(
        owner_id=actor.id,
        title=payload.title,
        steps_json=[s.model_dump() for s in payload.steps],
        cooldown_seconds=payload.cooldown_seconds,
        source_hash=digest,
        revision=1,
        approved_hash=None,
    )
    db.add(row)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="automation376.sequence.created",
        object_type="automation_sequence_plan",
        object_id=str(row.id),
        action="draft_only",
        arguments={"steps": len(payload.steps), "revision": 1},
        result={"device_actions": 0, "external_app_source_mutations": 0},
    )
    db.commit()
    return _public(row)


@router.put("/plans/{plan_id}")
def update_plan(payload: PlanIn, actor: Owner, db: DB, plan_id: int = Path(gt=0)) -> dict:
    row = _row(db, plan_id, actor)
    if row.revision != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Plan changed; reload first.")
    digest, _ = _source_snapshot(db, payload.steps)
    row.title = payload.title
    row.steps_json = [s.model_dump() for s in payload.steps]
    row.cooldown_seconds = payload.cooldown_seconds
    row.source_hash = digest
    row.approved_hash = None
    row.approved_at = None
    row.revision += 1
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="automation376.sequence.updated",
        object_type="automation_sequence_plan",
        object_id=str(row.id),
        action="invalidate_prior_approval",
        arguments={"revision": row.revision},
        result={"device_actions": 0},
    )
    db.commit()
    return _public(row)


@router.get("/plans/{plan_id}/preview")
def preview(actor: Owner, db: DB, plan_id: int = Path(gt=0)) -> dict:
    row = _row(db, plan_id, actor)
    assessment = _evaluate(db, row)
    return {
        "schema": "rosevear.hub.automation-sequence.v376",
        "plan": _public(row),
        **assessment,
        "order": calculate_order(_steps(row)),
        "sourceVersionPinned": assessment["sourceHash"] == row.source_hash,
        "manualApprovalIsNotExecutionPermission": True,
        "physicalActionsAllowed": False,
        "externalAppMessagesAreRuntimeObservationsNotGitCommits": True,
    }


@router.put("/plans/{plan_id}/approve")
def approve(
    payload: ApprovalIn,
    actor: Owner,
    db: DB,
    plan_id: int = Path(gt=0),
) -> dict:
    row = _row(db, plan_id, actor)
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Explicit owner approval required.")
    if row.revision != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Plan revision changed.")
    current = _evaluate(db, row)
    if current["sourceHash"] != payload.expected_source_hash:
        raise HTTPException(status_code=409, detail="Source rule changed since preview.")
    # Do not approve a changed source graph or disabled/unsafe source.
    blockers = [item for item in current["blockers"] if item != "HOLD_OWNER_APPROVAL_REQUIRED"]
    if blockers:
        raise HTTPException(status_code=409, detail="Source not safe for dry-run approval.")
    row.approved_hash = current["sourceHash"]
    row.approved_at = datetime.now(UTC)
    row.revision += 1
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="automation376.sequence.approved_for_simulation",
        object_type="automation_sequence_plan",
        object_id=str(row.id),
        action="simulation_only",
        arguments={"revision": row.revision, "rule_count": len(_steps(row))},
        result={"executor_connected": False, "device_actions": 0},
    )
    db.commit()
    return _public(row)


@router.post("/plans/{plan_id}/simulate")
def simulate(
    payload: SimulationIn,
    actor: Owner,
    db: DB,
    plan_id: int = Path(gt=0),
) -> dict:
    row = _row(db, plan_id, actor)
    if row.revision != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Plan revision changed.")
    digest = hashlib.sha256(payload.cause_id.encode("ascii")).hexdigest()
    existing = db.scalar(
        select(AutomationSequenceSimulation376).where(
            AutomationSequenceSimulation376.plan_id == row.id,
            AutomationSequenceSimulation376.cause_sha256 == digest,
        )
    )
    if existing is not None:
        return {
            "state": "REPLAY_HELD",
            "reason": "Cause previously simulated; no additional work.",
            "causeSha256": digest,
            "deviceActions": 0,
            "providerWrites": 0,
        }
    checked = _evaluate(db, row)
    reasons = list(checked["blockers"])
    if payload.unavailable_sources:
        reasons.append("HOLD_SIMULATED_PROVIDER_UNAVAILABLE")
    now = datetime.now(UTC)
    last = db.scalar(
        select(AutomationSequenceSimulation376)
        .where(
            AutomationSequenceSimulation376.plan_id == row.id,
            AutomationSequenceSimulation376.outcome == "SIMULATED_ONLY",
        )
        .order_by(AutomationSequenceSimulation376.id.desc())
        .limit(1)
    )
    if last is not None:
        prior = last.checked_at
        if prior.tzinfo is None:
            prior = prior.replace(tzinfo=UTC)
        if (now - prior).total_seconds() < row.cooldown_seconds:
            reasons.append("HOLD_COOLDOWN")
    prior_count = db.scalars(
        select(AutomationSequenceSimulation376.id)
        .where(AutomationSequenceSimulation376.plan_id == row.id)
        .limit(MAX_ATTEMPTS)
    ).all()
    if len(prior_count) >= MAX_ATTEMPTS:
        raise HTTPException(status_code=409, detail="Simulation receipt capacity reached.")
    outcome = "HELD" if reasons else "SIMULATED_ONLY"
    attempt = AutomationSequenceSimulation376(
        plan_id=row.id,
        cause_sha256=digest,
        checked_at=now,
        outcome=outcome,
        blocker_count=len(reasons),
    )
    db.add(attempt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return {
            "state": "REPLAY_HELD",
            "reason": "Cause already recorded.",
            "causeSha256": digest,
            "deviceActions": 0,
            "providerWrites": 0,
        }
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="automation376.sequence.simulated",
        object_type="automation_sequence_plan",
        object_id=str(row.id),
        action=outcome.lower(),
        arguments={"cause_sha256": digest, "steps": len(_steps(row))},
        result={"blockers": len(reasons), "device_actions": 0},
    )
    db.commit()
    return {
        "state": outcome,
        "reasonCodes": reasons,
        "order": calculate_order(_steps(row)) if not reasons else [],
        "causeSha256": digest,
        "simulatedUnavailableSources": payload.unavailable_sources,
        "externalSourceStateVerified": False,
        "deviceActions": 0,
        "providerWrites": 0,
        "noAutonomousRecoveryOrRetries": True,
    }
