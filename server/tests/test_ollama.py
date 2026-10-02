import httpx
import pytest

from rosevear_ai_hub.integrations.ollama import OllamaClient, OllamaUnavailableError


def mock_transport(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/api/version":
        return httpx.Response(200, json={"version": "0.12.0"})
    if request.url.path == "/api/tags":
        return httpx.Response(
            200,
            json={
                "models": [
                    {
                        "name": "test-model:latest",
                        "model": "test-model:latest",
                        "size": 12345,
                        "details": {
                            "format": "gguf",
                            "family": "test",
                            "families": ["test"],
                            "parameter_size": "1B",
                            "quantization_level": "Q4_K_M",
                        },
                    }
                ]
            },
        )
    if request.url.path == "/api/generate":
        return httpx.Response(
            200,
            json={
                "model": "test-model:latest",
                "response": "OK",
                "done": True,
                "total_duration": 100,
                "eval_count": 1,
            },
        )
    return httpx.Response(404)


@pytest.mark.asyncio
async def test_ollama_client_discovers_models_and_tests_generation() -> None:
    client = OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(mock_transport),
    )

    assert await client.version() == "0.12.0"
    models = await client.models()
    assert models[0]["name"] == "test-model:latest"

    result = await client.test_model("test-model:latest")
    assert result["response"] == "OK"


@pytest.mark.asyncio
async def test_ollama_client_reports_connection_failure() -> None:
    def fail_transport(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    client = OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(fail_transport),
    )

    with pytest.raises(OllamaUnavailableError, match="Unable to reach Ollama"):
        await client.version()
