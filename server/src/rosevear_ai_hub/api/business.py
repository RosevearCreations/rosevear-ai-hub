"""Authenticated business connector reads plus exact confirmed Build 040 writes."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.business_connectors import (
    BusinessConnector,
    ConnectorAuthenticationError,
    ConnectorConfigurationError,
    ConnectorError,
    ConnectorNotFoundError,
    ConnectorOperationNotFoundError,
    ConnectorRegistry,
    ConnectorResourceNotFoundError,
    ConnectorUnavailableError,
    ConnectorWriteBlockedError,
    build_business_connector_registry,
)
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.confirmations import consume_confirmation
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User
from rosevear_ai_hub.secrets import resolve_secret
from rosevear_ai_hub.tool_registry import ToolRiskLevel

router = APIRouter(prefix="/api/v1/business", tags=["business"])


class ConnectorCapabilityResponse(BaseModel):
    key: str
    label: str
    description: str
    access: str


class ConnectorStatusResponse(BaseModel):
    state: str
    configured: bool
    available: bool
    message: str
    retryable: bool


class ConnectorResponse(BaseModel):
    key: str
    display_name: str
    description: str
    planned_build: int
    access_mode: str
    writes_require_confirmation: bool
    capabilities: list[ConnectorCapabilityResponse]
    status: ConnectorStatusResponse


class ConnectorListResponse(BaseModel):
    framework_version: str
    read_only_default: bool
    write_confirmation_required: bool
    connectors: list[ConnectorResponse]


class ConnectorReadResponse(BaseModel):
    connector_key: str
    resource: str
    records: list[dict[str, Any]]
    next_cursor: str | None


class ConnectorWriteRequest(BaseModel):
    confirmation_id: str = Field(min_length=1, max_length=80)
    arguments: dict[str, Any]


class ConnectorWriteResponse(BaseModel):
    connector_key: str
    operation: str
    confirmation_id: str
    result: dict[str, Any]


_WRITE_TOOL_KEYS: dict[tuple[str, str], str] = {
    ("devilndove", "story_draft"): "business.devilndove.story_draft.create",
    ("yardworkers", "job_comment"): "business.yardworkers.job_comment.create",
}


def _registry(session: Session) -> ConnectorRegistry:
    settings = get_settings()
    try:
        devilndove_credential = resolve_secret(
            session,
            "devilndove.admin_token",
            settings,
        )
    except RuntimeError:
        devilndove_credential = None
    try:
        rosiedazzlers_credential = resolve_secret(
            session,
            "rosiedazzlers.staff_session_token",
            settings,
        )
    except RuntimeError:
        rosiedazzlers_credential = None
    try:
        yardworkers_access_token = resolve_secret(
            session,
            "yardworkers.access_token",
            settings,
        )
    except RuntimeError:
        yardworkers_access_token = None
    try:
        yardworkers_anon_key = resolve_secret(
            session,
            "yardworkers.anon_key",
            settings,
        )
    except RuntimeError:
        yardworkers_anon_key = None
    return build_business_connector_registry(
        settings=settings,
        devilndove_credential=devilndove_credential,
        rosiedazzlers_credential=rosiedazzlers_credential,
        yardworkers_access_token=yardworkers_access_token,
        yardworkers_anon_key=yardworkers_anon_key,
    )


def _serialize(
    connector: BusinessConnector,
) -> ConnectorResponse:
    descriptor = connector.descriptor
    connector_status = connector.status()
    return ConnectorResponse(
        key=descriptor.key,
        display_name=descriptor.display_name,
        description=descriptor.description,
        planned_build=descriptor.planned_build,
        access_mode=descriptor.access_mode.value,
        writes_require_confirmation=(descriptor.writes_require_confirmation),
        capabilities=[
            ConnectorCapabilityResponse(
                key=capability.key,
                label=capability.label,
                description=capability.description,
                access=capability.access.value,
            )
            for capability in descriptor.capabilities
        ],
        status=ConnectorStatusResponse(
            state=connector_status.state.value,
            configured=connector_status.configured,
            available=connector_status.available,
            message=connector_status.message,
            retryable=connector_status.retryable,
        ),
    )


@router.get("/connectors", response_model=ConnectorListResponse)
def list_business_connectors(
    session: Annotated[Session, Depends(get_session)],
) -> ConnectorListResponse:
    registry = _registry(session)
    return ConnectorListResponse(
        framework_version="1",
        read_only_default=True,
        write_confirmation_required=True,
        connectors=[_serialize(connector) for connector in registry.list()],
    )


@router.get(
    "/connectors/{connector_key}",
    response_model=ConnectorResponse,
)
def get_business_connector(
    connector_key: str,
    session: Annotated[Session, Depends(get_session)],
) -> ConnectorResponse:
    registry = _registry(session)
    try:
        connector = registry.get(connector_key)
    except ConnectorNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.safe_message,
        ) from exc
    return _serialize(connector)


@router.get(
    "/connectors/{connector_key}/read/{resource}",
    response_model=ConnectorReadResponse,
)
def read_business_connector(
    connector_key: str,
    resource: str,
    session: Annotated[Session, Depends(get_session)],
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=128),
) -> ConnectorReadResponse:
    registry = _registry(session)
    try:
        connector = registry.get(connector_key)
        result = connector.read(
            resource,
            cursor=cursor,
            limit=limit,
        )
    except (
        ConnectorNotFoundError,
        ConnectorResourceNotFoundError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.safe_message,
        ) from exc
    except (
        ConnectorConfigurationError,
        ConnectorAuthenticationError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.safe_message,
        ) from exc
    except ConnectorUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.safe_message,
        ) from exc
    except ConnectorError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=exc.safe_message,
        ) from exc

    return ConnectorReadResponse(
        connector_key=connector_key,
        resource=result.resource,
        records=list(result.records),
        next_cursor=result.next_cursor,
    )


@router.post(
    "/connectors/{connector_key}/write/{operation}",
    response_model=ConnectorWriteResponse,
)
def write_business_connector(
    connector_key: str,
    operation: str,
    payload: ConnectorWriteRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    session: Annotated[Session, Depends(get_session)],
) -> ConnectorWriteResponse:
    """Execute one exact confirmed business write with no automatic retry."""

    normalized_connector = connector_key.strip().lower()
    normalized_operation = operation.strip().lower()
    tool_key = _WRITE_TOOL_KEYS.get((normalized_connector, normalized_operation))
    if tool_key is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This business write operation is not approved by Build 040.",
        )

    registry = _registry(session)
    try:
        connector = registry.get(normalized_connector)
    except ConnectorNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.safe_message,
        ) from exc

    # External systems cannot participate in the Hub database transaction. Consume and commit the
    # exact approval before the outbound mutation so a timeout or ambiguous provider result cannot
    # be replayed automatically.
    consume_confirmation(
        session,
        confirmation_id=payload.confirmation_id,
        actor=actor,
        tool_key=tool_key,
        arguments=payload.arguments,
    )
    session.commit()

    try:
        write_result = connector.write(normalized_operation, payload.arguments)
    except (ConnectorOperationNotFoundError, ConnectorWriteBlockedError) as exc:
        record_audit_event(
            session,
            actor_user_id=actor.id,
            event_type="business.write.blocked",
            object_type="business_connector",
            object_id=normalized_connector,
            action=normalized_operation,
            arguments=payload.arguments,
            result={"ok": False, "message": exc.safe_message},
            tool_key=tool_key,
            risk_level=int(ToolRiskLevel.CONFIRMATION_REQUIRED),
            confirmation_id=payload.confirmation_id,
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.safe_message,
        ) from exc
    except (ConnectorConfigurationError, ConnectorAuthenticationError) as exc:
        record_audit_event(
            session,
            actor_user_id=actor.id,
            event_type="business.write.failed",
            object_type="business_connector",
            object_id=normalized_connector,
            action=normalized_operation,
            arguments=payload.arguments,
            result={"ok": False, "message": exc.safe_message, "retry": "manual_new_confirmation"},
            tool_key=tool_key,
            risk_level=int(ToolRiskLevel.CONFIRMATION_REQUIRED),
            confirmation_id=payload.confirmation_id,
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.safe_message,
        ) from exc
    except ConnectorUnavailableError as exc:
        record_audit_event(
            session,
            actor_user_id=actor.id,
            event_type="business.write.uncertain",
            object_type="business_connector",
            object_id=normalized_connector,
            action=normalized_operation,
            arguments=payload.arguments,
            result={"ok": False, "message": exc.safe_message, "retry": "manual_new_confirmation"},
            tool_key=tool_key,
            risk_level=int(ToolRiskLevel.CONFIRMATION_REQUIRED),
            confirmation_id=payload.confirmation_id,
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"{exc.safe_message} The confirmation was consumed; inspect the source system "
                "before preparing a new confirmation."
            ),
        ) from exc
    except ConnectorError as exc:
        record_audit_event(
            session,
            actor_user_id=actor.id,
            event_type="business.write.failed",
            object_type="business_connector",
            object_id=normalized_connector,
            action=normalized_operation,
            arguments=payload.arguments,
            result={"ok": False, "message": exc.safe_message, "retry": "manual_new_confirmation"},
            tool_key=tool_key,
            risk_level=int(ToolRiskLevel.CONFIRMATION_REQUIRED),
            confirmation_id=payload.confirmation_id,
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"{exc.safe_message} The confirmation was consumed; prepare a new confirmation "
                "only after reviewing the source system."
            ),
        ) from exc

    record_audit_event(
        session,
        actor_user_id=actor.id,
        event_type="business.write.completed",
        object_type="business_connector",
        object_id=normalized_connector,
        action=write_result.operation,
        arguments=payload.arguments,
        result={"ok": True, **write_result.result},
        tool_key=tool_key,
        risk_level=int(ToolRiskLevel.CONFIRMATION_REQUIRED),
        confirmation_id=payload.confirmation_id,
    )
    session.commit()
    return ConnectorWriteResponse(
        connector_key=normalized_connector,
        operation=write_result.operation,
        confirmation_id=payload.confirmation_id,
        result=write_result.result,
    )
