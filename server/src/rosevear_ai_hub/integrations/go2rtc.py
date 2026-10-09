"""Loopback-only go2rtc transport adapter for Build 032."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

from rosevear_ai_hub.config import Settings, get_settings


class Go2RTCError(RuntimeError):
    """Base sanitized go2rtc integration error."""


class Go2RTCUnavailable(Go2RTCError):
    """The local go2rtc service could not be reached."""


class Go2RTCRejected(Go2RTCError):
    """go2rtc rejected a bounded request."""


@dataclass(frozen=True)
class Go2RTCStatus:
    online: bool
    version: str | None
    api_base_url: str
    rtsp_listen: str | None
    local_api_only: bool
    local_rtsp_only: bool


@dataclass(frozen=True)
class StreamProbe:
    stream_name: str
    producer_count: int
    consumer_count: int


def _is_loopback_host(host: str | None) -> bool:
    if not host:
        return False
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def _validate_loopback_base_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "http" or not _is_loopback_host(parsed.hostname):
        raise Go2RTCError("GO2RTC_BASE_URL must use HTTP on localhost/loopback.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise Go2RTCError("GO2RTC_BASE_URL must not contain credentials, query, or fragment.")
    try:
        port = parsed.port or 1984
    except ValueError as exc:
        raise Go2RTCError("GO2RTC_BASE_URL contains an invalid port.") from exc
    if not 1 <= port <= 65535:
        raise Go2RTCError("GO2RTC_BASE_URL contains an invalid port.")
    return value.rstrip("/")


def _rtsp_listen_is_local(value: str | None) -> bool:
    if not value:
        return False
    listen = value.strip()
    return listen.startswith("127.0.0.1:") or listen.startswith("[::1]:")


class Go2RTCClient:
    """Small server-side client for the go2rtc HTTP API."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.base_url = _validate_loopback_base_url(self.settings.go2rtc_base_url)
        self.timeout = self.settings.go2rtc_timeout_seconds
        self._transport = transport

    def _request(
        self,
        method: str,
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
                response = client.request(method, path, params=params)
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
            raise Go2RTCUnavailable("Local go2rtc service is unavailable.") from exc
        if response.status_code >= 400:
            raise Go2RTCRejected(
                f"go2rtc rejected the request with status {response.status_code}."
            )
        return response

    def status(self) -> Go2RTCStatus:
        response = self._request("GET", "/api")
        try:
            payload = response.json()
        except ValueError as exc:
            raise Go2RTCRejected("go2rtc returned an invalid status response.") from exc
        if not isinstance(payload, dict):
            raise Go2RTCRejected("go2rtc returned an invalid status response.")
        rtsp = payload.get("rtsp")
        rtsp_listen = rtsp.get("listen") if isinstance(rtsp, dict) else None
        version = payload.get("version")
        return Go2RTCStatus(
            online=True,
            version=str(version) if version else None,
            api_base_url=self.base_url,
            rtsp_listen=str(rtsp_listen) if rtsp_listen else None,
            local_api_only=True,
            local_rtsp_only=_rtsp_listen_is_local(
                str(rtsp_listen) if rtsp_listen else None
            ),
        )

    def ensure_placeholder(self, stream_name: str) -> None:
        """Persist only an empty stream name, never a credential-bearing source URL."""

        self._request(
            "PUT",
            "/api/streams",
            params={"name": stream_name, "src": ""},
        )

    def patch_runtime_source(self, stream_name: str, source_url: str) -> None:
        """Set the source only in go2rtc runtime memory."""

        self._request(
            "PATCH",
            "/api/streams",
            params={"name": stream_name, "src": source_url},
        )

    def delete_stream(self, stream_name: str) -> None:
        self._request("DELETE", "/api/streams", params={"src": stream_name})

    def probe_stream(self, stream_name: str) -> StreamProbe:
        response = self._request("GET", "/api/streams", params={"src": stream_name})
        try:
            payload: Any = response.json()
        except ValueError as exc:
            raise Go2RTCRejected("go2rtc returned an invalid stream response.") from exc
        if not isinstance(payload, dict):
            raise Go2RTCRejected("go2rtc returned an invalid stream response.")
        producers = payload.get("producers")
        consumers = payload.get("consumers")
        return StreamProbe(
            stream_name=stream_name,
            producer_count=len(producers) if isinstance(producers, list) else 0,
            consumer_count=len(consumers) if isinstance(consumers, list) else 0,
        )


def get_go2rtc_client() -> Go2RTCClient:
    return Go2RTCClient()
