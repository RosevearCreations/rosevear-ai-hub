"""Read-only Home Assistant connection, registry, and entity browser API."""

from __future__ import annotations

import asyncio
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
    HomeAssistantAreaResponse,
    HomeAssistantBrowserEntityResponse,
    HomeAssistantBrowserResponse,
    HomeAssistantDeviceResponse,
    HomeAssistantDomainSummaryResponse,
    HomeAssistantEntitiesResponse,
    HomeAssistantEntityResponse,
    HomeAssistantStatusResponse,
)
from rosevear_ai_hub.secrets import resolve_secret

router = APIRouter(prefix="/api/v1/home-assistant", tags=["home-assistant"])

_SENSITIVE_ATTRIBUTE_MARKERS = (
    "token",
    "password",
    "secret",
    "api_key",
    "apikey",
    "authorization",
    "cookie",
    "credential",
    "private_key",
)
_REDACTED = "[REDACTED]"


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


def _optional_string(mapping: dict[str, Any], key: str) -> str | None:
    value = mapping.get(key)
    return value if isinstance(value, str) and value else None


def _entity_response(item: dict[str, Any]) -> HomeAssistantEntityResponse | None:
    entity_id = item.get("entity_id")
    state_value = item.get("state")
    if not isinstance(entity_id, str) or not entity_id or not isinstance(state_value, str):
        return None

    attributes = item.get("attributes")
    safe_attributes = attributes if isinstance(attributes, dict) else {}
    domain = entity_id.split(".", 1)[0] if "." in entity_id else "unknown"

    return HomeAssistantEntityResponse(
        entity_id=entity_id,
        domain=domain,
        state=state_value,
        friendly_name=_optional_string(safe_attributes, "friendly_name"),
        icon=_optional_string(safe_attributes, "icon"),
        unit_of_measurement=_optional_string(safe_attributes, "unit_of_measurement"),
        device_class=_optional_string(safe_attributes, "device_class"),
        last_changed=(
            item.get("last_changed") if isinstance(item.get("last_changed"), str) else None
        ),
        last_updated=(
            item.get("last_updated") if isinstance(item.get("last_updated"), str) else None
        ),
    )


def _safe_attribute_value(key: str, value: Any, depth: int = 0) -> Any:
    lowered = key.lower()
    if any(marker in lowered for marker in _SENSITIVE_ATTRIBUTE_MARKERS):
        return _REDACTED
    if depth >= 3:
        return "[TRUNCATED]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value if len(value) <= 500 else value[:497] + "..."
    if isinstance(value, list):
        return [_safe_attribute_value(key, item, depth + 1) for item in value[:20]]
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for nested_key, nested_value in list(value.items())[:30]:
            name = str(nested_key)
            result[name] = _safe_attribute_value(name, nested_value, depth + 1)
        return result
    return str(value)[:500]


def _safe_attributes(item: dict[str, Any]) -> dict[str, Any]:
    attributes = item.get("attributes")
    if not isinstance(attributes, dict):
        return {}
    result: dict[str, Any] = {}
    for key, value in list(attributes.items())[:60]:
        name = str(key)
        result[name] = _safe_attribute_value(name, value)
    return result


def _area_response(item: dict[str, Any]) -> HomeAssistantAreaResponse | None:
    area_id = item.get("area_id") or item.get("id")
    name = item.get("name")
    if not isinstance(area_id, str) or not area_id or not isinstance(name, str) or not name:
        return None
    aliases = item.get("aliases")
    return HomeAssistantAreaResponse(
        area_id=area_id,
        name=name,
        aliases=[value for value in aliases if isinstance(value, str)]
        if isinstance(aliases, list)
        else [],
        floor_id=_optional_string(item, "floor_id"),
        icon=_optional_string(item, "icon"),
    )


def _device_response(item: dict[str, Any]) -> HomeAssistantDeviceResponse | None:
    device_id = item.get("id")
    if not isinstance(device_id, str) or not device_id:
        return None
    name = _optional_string(item, "name_by_user") or _optional_string(item, "name") or device_id
    return HomeAssistantDeviceResponse(
        device_id=device_id,
        name=name,
        area_id=_optional_string(item, "area_id"),
        manufacturer=_optional_string(item, "manufacturer"),
        model=_optional_string(item, "model"),
        sw_version=_optional_string(item, "sw_version"),
        hw_version=_optional_string(item, "hw_version"),
        parent_device_id=_optional_string(item, "parent_device_id"),
    )


def _browser_entity_response(
    state_item: dict[str, Any],
    registry_item: dict[str, Any] | None,
    devices_by_id: dict[str, HomeAssistantDeviceResponse],
    area_names: dict[str, str],
) -> HomeAssistantBrowserEntityResponse | None:
    base = _entity_response(state_item)
    if base is None:
        return None

    registry = registry_item or {}
    device_id = _optional_string(registry, "device_id")
    device = devices_by_id.get(device_id) if device_id else None
    area_id = _optional_string(registry, "area_id") or (device.area_id if device else None)
    registry_name = _optional_string(registry, "name") or _optional_string(
        registry, "original_name"
    )
    registry_icon = _optional_string(registry, "icon") or _optional_string(
        registry, "original_icon"
    )

    return HomeAssistantBrowserEntityResponse(
        entity_id=base.entity_id,
        domain=base.domain,
        state=base.state,
        friendly_name=base.friendly_name or registry_name,
        area_id=area_id,
        area_name=area_names.get(area_id) if area_id else None,
        device_id=device_id,
        device_name=device.name if device else None,
        platform=_optional_string(registry, "platform"),
        icon=base.icon or registry_icon,
        unit_of_measurement=base.unit_of_measurement,
        device_class=base.device_class,
        last_changed=base.last_changed,
        last_updated=base.last_updated,
        attributes=_safe_attributes(state_item),
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
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    entities = [entity for item in items if (entity := _entity_response(item)) is not None]
    entities.sort(key=lambda item: item.entity_id)
    return HomeAssistantEntitiesResponse(count=len(entities), entities=entities)


@router.get("/browser", response_model=HomeAssistantBrowserResponse)
async def home_assistant_browser(
    runtime: HomeAssistantRuntimeDependency,
) -> HomeAssistantBrowserResponse:
    if runtime.client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_not_configured_message(runtime),
        )
    try:
        states, registry = await asyncio.gather(
            runtime.client.states(),
            runtime.client.registry_snapshot(),
        )
    except HomeAssistantError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    areas = [area for item in registry["areas"] if (area := _area_response(item)) is not None]
    areas.sort(key=lambda item: (item.name.lower(), item.area_id))
    area_names = {area.area_id: area.name for area in areas}

    devices = [
        device
        for item in registry["devices"]
        if (device := _device_response(item)) is not None
    ]
    devices.sort(key=lambda item: (item.name.lower(), item.device_id))
    devices_by_id = {device.device_id: device for device in devices}

    registry_entities = {
        item["entity_id"]: item
        for item in registry["entities"]
        if isinstance(item.get("entity_id"), str)
    }
    entities = [
        entity
        for state_item in states
        if (
            entity := _browser_entity_response(
                state_item,
                registry_entities.get(state_item.get("entity_id")),
                devices_by_id,
                area_names,
            )
        )
        is not None
    ]
    entities.sort(key=lambda item: item.entity_id)

    counts: dict[str, int] = {}
    for entity in entities:
        counts[entity.domain] = counts.get(entity.domain, 0) + 1
    domains = [
        HomeAssistantDomainSummaryResponse(domain=domain, count=count)
        for domain, count in sorted(counts.items())
    ]

    return HomeAssistantBrowserResponse(
        area_count=len(areas),
        device_count=len(devices),
        domain_count=len(domains),
        entity_count=len(entities),
        areas=areas,
        devices=devices,
        domains=domains,
        entities=entities,
    )
