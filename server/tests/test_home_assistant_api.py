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
                    "api_token": "never-expose-this",
                    "nested": {"password": "never-expose-this-either"},
                    "reading_quality": "good",
                },
                "last_changed": "2026-10-06T20:00:00+00:00",
                "last_updated": "2026-10-06T20:00:00+00:00",
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {
                    "friendly_name": "Workshop light",
                    "icon": "mdi:lightbulb",
                },
            },
        ]

    async def registry_snapshot(self):
        return {
            "areas": [
                {
                    "area_id": "workshop",
                    "name": "Workshop",
                    "aliases": ["Shop"],
                }
            ],
            "devices": [
                {
                    "id": "device-thermostat",
                    "name": "Workshop thermostat",
                    "area_id": "workshop",
                    "manufacturer": "Example",
                    "model": "T1",
                }
            ],
            "entities": [
                {
                    "entity_id": "sensor.workshop_temperature",
                    "device_id": "device-thermostat",
                    "platform": "demo",
                },
                {
                    "entity_id": "light.workshop",
                    "area_id": "workshop",
                    "platform": "demo",
                },
            ],
        }


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


def configured_runtime() -> HomeAssistantRuntime:
    return HomeAssistantRuntime(
        client=FakeHomeAssistantClient(),
        base_url="http://homeassistant.test",
        url_configured=True,
        token_configured=True,
    )


def test_home_assistant_status_and_entity_inventory() -> None:
    client = build_client(configured_runtime())
    status_response = client.get("/api/v1/home-assistant/status")
    assert status_response.status_code == 200
    assert status_response.json()["available"] is True

    entities_response = client.get("/api/v1/home-assistant/entities")
    assert entities_response.status_code == 200
    payload = entities_response.json()
    assert payload["count"] == 2
    assert [item["entity_id"] for item in payload["entities"]] == [
        "light.workshop",
        "sensor.workshop_temperature",
    ]
    assert payload["entities"][1]["unit_of_measurement"] == "°C"
    assert "never-expose-this" not in entities_response.text


def test_entity_browser_resolves_area_device_domain_state_and_safe_attributes() -> None:
    client = build_client(configured_runtime())
    response = client.get("/api/v1/home-assistant/browser")
    assert response.status_code == 200
    payload = response.json()
    assert payload["area_count"] == 1
    assert payload["device_count"] == 1
    assert payload["domain_count"] == 2
    assert payload["entity_count"] == 2
    assert payload["areas"][0]["name"] == "Workshop"
    assert payload["devices"][0]["name"] == "Workshop thermostat"

    temperature = next(
        item for item in payload["entities"] if item["entity_id"] == "sensor.workshop_temperature"
    )
    assert temperature["area_name"] == "Workshop"
    assert temperature["device_name"] == "Workshop thermostat"
    assert temperature["platform"] == "demo"
    assert temperature["state"] == "21.5"
    assert temperature["attributes"]["reading_quality"] == "good"
    assert temperature["attributes"]["api_token"] == "[REDACTED]"
    assert temperature["attributes"]["nested"]["password"] == "[REDACTED]"
    assert "never-expose-this" not in response.text


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
    assert client.get("/api/v1/home-assistant/entities").status_code == 503
    assert client.get("/api/v1/home-assistant/browser").status_code == 503


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
