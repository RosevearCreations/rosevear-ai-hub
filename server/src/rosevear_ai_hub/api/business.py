"""Authenticated business connector catalogue and bounded read API."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from rosevear_ai_hub.business_connectors import (
    BusinessConnector,
    ConnectorAuthenticationError,
    ConnectorConfigurationError,
    ConnectorError,
    ConnectorNotFoundError,
    ConnectorRegistry,
    ConnectorResourceNotFoundError,
    ConnectorUnavailableError,
    build_business_connector_registry,
)
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.secrets import resolve_secret

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


def _registry(session: Session) -> ConnectorRegistry:
    settings = get_settings()
    try:
        credential = resolve_secret(
            session,
            "devilndove.admin_token",
            settings,
        )
    except RuntimeError:
        credential = None
    return build_business_connector_registry(
        settings=settings,
        devilndove_credential=credential,
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
