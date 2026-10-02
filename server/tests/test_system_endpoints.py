from fastapi.testclient import TestClient

from rosevear_ai_hub import __version__
from rosevear_ai_hub.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "Rosevear AI Hub"
    assert payload["environment"] == "development"


def test_version_endpoint() -> None:
    response = client.get("/version")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "Rosevear AI Hub"
    assert payload["version"] == __version__
    assert payload["environment"] == "development"
