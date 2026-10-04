from collections.abc import AsyncIterator
from typing import Any

from fastapi.testclient import TestClient

from rosevear_ai_hub.auth import require_authenticated
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


class OfflineProvider(HealthyProvider):
    async def health(self) -> ProviderHealth:
        return ProviderHealth(available=False, message="Provider offline.")


def test_provider_status_endpoint_returns_routing_metadata() -> None:
    application = create_app()
    application.dependency_overrides[require_authenticated] = lambda: None
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
            "degraded": False,
            "message": "Ready.",
            "version": "1.2.3",
            "model_count": 2,
            "consecutive_failures": 0,
            "retry_after_seconds": 0,
            "last_error": None,
        }
    ]


def test_provider_status_reports_offline_state_without_failing_endpoint() -> None:
    registry = ProviderRegistry([OfflineProvider()], offline_cooldown_seconds=30)
    application = create_app()
    application.dependency_overrides[require_authenticated] = lambda: None
    application.dependency_overrides[get_provider_registry] = lambda: registry
    client = TestClient(application)

    response = client.get("/api/v1/models/providers")
    assert response.status_code == 200
    item = response.json()[0]
    assert item["available"] is False
    assert item["degraded"] is True
    assert item["consecutive_failures"] == 1
    assert item["last_error"] == "Provider offline."
    assert item["retry_after_seconds"] > 0
