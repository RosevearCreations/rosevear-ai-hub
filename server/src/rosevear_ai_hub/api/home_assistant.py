"""Read-only Home Assistant connection and entity inventory API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.home_assistant import (
    HomeAssistantClient,
    HomeAssistantConfigurationError,
    HomeAssistantError,
)
from rosevear_ai_hub.schemas import (
    HomeAssistantEntitiesResponse,
    HomeAssistantEntityResponse,
    HomeAssistantStatusResponse,
)
from rosevear_ai_hub.secrets import resolve_secret

router = APIRouter(prefix="/api/v1/home-assistant", tags=["home-assistant"])


@dataclass(frozen=True)
class HomeAssistantRuntime:
    client: HomeAssistantClient | None
    base_url: str | None
    url_configured: bool
    token_configured: bool
    configuration_error: str | None = None


def get_home_assistant_runtime(
    db: Annotated[Session, Depends(get_session)],
) -> HomeAssistantRuntime:
    settings = get_settings()
    raw_url = settings.home_assistant_url.strip()
    token = resolve_secret(db, "home_assistant.token", settings)

    url_configured = bool(raw_url)
    token_configured = bool(token)
    if not url_configured or not token_configured:
        return HomeAssistantRuntime(
            client=None,
            base_url=raw_url or None,
            url_configured=url_configured,
            token_configured=token_configured,
        )

    try:
        client = HomeAssistantClient(
            raw_url,
            token or "",
            timeout_seconds=settings.home_assistant_timeout_seconds,
        )
    except HomeAssistantConfigurationError as exc:
        return HomeAssistantRuntime(
            client=None,
            base_url=raw_url,
            url_configured=True,
            token_configured=True,
            configuration_error=str(exc),
        )

    return HomeAssistantRuntime(
        client=client,
        base_url=client.base_url,
        url_configured=True,
        token_configured=True,
    )


HomeAssistantRuntimeDependency = Annotated[
    HomeAssistantRuntime,
    Depends(get_home_assistant_runtime),
]


def _not_configured_message(runtime: HomeAssistantRuntime) -> str:
    if runtime.configuration_error:
        return runtime.configuration_error
    missing: list[str] = []
    if not runtime.url_configured:
        missing.append("HOME_ASSISTANT_URL")
    if not runtime.token_configured:
        missing.append("Home Assistant token")
    return "Configure " + " and ".join(missing) + " to enable Home Assistant."


def _entity_response(item: dict[str, Any]) -> HomeAssistantEntityResponse | None:
    entity_id = item.get("entity_id")
    state_value = item.get("state")
    if not isinstance(entity_id, str) or not entity_id or not isinstance(state_value, str):
        return None

    attributes = item.get("attributes")
    safe_attributes = attributes if isinstance(attributes, dict) else {}
    domain = entity_id.split(".", 1)[0] if "." in entity_id else "unknown"

    def optional_string(key: str) -> str | None:
        value = safe_attributes.get(key)
        return value if isinstance(value, str) and value else None

    return HomeAssistantEntityResponse(
        entity_id=entity_id,
        domain=domain,
        state=state_value,
        friendly_name=optional_string("friendly_name"),
        icon=optional_string("icon"),
        unit_of_measurement=optional_string("unit_of_measurement"),
        device_class=optional_string("device_class"),
        last_changed=item.get("last_changed")
        if isinstance(item.get("last_changed"), str)
        else None,
        last_updated=item.get("last_updated")
        if isinstance(item.get("last_updated"), str)
        else None,
    )


@router.get("/status", response_model=HomeAssistantStatusResponse)
async def home_assistant_status(
    runtime: HomeAssistantRuntimeDependency,
) -> HomeAssistantStatusResponse:
    if runtime.client is None:
        return HomeAssistantStatusResponse(
            configured=False,
            available=False,
            base_url=runtime.base_url,
            url_configured=runtime.url_configured,
            token_configured=runtime.token_configured,
            message=_not_configured_message(runtime),
        )

    try:
        message = await runtime.client.health()
    except HomeAssistantError as exc:
        return HomeAssistantStatusResponse(
            configured=True,
            available=False,
            base_url=runtime.base_url,
            url_configured=True,
            token_configured=True,
            message=str(exc),
        )

    return HomeAssistantStatusResponse(
        configured=True,
        available=True,
        base_url=runtime.base_url,
        url_configured=True,
        token_configured=True,
        message=message,
    )


@router.get("/entities", response_model=HomeAssistantEntitiesResponse)
async def home_assistant_entities(
    runtime: HomeAssistantRuntimeDependency,
) -> HomeAssistantEntitiesResponse:
    if runtime.client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_not_configured_message(runtime),
        )

    try:
        items = await runtime.client.states()
    except HomeAssistantError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    entities = [entity for item in items if (entity := _entity_response(item)) is not None]
    entities.sort(key=lambda item: item.entity_id)
    return HomeAssistantEntitiesResponse(count=len(entities), entities=entities)
