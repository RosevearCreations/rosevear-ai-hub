"""Home Assistant REST API adapter for read-only connection and inventory."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx


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


class HomeAssistantClient:
    """Minimal authenticated Home Assistant REST client."""

    def __init__(
        self,
        base_url: str,
        token: str,
        *,
        timeout_seconds: float = 5.0,
        transport: httpx.AsyncBaseTransport | None = None,
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

    async def _request_json(self, method: str, path: str) -> Any:
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json",
        }
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
