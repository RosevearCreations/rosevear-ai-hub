from fastapi.testclient import TestClient

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.auth import require_authenticated
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantUnavailableError
from rosevear_ai_hub.main import create_app


class FakeHomeAssistantClient:
    base_url = "http://homeassistant.test"

    async def health(self) -> str:
        return "API running."

    async def states(self):
        return [
            {
                "entity_id": "sensor.workshop_temperature",
                "state": "21.5",
                "attributes": {
                    "friendly_name": "Workshop temperature",
                    "unit_of_measurement": "°C",
                    "device_class": "temperature",
                    "sensitive_extra": "not-exposed-by-build-021",
                },
                "last_changed": "2026-10-06T20:00:00+00:00",
                "last_updated": "2026-10-06T20:00:00+00:00",
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {"friendly_name": "Workshop light", "icon": "mdi:lightbulb"},
            },
        ]


class OfflineHomeAssistantClient(FakeHomeAssistantClient):
    async def health(self) -> str:
        raise HomeAssistantUnavailableError(
            "Unable to reach Home Assistant at http://homeassistant.test."
        )


def build_client(runtime: HomeAssistantRuntime) -> TestClient:
    application = create_app()
    application.dependency_overrides[require_authenticated] = lambda: None
    application.dependency_overrides[get_home_assistant_runtime] = lambda: runtime
    return TestClient(application)


def test_home_assistant_status_and_entity_inventory() -> None:
    client = build_client(
        HomeAssistantRuntime(
            client=FakeHomeAssistantClient(),
            base_url="http://homeassistant.test",
            url_configured=True,
            token_configured=True,
        )
    )

    status_response = client.get("/api/v1/home-assistant/status")
    assert status_response.status_code == 200
    assert status_response.json() == {
        "configured": True,
        "available": True,
        "base_url": "http://homeassistant.test",
        "url_configured": True,
        "token_configured": True,
        "message": "API running.",
    }

    entities_response = client.get("/api/v1/home-assistant/entities")
    assert entities_response.status_code == 200
    payload = entities_response.json()
    assert payload["count"] == 2
    assert [item["entity_id"] for item in payload["entities"]] == [
        "light.workshop",
        "sensor.workshop_temperature",
    ]
    assert payload["entities"][1]["unit_of_measurement"] == "°C"
    assert "sensitive_extra" not in entities_response.text


def test_home_assistant_status_degrades_safely_when_not_configured() -> None:
    client = build_client(
        HomeAssistantRuntime(
            client=None,
            base_url=None,
            url_configured=False,
            token_configured=False,
        )
    )

    status_response = client.get("/api/v1/home-assistant/status")
    assert status_response.status_code == 200
    assert status_response.json()["configured"] is False
    assert status_response.json()["available"] is False
    assert "HOME_ASSISTANT_URL" in status_response.json()["message"]
    assert client.get("/api/v1/home-assistant/entities").status_code == 503


def test_home_assistant_status_degrades_safely_when_offline() -> None:
    client = build_client(
        HomeAssistantRuntime(
            client=OfflineHomeAssistantClient(),
            base_url="http://homeassistant.test",
            url_configured=True,
            token_configured=True,
        )
    )

    response = client.get("/api/v1/home-assistant/status")
    assert response.status_code == 200
    assert response.json()["available"] is False
    assert "Unable to reach Home Assistant" in response.json()["message"]
