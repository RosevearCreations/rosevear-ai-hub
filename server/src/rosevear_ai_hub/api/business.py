"""Authenticated business connector catalogue API."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from rosevear_ai_hub.business_connectors import (
    DEFAULT_BUSINESS_CONNECTORS,
    BusinessConnector,
    ConnectorNotFoundError,
)

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


def _serialize(connector: BusinessConnector) -> ConnectorResponse:
    descriptor = connector.descriptor
    connector_status = connector.status()
    return ConnectorResponse(
        key=descriptor.key,
        display_name=descriptor.display_name,
        description=descriptor.description,
        planned_build=descriptor.planned_build,
        access_mode=descriptor.access_mode.value,
        writes_require_confirmation=descriptor.writes_require_confirmation,
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
def list_business_connectors() -> ConnectorListResponse:
    return ConnectorListResponse(
        framework_version="1",
        read_only_default=True,
        write_confirmation_required=True,
        connectors=[_serialize(connector) for connector in DEFAULT_BUSINESS_CONNECTORS.list()],
    )


@router.get("/connectors/{connector_key}", response_model=ConnectorResponse)
def get_business_connector(connector_key: str) -> ConnectorResponse:
    try:
        connector = DEFAULT_BUSINESS_CONNECTORS.get(connector_key)
    except ConnectorNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.safe_message,
        ) from exc
    return _serialize(connector)
