"""Home Assistant REST/WebSocket adapter for read-only discovery."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx
from websockets.asyncio.client import connect as websockets_connect
from websockets.exceptions import WebSocketException


class HomeAssistantError(RuntimeError):
    """Base error for Home Assistant connector failures."""


class HomeAssistantConfigurationError(HomeAssistantError):
    """Raised when the configured Home Assistant URL is unsafe or incomplete."""


class HomeAssistantUnavailableError(HomeAssistantError):
    """Raised when Home Assistant cannot be reached."""


class HomeAssistantTimeoutError(HomeAssistantError):
    """Raised when Home Assistant does not respond within the configured timeout."""


class HomeAssistantAuthenticationError(HomeAssistantError):
    """Raised when Home Assistant rejects the configured token."""


class HomeAssistantRequestError(HomeAssistantError):
    """Raised when Home Assistant returns an unusable response."""


WebSocketConnect = Callable[..., Any]


class HomeAssistantClient:
    """Authenticated read-only Home Assistant client."""

    def __init__(
        self,
        base_url: str,
        token: str,
        *,
        timeout_seconds: float = 5.0,
        transport: httpx.AsyncBaseTransport | None = None,
        websocket_connect: WebSocketConnect | None = None,
    ) -> None:
        normalized = base_url.strip().rstrip("/")
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise HomeAssistantConfigurationError(
                "HOME_ASSISTANT_URL must be a valid http:// or https:// URL."
            )
        if not token:
            raise HomeAssistantConfigurationError("Home Assistant token is not configured.")

        self.base_url = normalized
        self._token = token
        self.timeout_seconds = timeout_seconds
        self.transport = transport
        self._websocket_connect = websocket_connect or websockets_connect

    @property
    def websocket_url(self) -> str:
        parsed = urlparse(self.base_url)
        websocket_path = parsed.path.rstrip("/") + "/api/websocket"
        return urlunparse(
            (
                "wss" if parsed.scheme == "https" else "ws",
                parsed.netloc,
                websocket_path,
                "",
                "",
                "",
            )
        )

    async def health(self) -> str:
        payload = await self._request_json("GET", "/api/")
        if not isinstance(payload, dict):
            raise HomeAssistantRequestError("Home Assistant health response was incomplete.")
        message = payload.get("message")
        if not isinstance(message, str) or not message:
            raise HomeAssistantRequestError("Home Assistant health response was incomplete.")
        return message

    async def states(self) -> list[dict[str, Any]]:
        payload = await self._request_json("GET", "/api/states")
        if not isinstance(payload, list):
            raise HomeAssistantRequestError("Home Assistant entity inventory was incomplete.")
        return [item for item in payload if isinstance(item, dict)]

    async def registry_snapshot(self) -> dict[str, list[dict[str, Any]]]:
        command_types = (
            "config/area_registry/list",
            "config/device_registry/list",
            "config/entity_registry/list",
        )
        results = await self._websocket_commands(command_types)
        return {
            "areas": results[command_types[0]],
            "devices": results[command_types[1]],
            "entities": results[command_types[2]],
        }

    async def _request_json(self, method: str, path: str) -> Any:
        headers = {"Authorization": f"Bearer {self._token}", "Accept": "application/json"}
        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self.transport,
                headers=headers,
            ) as client:
                response = await client.request(method, path)
                if response.status_code in {401, 403}:
                    raise HomeAssistantAuthenticationError(
                        "Home Assistant rejected the configured access token."
                    )
                response.raise_for_status()
        except HomeAssistantAuthenticationError:
            raise
        except httpx.TimeoutException as exc:
            raise HomeAssistantTimeoutError(
                f"Home Assistant timed out after {self.timeout_seconds:g} seconds."
            ) from exc
        except httpx.RequestError as exc:
            raise HomeAssistantUnavailableError(
                f"Unable to reach Home Assistant at {self.base_url}."
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HomeAssistantRequestError(
                f"Home Assistant returned HTTP {exc.response.status_code}."
            ) from exc

        try:
            return response.json()
        except ValueError as exc:
            raise HomeAssistantRequestError("Home Assistant returned invalid JSON.") from exc

    async def _websocket_commands(
        self,
        command_types: tuple[str, ...],
    ) -> dict[str, list[dict[str, Any]]]:
        try:
            async with self._websocket_connect(
                self.websocket_url,
                open_timeout=self.timeout_seconds,
                close_timeout=self.timeout_seconds,
            ) as websocket:
                hello = await self._recv_websocket_json(websocket)
                if hello.get("type") != "auth_required":
                    raise HomeAssistantRequestError(
                        "Home Assistant WebSocket authentication handshake was incomplete."
                    )

                await websocket.send(json.dumps({"type": "auth", "access_token": self._token}))
                auth = await self._recv_websocket_json(websocket)
                if auth.get("type") == "auth_invalid":
                    raise HomeAssistantAuthenticationError(
                        "Home Assistant rejected the configured access token."
                    )
                if auth.get("type") != "auth_ok":
                    raise HomeAssistantRequestError(
                        "Home Assistant WebSocket authentication handshake was incomplete."
                    )

                results: dict[str, list[dict[str, Any]]] = {}
                for command_id, command_type in enumerate(command_types, start=1):
                    await websocket.send(json.dumps({"id": command_id, "type": command_type}))
                    response = await self._recv_matching_result(websocket, command_id)
                    if not response.get("success"):
                        error = response.get("error")
                        code = error.get("code") if isinstance(error, dict) else None
                        suffix = f" ({code})" if isinstance(code, str) and code else ""
                        raise HomeAssistantRequestError(
                            f"Home Assistant registry request failed{suffix}."
                        )
                    payload = response.get("result")
                    if not isinstance(payload, list):
                        raise HomeAssistantRequestError(
                            "Home Assistant registry response was incomplete."
                        )
                    results[command_type] = [
                        item for item in payload if isinstance(item, dict)
                    ]
                return results
        except HomeAssistantError:
            raise
        except TimeoutError as exc:
            raise HomeAssistantTimeoutError(
                f"Home Assistant timed out after {self.timeout_seconds:g} seconds."
            ) from exc
        except (OSError, WebSocketException) as exc:
            raise HomeAssistantUnavailableError(
                f"Unable to reach Home Assistant at {self.base_url}."
            ) from exc

    async def _recv_matching_result(self, websocket: Any, command_id: int) -> dict[str, Any]:
        for _ in range(10):
            payload = await self._recv_websocket_json(websocket)
            if payload.get("type") == "result" and payload.get("id") == command_id:
                return payload
        raise HomeAssistantRequestError("Home Assistant registry response could not be correlated.")

    async def _recv_websocket_json(self, websocket: Any) -> dict[str, Any]:
        try:
            raw = await asyncio.wait_for(websocket.recv(), timeout=self.timeout_seconds)
        except TimeoutError as exc:
            raise HomeAssistantTimeoutError(
                f"Home Assistant timed out after {self.timeout_seconds:g} seconds."
            ) from exc
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", errors="replace")
        if not isinstance(raw, str):
            raise HomeAssistantRequestError("Home Assistant WebSocket response was invalid.")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HomeAssistantRequestError(
                "Home Assistant WebSocket response was invalid JSON."
            ) from exc
        if not isinstance(payload, dict):
            raise HomeAssistantRequestError("Home Assistant WebSocket response was invalid.")
        return payload
