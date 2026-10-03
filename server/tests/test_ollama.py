import httpx
import pytest

from rosevear_ai_hub.integrations.ollama import (
    OllamaClient,
    OllamaTimeoutError,
    OllamaUnavailableError,
)


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
    if request.url.path == "/api/embed":
        return httpx.Response(
            200,
            json={
                "model": "test-embed",
                "embeddings": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
            },
        )
    if request.url.path == "/api/chat":
        return httpx.Response(
            200,
            content=(
                b'{"message":{"role":"assistant","content":"Hello "},"done":false}\n'
                b'{"message":{"role":"assistant","content":"there"},"done":false}\n'
                b'{"message":{"role":"assistant","content":""},"done":true}\n'
            ),
            headers={"content-type": "application/x-ndjson"},
        )
    return httpx.Response(404)


@pytest.mark.asyncio
async def test_ollama_client_discovers_models_tests_and_streams() -> None:
    client = OllamaClient(
        "http://ollama.test",
        transport=httpx.MockTransport(mock_transport),
    )

    assert await client.version() == "0.12.0"
    models = await client.models()
    assert models[0]["name"] == "test-model:latest"

    result = await client.test_model("test-model:latest")
    assert result["response"] == "OK"

    embeddings = await client.embed("test-embed", ["alpha", "beta"])
    assert embeddings == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]

    chunks = [
        chunk
        async for chunk in client.stream_chat(
            "test-model:latest",
            [{"role": "user", "content": "Hello"}],
        )
    ]
    assert chunks == ["Hello ", "there"]


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


@pytest.mark.asyncio
async def test_ollama_client_reports_timeout_separately() -> None:
    def timeout_transport(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    client = OllamaClient(
        "http://ollama.test",
        timeout_seconds=1,
        transport=httpx.MockTransport(timeout_transport),
    )

    with pytest.raises(OllamaTimeoutError, match="timed out after 1 seconds"):
        await client.version()
