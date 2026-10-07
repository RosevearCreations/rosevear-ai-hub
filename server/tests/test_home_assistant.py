import json

import httpx
import pytest

from rosevear_ai_hub.integrations.home_assistant import (
    HomeAssistantAuthenticationError,
    HomeAssistantClient,
    HomeAssistantTimeoutError,
    HomeAssistantUnavailableError,
)


def home_assistant_transport(request: httpx.Request) -> httpx.Response:
    assert request.headers["authorization"] == "Bearer test-token"
    if request.url.path == "/api/":
        return httpx.Response(200, json={"message": "API running."})
    if request.url.path == "/api/states":
        return httpx.Response(200, json=[{"entity_id": "light.workshop", "state": "on", "attributes": {"friendly_name": "Workshop light"}}])
    return httpx.Response(404)


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: list[dict[str, object]] = []
        self.messages = iter([
            {"type": "auth_required", "ha_version": "2026.10.0"},
            {"type": "auth_ok", "ha_version": "2026.10.0"},
            {"id": 1, "type": "result", "success": True, "result": [{"area_id": "workshop", "name": "Workshop"}]},
            {"id": 2, "type": "result", "success": True, "result": [{"id": "device-1", "name": "Workshop light"}]},
            {"id": 3, "type": "result", "success": True, "result": [{"entity_id": "light.workshop", "device_id": "device-1", "area_id": "workshop", "platform": "demo"}]},
        ])

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def recv(self) -> str:
        return json.dumps(next(self.messages))

    async def send(self, payload: str) -> None:
        self.sent.append(json.loads(payload))


@pytest.mark.asyncio
async def test_home_assistant_client_health_states_and_registries() -> None:
    websocket = FakeWebSocket()

    def connect(*args, **kwargs):
        assert args[0] == "ws://homeassistant.test/api/websocket"
        assert kwargs["open_timeout"] == 5.0
        return websocket

    client = HomeAssistantClient(
        "http://homeassistant.test",
        "test-token",
        transport=httpx.MockTransport(home_assistant_transport),
        websocket_connect=connect,
    )

    assert await client.health() == "API running."
    assert (await client.states())[0]["entity_id"] == "light.workshop"
    registry = await client.registry_snapshot()
    assert registry["areas"][0]["area_id"] == "workshop"
    assert registry["devices"][0]["id"] == "device-1"
    assert registry["entities"][0]["entity_id"] == "light.workshop"
    assert websocket.sent[0] == {"type": "auth", "access_token": "test-token"}
    assert [item["type"] for item in websocket.sent[1:]] == [
        "config/area_registry/list",
        "config/device_registry/list",
        "config/entity_registry/list",
    ]


@pytest.mark.asyncio
async def test_home_assistant_client_redacts_rejected_token() -> None:
    def unauthorized(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "Unauthorized"})

    client = HomeAssistantClient("http://homeassistant.test", "super-secret-token", transport=httpx.MockTransport(unauthorized))
    with pytest.raises(HomeAssistantAuthenticationError) as exc_info:
        await client.health()
    assert "super-secret-token" not in str(exc_info.value)


@pytest.mark.asyncio
async def test_home_assistant_client_reports_offline_and_timeout() -> None:
    def offline(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    offline_client = HomeAssistantClient("http://homeassistant.test", "test-token", transport=httpx.MockTransport(offline))
    with pytest.raises(HomeAssistantUnavailableError, match="Unable to reach Home Assistant"):
        await offline_client.health()

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    timeout_client = HomeAssistantClient("http://homeassistant.test", "test-token", timeout_seconds=1, transport=httpx.MockTransport(timeout))
    with pytest.raises(HomeAssistantTimeoutError, match="timed out after 1 seconds"):
        await timeout_client.health()
