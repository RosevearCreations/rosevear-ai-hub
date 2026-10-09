"""Local-only Frigate read adapter for Build 034."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

from rosevear_ai_hub.config import Settings, get_settings


class FrigateError(RuntimeError):
    """Base sanitized Frigate integration error."""


class FrigateUnavailable(FrigateError):
    """The configured local Frigate service could not be reached."""


class FrigateRejected(FrigateError):
    """Frigate rejected or returned an invalid bounded request."""


@dataclass(frozen=True)
class FrigateStatus:
    online: bool
    version: str | None
    base_url: str
    local_only: bool


@dataclass(frozen=True)
class FrigateCamera:
    name: str
    enabled: bool
    detect_enabled: bool
    record_enabled: bool
    snapshots_enabled: bool


@dataclass(frozen=True)
class FrigateEvent:
    event_id: str
    camera: str
    label: str
    sub_label: str | None
    start_time: float
    end_time: float | None
    zones: tuple[str, ...]
    has_clip: bool
    has_snapshot: bool
    false_positive: bool
    score: float | None


def _is_loopback_host(host: str | None) -> bool:
    if not host:
        return False
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def validate_frigate_base_url(value: str) -> str:
    """Require Frigate's unauthenticated internal API to stay on loopback."""

    parsed = urlparse(value)
    if parsed.scheme != "http" or not _is_loopback_host(parsed.hostname):
        raise FrigateError("FRIGATE_BASE_URL must use HTTP on localhost/loopback.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise FrigateError("FRIGATE_BASE_URL must not contain credentials, query, or fragment.")
    try:
        port = parsed.port or 5000
    except ValueError as exc:
        raise FrigateError("FRIGATE_BASE_URL contains an invalid port.") from exc
    if not 1 <= port <= 65535:
        raise FrigateError("FRIGATE_BASE_URL contains an invalid port.")
    return value.rstrip("/")


def _safe_text(value: Any, *, max_length: int = 160) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text[:max_length]


def _safe_bool(value: Any) -> bool:
    return value is True


def _safe_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _camera_enabled(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    return payload.get("enabled", True) is not False


def _feature_enabled(payload: Any, key: str) -> bool:
    if not isinstance(payload, dict):
        return False
    feature = payload.get(key)
    return isinstance(feature, dict) and feature.get("enabled") is True


class FrigateClient:
    """Read-only server-side client for a loopback Frigate internal API."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.base_url = validate_frigate_base_url(self.settings.frigate_base_url)
        self.timeout = self.settings.frigate_timeout_seconds
        self._transport = transport

    def _request(
        self,
        path: str,
        *,
        params: dict[str, str] | None = None,
    ) -> httpx.Response:
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout,
                transport=self._transport,
            ) as client:
                response = client.get(path, params=params, headers={"Accept": "application/json"})
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
            raise FrigateUnavailable("Local Frigate service is unavailable.") from exc
        if response.status_code >= 400:
            raise FrigateRejected(
                f"Frigate rejected the request with status {response.status_code}."
            )
        return response

    def status(self) -> FrigateStatus:
        response = self._request("/api/version")
        version: str | None
        try:
            payload = response.json()
        except ValueError:
            version = _safe_text(response.text, max_length=80) or None
        else:
            if isinstance(payload, str):
                version = _safe_text(payload, max_length=80) or None
            elif isinstance(payload, dict):
                version = (
                    _safe_text(
                        payload.get("version") or payload.get("frigate_version"),
                        max_length=80,
                    )
                    or None
                )
            else:
                version = None
        return FrigateStatus(
            online=True,
            version=version,
            base_url=self.base_url,
            local_only=True,
        )

    def cameras(self) -> list[FrigateCamera]:
        response = self._request("/api/config")
        try:
            payload = response.json()
        except ValueError as exc:
            raise FrigateRejected("Frigate returned an invalid configuration response.") from exc
        if not isinstance(payload, dict):
            raise FrigateRejected("Frigate returned an invalid configuration response.")
        raw_cameras = payload.get("cameras")
        if not isinstance(raw_cameras, dict):
            return []

        cameras: list[FrigateCamera] = []
        for raw_name, raw_config in raw_cameras.items():
            name = _safe_text(raw_name)
            if not name:
                continue
            cameras.append(
                FrigateCamera(
                    name=name,
                    enabled=_camera_enabled(raw_config),
                    detect_enabled=_feature_enabled(raw_config, "detect"),
                    record_enabled=_feature_enabled(raw_config, "record"),
                    snapshots_enabled=_feature_enabled(raw_config, "snapshots"),
                )
            )
        return sorted(cameras, key=lambda item: item.name.casefold())

    def recent_events(
        self,
        *,
        limit: int,
        camera: str | None = None,
    ) -> list[FrigateEvent]:
        bounded_limit = min(max(int(limit), 1), 100)
        params = {"limit": str(bounded_limit)}
        if camera:
            params["camera"] = camera
        response = self._request("/api/events", params=params)
        try:
            payload = response.json()
        except ValueError as exc:
            raise FrigateRejected("Frigate returned an invalid events response.") from exc
        if not isinstance(payload, list):
            raise FrigateRejected("Frigate returned an invalid events response.")

        events: list[FrigateEvent] = []
        for item in payload[:bounded_limit]:
            if not isinstance(item, dict):
                continue
            event_id = _safe_text(item.get("id"), max_length=128)
            event_camera = _safe_text(item.get("camera"))
            label = _safe_text(item.get("label"))
            start_time = _safe_float(item.get("start_time"))
            if not event_id or not event_camera or not label or start_time is None:
                continue

            raw_zones = item.get("zones")
            zones = (
                tuple(_safe_text(zone) for zone in raw_zones if _safe_text(zone))
                if isinstance(raw_zones, list)
                else ()
            )
            data = item.get("data")
            score = _safe_float(data.get("score")) if isinstance(data, dict) else None
            sub_label = item.get("sub_label")
            if isinstance(sub_label, list):
                sub_label = sub_label[0] if sub_label else None
            normalized_sub_label = _safe_text(sub_label) or None
            events.append(
                FrigateEvent(
                    event_id=event_id,
                    camera=event_camera,
                    label=label,
                    sub_label=normalized_sub_label,
                    start_time=start_time,
                    end_time=_safe_float(item.get("end_time")),
                    zones=zones[:32],
                    has_clip=_safe_bool(item.get("has_clip")),
                    has_snapshot=_safe_bool(item.get("has_snapshot")),
                    false_positive=_safe_bool(item.get("false_positive")),
                    score=score,
                )
            )
        return events


def get_frigate_client() -> FrigateClient:
    return FrigateClient()
