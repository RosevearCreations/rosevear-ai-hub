from collections.abc import AsyncIterator
from typing import Any

import pytest

from rosevear_ai_hub.providers.base import (
    AIProvider,
    ProviderDescriptor,
    ProviderHealth,
    ProviderRequestError,
)
from rosevear_ai_hub.providers.registry import ProviderRegistry


class StubProvider(AIProvider):
    def __init__(self, key: str, enabled: bool = True) -> None:
        self._descriptor = ProviderDescriptor(
            key=key,
            display_name=key.title(),
            provider_type="local",
            privacy_policy="local_only",
            supports_streaming=True,
            supports_tools=False,
            enabled=enabled,
        )

    @property
    def descriptor(self) -> ProviderDescriptor:
        return self._descriptor

    async def health(self) -> ProviderHealth:
        return ProviderHealth(available=True, message="Ready.")

    async def models(self) -> list[dict[str, Any]]:
        return []

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        yield "ok"


def test_registry_lists_enabled_providers_in_key_order() -> None:
    registry = ProviderRegistry(
        [
            StubProvider("zeta"),
            StubProvider("alpha"),
            StubProvider("disabled", enabled=False),
        ]
    )

    assert [item.descriptor.key for item in registry.list()] == ["alpha", "zeta"]


def test_registry_rejects_unknown_or_disabled_provider() -> None:
    registry = ProviderRegistry([StubProvider("disabled", enabled=False)])

    with pytest.raises(ProviderRequestError, match="Unknown or disabled"):
        registry.get("disabled")


def test_registry_tracks_temporary_offline_state_and_recovers() -> None:
    now = [100.0]
    registry = ProviderRegistry(
        [StubProvider("alpha")],
        offline_cooldown_seconds=5,
        time_source=lambda: now[0],
    )

    registry.mark_unavailable("alpha", "offline")
    state = registry.runtime_state("alpha")
    assert state.temporarily_offline is True
    assert state.consecutive_failures == 1
    assert state.last_error == "offline"
    assert state.retry_after_seconds == 5

    now[0] = 106.0
    assert registry.runtime_state("alpha").temporarily_offline is False

    registry.mark_success("alpha")
    recovered = registry.runtime_state("alpha")
    assert recovered.consecutive_failures == 0
    assert recovered.last_error is None
