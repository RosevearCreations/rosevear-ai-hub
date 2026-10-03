from collections.abc import AsyncIterator
from typing import Any

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.providers.base import AIProvider, ProviderDescriptor, ProviderHealth
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry


class HealthyProvider(AIProvider):
    _descriptor = ProviderDescriptor(
        key="test-local",
        display_name="Test Local",
        provider_type="local",
        privacy_policy="local_only",
        supports_streaming=True,
        supports_tools=False,
        enabled=True,
    )

    @property
    def descriptor(self) -> ProviderDescriptor:
        return self._descriptor

    async def health(self) -> ProviderHealth:
        return ProviderHealth(
            available=True,
            message="Ready.",
            version="1.2.3",
            model_count=2,
        )

    async def models(self) -> list[dict[str, Any]]:
        return [{"name": "a"}, {"name": "b"}]

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        yield "ok"


def test_provider_status_endpoint_returns_routing_metadata() -> None:
    application = create_app()
    application.dependency_overrides[get_provider_registry] = lambda: ProviderRegistry(
        [HealthyProvider()]
    )
    client = TestClient(application)

    response = client.get("/api/v1/models/providers")
    assert response.status_code == 200
    assert response.json() == [
        {
            "key": "test-local",
            "display_name": "Test Local",
            "provider_type": "local",
            "privacy_policy": "local_only",
            "supports_streaming": True,
            "supports_tools": False,
            "enabled": True,
            "available": True,
            "message": "Ready.",
            "version": "1.2.3",
            "model_count": 2,
        }
    ]
