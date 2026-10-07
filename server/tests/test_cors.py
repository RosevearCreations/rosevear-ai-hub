from fastapi.testclient import TestClient

from rosevear_ai_hub.main import create_app


def test_cors_preflight_allows_put_for_secret_rotation() -> None:
    client = TestClient(create_app())
    response = client.options(
        "/api/v1/secrets/home_assistant.token",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert "PUT" in response.headers["access-control-allow-methods"]
