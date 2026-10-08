"""Automation rule schema and persistence API for Build 026."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.automation_authoring import (
    MAX_AUTHORING_PROMPT_CHARACTERS,
    build_authoring_context,
    build_authoring_messages,
    canonical_authoring_definition,
    collect_provider_text,
    parse_authoring_output,
    validate_authoring_draft,
)
from rosevear_ai_hub.automation_history import (
    AUTOMATION_FAILURE_STATUSES,
    AUTOMATION_RUN_STATUSES,
    public_run_summary,
)
from rosevear_ai_hub.automations import (
    MAX_ACTIONS,
    MAX_CONDITIONS,
    MAX_COOLDOWN_SECONDS,
    RULE_SCHEMA_VERSION,
    RuleDefinition,
    automation_record_hash,
    canonical_rule_dict,
    validate_rule_tool_references,
)
from rosevear_ai_hub.confirmations import consume_confirmation, prepare_confirmation
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import Automation, AutomationRun, User
from rosevear_ai_hub.providers.base import ProviderRequestError, ProviderUnavailableError
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry

router = APIRouter(prefix="/api/v1/automations", tags=["automations"])
SessionDependency = Annotated[Session, Depends(get_session)]
ProviderRegistryDependency = Annotated[ProviderRegistry, Depends(get_provider_registry)]
HomeAssistantRuntimeDependency = Annotated[
    HomeAssistantRuntime,
    Depends(get_home_assistant_runtime),
]


class AutomationRuleResponse(BaseModel):
    id: int
    name: str
    enabled: bool
    definition: dict[str, Any]
    created_by: int | None
    created_at: datetime
    updated_at: datetime


class RuleValidationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    definition: RuleDefinition
    enabled: bool = False


class RuleValidationResponse(BaseModel):
    valid: bool
    schema_version: int
    normalized_definition: dict[str, Any]
    referenced_tools: list[str]


class AutomationSchemaResponse(BaseModel):
    schema_version: int
    definition_schema: dict[str, Any]
    supported_triggers: list[str]
    supported_conditions: list[str]
    supported_actions: list[str]
    limits: dict[str, int]
    execution_available: bool


class AutomationRuntimeResponse(BaseModel):
    running: bool
    queue_depth: int
    queue_capacity: int
    processed_events: int
    dropped_events: int
    failed_events: int
    home_assistant_configured: bool
    mqtt_configured: bool
    mqtt_rule_subscriptions: list[str]
    last_error: str | None = None
    recovered_interrupted_runs: int = 0




RunStatus = Literal["running", "success", "failed", "skipped", "interrupted"]


class AutomationRunResponse(BaseModel):
    id: int
    automation_id: int
    automation_name: str
    started_at: datetime
    completed_at: datetime | None
    status: RunStatus
    result_summary: dict[str, Any]
    duration_ms: int | None


class AutomationHistoryResponse(BaseModel):
    runs: list[AutomationRunResponse]
    total: int
    limit: int
    offset: int


class AutomationHistorySummaryResponse(BaseModel):
    total_runs: int
    success_count: int
    failed_count: int
    interrupted_count: int
    skipped_count: int
    running_count: int
    failure_count: int
    automations_with_failures: int
    newest_run_at: datetime | None
    latest_failure_at: datetime | None
    automatic_retry_enabled: bool = False


class AutomationAuthoringRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=3, max_length=MAX_AUTHORING_PROMPT_CHARACTERS)
    provider: str = Field(default="ollama", min_length=1, max_length=64)
    model: str = Field(min_length=1, max_length=200)


class AutomationAuthoringResponse(BaseModel):
    valid: bool
    name: str
    definition: dict[str, Any]
    explanation: str
    assumptions: list[str]
    warnings: list[str]
    referenced_tools: list[str]
    provider: str
    model: str
    recommended_enabled: bool = False


class AutomationChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation: Literal["create", "update", "delete"]
    automation_id: int | None = Field(default=None, ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    enabled: bool | None = None
    definition: RuleDefinition | None = None

    @model_validator(mode="after")
    def validate_shape(self) -> AutomationChangeRequest:
        if self.operation == "create":
            if self.automation_id is not None:
                raise ValueError("create must not include automation_id.")
            if self.name is None or self.enabled is None or self.definition is None:
                raise ValueError("create requires name, enabled, and definition.")
        elif self.operation == "update":
            if self.automation_id is None:
                raise ValueError("update requires automation_id.")
            if self.name is None or self.enabled is None or self.definition is None:
                raise ValueError("update requires name, enabled, and definition.")
        else:
            if self.automation_id is None:
                raise ValueError("delete requires automation_id.")
            if self.name is not None or self.enabled is not None or self.definition is not None:
                raise ValueError("delete accepts automation_id only.")
        return self


class AutomationConfirmationResponse(BaseModel):
    confirmation_id: str
    status: str
    arguments_hash: str
    preview: dict[str, Any]
    expires_at: datetime


class AutomationChangeResult(BaseModel):
    operation: Literal["create", "update", "delete"]
    automation: AutomationRuleResponse | None
    deleted: bool


def _response(record: Automation) -> AutomationRuleResponse:
    return AutomationRuleResponse(
        id=record.id,
        name=record.name,
        enabled=record.enabled,
        definition=dict(record.definition_json or {}),
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )




def _run_response(run: AutomationRun, automation_name: str) -> AutomationRunResponse:
    duration_ms = None
    if run.completed_at is not None:
        try:
            duration_ms = max(0, int((run.completed_at - run.started_at).total_seconds() * 1000))
        except TypeError:
            duration_ms = None
    return AutomationRunResponse(
        id=run.id,
        automation_id=run.automation_id,
        automation_name=automation_name,
        started_at=run.started_at,
        completed_at=run.completed_at,
        status=run.status,
        result_summary=public_run_summary(run.result_summary),
        duration_ms=duration_ms,
    )


def _clean_name(value: str) -> str:
    name = " ".join(value.strip().split())
    if not name:
        raise HTTPException(status_code=422, detail="Automation name cannot be blank.")
    return name


def _load_record(db: Session, automation_id: int) -> Automation:
    record = db.get(Automation, automation_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Automation not found.")
    return record


def _ensure_name_available(db: Session, *, name: str, exclude_id: int | None = None) -> None:
    row = db.scalar(select(Automation).where(Automation.name == name))
    if row is not None and row.id != exclude_id:
        raise HTTPException(status_code=409, detail="Automation name already exists.")


def _change_arguments(db: Session, payload: AutomationChangeRequest) -> dict[str, Any]:
    if payload.operation == "create":
        assert payload.name is not None and payload.enabled is not None
        assert payload.definition is not None
        name = _clean_name(payload.name)
        _ensure_name_available(db, name=name)
        try:
            validate_rule_tool_references(db, payload.definition, enabled=payload.enabled)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {
            "operation": "create",
            "automation_id": None,
            "name": name,
            "enabled": payload.enabled,
            "definition": canonical_rule_dict(payload.definition),
            "expected_current_hash": None,
        }

    assert payload.automation_id is not None
    record = _load_record(db, payload.automation_id)
    expected_hash = automation_record_hash(record)
    if payload.operation == "delete":
        return {
            "operation": "delete",
            "automation_id": record.id,
            "name": record.name,
            "enabled": record.enabled,
            "definition": dict(record.definition_json or {}),
            "expected_current_hash": expected_hash,
        }

    assert payload.name is not None and payload.enabled is not None
    assert payload.definition is not None
    name = _clean_name(payload.name)
    _ensure_name_available(db, name=name, exclude_id=record.id)
    try:
        validate_rule_tool_references(db, payload.definition, enabled=payload.enabled)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "operation": "update",
        "automation_id": record.id,
        "name": name,
        "enabled": payload.enabled,
        "definition": canonical_rule_dict(payload.definition),
        "expected_current_hash": expected_hash,
    }


@router.get("/schema", response_model=AutomationSchemaResponse)
def automation_schema() -> AutomationSchemaResponse:
    return AutomationSchemaResponse(
        schema_version=RULE_SCHEMA_VERSION,
        definition_schema=RuleDefinition.model_json_schema(),
        supported_triggers=["state_change", "state_threshold", "mqtt_message"],
        supported_conditions=["state_equals", "numeric_threshold"],
        supported_actions=["tool"],
        limits={
            "max_conditions": MAX_CONDITIONS,
            "max_actions": MAX_ACTIONS,
            "max_cooldown_seconds": MAX_COOLDOWN_SECONDS,
        },
        execution_available=True,
    )


@router.get("/runtime", response_model=AutomationRuntimeResponse)
def automation_runtime_status(request: Request) -> AutomationRuntimeResponse:
    runtime = getattr(request.app.state, "automation_event_runtime", None)
    if runtime is None:
        return AutomationRuntimeResponse(
            running=False,
            queue_depth=0,
            queue_capacity=0,
            processed_events=0,
            dropped_events=0,
            failed_events=0,
            home_assistant_configured=False,
            mqtt_configured=False,
            mqtt_rule_subscriptions=[],
            last_error="Event Engine runtime has not started.",
        )
    return AutomationRuntimeResponse(**runtime.snapshot())




@router.get("/history/summary", response_model=AutomationHistorySummaryResponse)
def automation_history_summary(db: SessionDependency) -> AutomationHistorySummaryResponse:
    counts = {key: 0 for key in AUTOMATION_RUN_STATUSES}
    for run_status, count in db.execute(
        select(AutomationRun.status, func.count(AutomationRun.id)).group_by(AutomationRun.status)
    ).all():
        if run_status in counts:
            counts[run_status] = int(count)

    newest_run_at = db.scalar(select(func.max(AutomationRun.started_at)))
    latest_failure_at = db.scalar(
        select(func.max(AutomationRun.started_at)).where(
            AutomationRun.status.in_(AUTOMATION_FAILURE_STATUSES)
        )
    )
    automations_with_failures = db.scalar(
        select(func.count(func.distinct(AutomationRun.automation_id))).where(
            AutomationRun.status.in_(AUTOMATION_FAILURE_STATUSES)
        )
    )
    return AutomationHistorySummaryResponse(
        total_runs=sum(counts.values()),
        success_count=counts["success"],
        failed_count=counts["failed"],
        interrupted_count=counts["interrupted"],
        skipped_count=counts["skipped"],
        running_count=counts["running"],
        failure_count=counts["failed"] + counts["interrupted"],
        automations_with_failures=int(automations_with_failures or 0),
        newest_run_at=newest_run_at,
        latest_failure_at=latest_failure_at,
        automatic_retry_enabled=False,
    )


@router.get("/history", response_model=AutomationHistoryResponse)
def automation_history(
    db: SessionDependency,
    automation_id: int | None = Query(default=None, ge=1),
    run_status: Annotated[RunStatus | None, Query(alias="status")] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AutomationHistoryResponse:
    conditions = []
    if automation_id is not None:
        conditions.append(AutomationRun.automation_id == automation_id)
    if run_status is not None:
        conditions.append(AutomationRun.status == run_status)

    total_query = select(func.count(AutomationRun.id))
    rows_query = (
        select(AutomationRun, Automation.name)
        .join(Automation, AutomationRun.automation_id == Automation.id)
        .order_by(AutomationRun.started_at.desc(), AutomationRun.id.desc())
        .offset(offset)
        .limit(limit)
    )
    if conditions:
        total_query = total_query.where(*conditions)
        rows_query = rows_query.where(*conditions)

    total = int(db.scalar(total_query) or 0)
    rows = db.execute(rows_query).all()
    return AutomationHistoryResponse(
        runs=[_run_response(run, name) for run, name in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/validate", response_model=RuleValidationResponse)
def validate_rule(payload: RuleValidationRequest, db: SessionDependency) -> RuleValidationResponse:
    try:
        referenced = validate_rule_tool_references(db, payload.definition, enabled=payload.enabled)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return RuleValidationResponse(
        valid=True,
        schema_version=RULE_SCHEMA_VERSION,
        normalized_definition=canonical_rule_dict(payload.definition),
        referenced_tools=referenced,
    )


@router.get("", response_model=list[AutomationRuleResponse])
def list_automations(db: SessionDependency) -> list[AutomationRuleResponse]:
    rows = db.scalars(select(Automation).order_by(Automation.name.asc(), Automation.id.asc())).all()
    return [_response(row) for row in rows]


@router.post("/author/draft", response_model=AutomationAuthoringResponse)
async def author_automation_draft(
    payload: AutomationAuthoringRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: SessionDependency,
    registry: ProviderRegistryDependency,
    home_runtime: HomeAssistantRuntimeDependency,
) -> AutomationAuthoringResponse:
    try:
        context = await build_authoring_context(db, home_runtime)
        messages = build_authoring_messages(payload.prompt, context)
        raw = await collect_provider_text(
            registry,
            payload.provider,
            payload.model,
            messages,
        )
        envelope = parse_authoring_output(raw)
        referenced, warnings = validate_authoring_draft(db, envelope, context)
    except ProviderUnavailableError as exc:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="automation.authoring.failed",
            object_type="automation_draft",
            object_id=None,
            action="draft",
            arguments={
                "provider": payload.provider,
                "model": payload.model,
                "prompt_characters": len(payload.prompt),
            },
            result={"ok": False, "error": str(exc)},
        )
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderRequestError as exc:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="automation.authoring.failed",
            object_type="automation_draft",
            object_id=None,
            action="draft",
            arguments={
                "provider": payload.provider,
                "model": payload.model,
                "prompt_characters": len(payload.prompt),
            },
            result={"ok": False, "error": str(exc)},
        )
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="automation.authoring.rejected",
            object_type="automation_draft",
            object_id=None,
            action="validate",
            arguments={
                "provider": payload.provider,
                "model": payload.model,
                "prompt_characters": len(payload.prompt),
            },
            result={"ok": False, "error": str(exc)},
        )
        db.commit()
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    definition = canonical_authoring_definition(envelope)
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="automation.authoring.drafted",
        object_type="automation_draft",
        object_id=None,
        action="draft",
        arguments={
            "provider": payload.provider,
            "model": payload.model,
            "prompt_characters": len(payload.prompt),
        },
        result={
            "ok": True,
            "schema_version": RULE_SCHEMA_VERSION,
            "referenced_tools": referenced,
            "warning_count": len(warnings),
        },
    )
    db.commit()
    return AutomationAuthoringResponse(
        valid=True,
        name=envelope.name,
        definition=definition,
        explanation=envelope.explanation,
        assumptions=envelope.assumptions,
        warnings=warnings,
        referenced_tools=referenced,
        provider=payload.provider,
        model=payload.model,
        recommended_enabled=False,
    )


@router.get("/{automation_id}", response_model=AutomationRuleResponse)
def get_automation(automation_id: int, db: SessionDependency) -> AutomationRuleResponse:
    return _response(_load_record(db, automation_id))


@router.post(
    "/confirm",
    response_model=AutomationConfirmationResponse,
    status_code=status.HTTP_201_CREATED,
)
def confirm_automation_change(
    payload: AutomationChangeRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: SessionDependency,
) -> AutomationConfirmationResponse:
    request = prepare_confirmation(
        db,
        actor=actor,
        tool_key="automation.rule.change",
        arguments=_change_arguments(db, payload),
    )
    return AutomationConfirmationResponse(
        confirmation_id=request.id,
        status=request.status,
        arguments_hash=request.arguments_hash,
        preview=dict(request.preview_json or {}),
        expires_at=request.expires_at,
    )


@router.post("/apply", response_model=AutomationChangeResult)
def apply_automation_change(
    payload: AutomationChangeRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: SessionDependency,
    confirmation_id: str = Query(min_length=36, max_length=36),
) -> AutomationChangeResult:
    arguments = _change_arguments(db, payload)
    consume_confirmation(
        db,
        confirmation_id=confirmation_id,
        actor=actor,
        tool_key="automation.rule.change",
        arguments=arguments,
    )

    record: Automation | None
    deleted = False
    if payload.operation == "create":
        record = Automation(
            name=str(arguments["name"]),
            enabled=bool(arguments["enabled"]),
            definition_json=dict(arguments["definition"]),
            created_by=actor.id,
        )
        db.add(record)
        db.flush()
    elif payload.operation == "update":
        assert payload.automation_id is not None
        record = _load_record(db, payload.automation_id)
        record.name = str(arguments["name"])
        record.enabled = bool(arguments["enabled"])
        record.definition_json = dict(arguments["definition"])
        db.flush()
    else:
        assert payload.automation_id is not None
        record = _load_record(db, payload.automation_id)
        db.delete(record)
        deleted = True

    object_id = str(payload.automation_id or (record.id if record is not None else ""))
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type=f"automation.rule.{payload.operation}d",
        object_type="automation",
        object_id=object_id,
        action=payload.operation,
        arguments={
            "name": arguments["name"],
            "enabled": arguments["enabled"],
            "schema_version": RULE_SCHEMA_VERSION,
            "expected_current_hash": arguments["expected_current_hash"],
        },
        result={"ok": True, "deleted": deleted},
        tool_key="automation.rule.change",
        risk_level=2,
        confirmation_id=confirmation_id,
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Automation name already exists.") from exc

    if deleted:
        return AutomationChangeResult(operation="delete", automation=None, deleted=True)

    assert record is not None
    db.refresh(record)
    return AutomationChangeResult(
        operation=payload.operation,
        automation=_response(record),
        deleted=False,
    )
