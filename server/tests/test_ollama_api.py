from fastapi.testclient import TestClient

from rosevear_ai_hub.api.ollama import get_ollama_client
from rosevear_ai_hub.integrations.ollama import OllamaUnavailableError
from rosevear_ai_hub.main import create_app


class FakeOllamaClient:
    base_url = "http://ollama.test"

    async def version(self) -> str:
        return "0.12.0"

    async def models(self):
        return [
            {
                "name": "tiny:latest",
                "model": "tiny:latest",
                "size": 42,
                "details": {
                    "format": "gguf",
                    "family": "tiny",
                    "families": ["tiny"],
                    "parameter_size": "1B",
                    "quantization_level": "Q4_K_M",
                },
            }
        ]

    async def test_model(self, model: str):
        return {
            "model": model,
            "response": "OK",
            "total_duration": 99,
            "eval_count": 1,
        }


class OfflineOllamaClient(FakeOllamaClient):
    async def version(self) -> str:
        raise OllamaUnavailableError("Unable to reach Ollama at http://ollama.test.")


def test_ollama_status_models_and_smoke_test() -> None:
    application = create_app()
    application.dependency_overrides[get_ollama_client] = FakeOllamaClient
    client = TestClient(application)

    status_response = client.get("/api/v1/models/ollama/status")
    assert status_response.status_code == 200
    assert status_response.json()["available"] is True
    assert status_response.json()["model_count"] == 1

    models_response = client.get("/api/v1/models/ollama/models")
    assert models_response.status_code == 200
    assert models_response.json()["models"][0]["name"] == "tiny:latest"

    test_response = client.post(
        "/api/v1/models/ollama/test",
        json={"model": "tiny:latest"},
    )
    assert test_response.status_code == 200
    assert test_response.json()["response"] == "OK"


def test_ollama_status_is_safe_when_runtime_is_offline() -> None:
    application = create_app()
    application.dependency_overrides[get_ollama_client] = OfflineOllamaClient
    client = TestClient(application)

    response = client.get("/api/v1/models/ollama/status")

    assert response.status_code == 200
    assert response.json() == {
        "available": False,
        "base_url": "http://ollama.test",
        "version": None,
        "model_count": 0,
        "message": "Unable to reach Ollama at http://ollama.test.",
    }
