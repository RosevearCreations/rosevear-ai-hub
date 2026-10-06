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
        return httpx.Response(
            200,
            json=[
                {
                    "entity_id": "light.workshop",
                    "state": "on",
                    "attributes": {"friendly_name": "Workshop light"},
                    "last_changed": "2026-10-06T20:00:00+00:00",
                    "last_updated": "2026-10-06T20:00:00+00:00",
                }
            ],
        )
    return httpx.Response(404)


@pytest.mark.asyncio
async def test_home_assistant_client_health_and_states() -> None:
    client = HomeAssistantClient(
        "http://homeassistant.test",
        "test-token",
        transport=httpx.MockTransport(home_assistant_transport),
    )

    assert await client.health() == "API running."
    states = await client.states()
    assert states[0]["entity_id"] == "light.workshop"


@pytest.mark.asyncio
async def test_home_assistant_client_redacts_rejected_token() -> None:
    def unauthorized(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"message": "Unauthorized"})

    client = HomeAssistantClient(
        "http://homeassistant.test",
        "super-secret-token",
        transport=httpx.MockTransport(unauthorized),
    )

    with pytest.raises(HomeAssistantAuthenticationError) as exc_info:
        await client.health()

    assert "super-secret-token" not in str(exc_info.value)


@pytest.mark.asyncio
async def test_home_assistant_client_reports_offline_and_timeout() -> None:
    def offline(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    offline_client = HomeAssistantClient(
        "http://homeassistant.test",
        "test-token",
        transport=httpx.MockTransport(offline),
    )
    with pytest.raises(HomeAssistantUnavailableError, match="Unable to reach Home Assistant"):
        await offline_client.health()

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    timeout_client = HomeAssistantClient(
        "http://homeassistant.test",
        "test-token",
        timeout_seconds=1,
        transport=httpx.MockTransport(timeout),
    )
    with pytest.raises(HomeAssistantTimeoutError, match="timed out after 1 seconds"):
        await timeout_client.health()
