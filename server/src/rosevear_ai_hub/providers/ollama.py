"""Ollama implementation of the provider-neutral AI interface."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from rosevear_ai_hub.integrations.ollama import OllamaClient
from rosevear_ai_hub.providers.base import (
    AIProvider,
    ProviderDescriptor,
    ProviderHealth,
    ProviderRequestError,
    ProviderUnavailableError,
)


class OllamaProvider(AIProvider):
    """Local Ollama adapter exposed through the common provider contract."""

    _descriptor = ProviderDescriptor(
        key="ollama",
        display_name="Ollama",
        provider_type="local",
        privacy_policy="local_only",
        supports_streaming=True,
        supports_tools=False,
        enabled=True,
    )

    def __init__(self, client: OllamaClient) -> None:
        self.client = client

    @property
    def descriptor(self) -> ProviderDescriptor:
        return self._descriptor

    async def health(self) -> ProviderHealth:
        try:
            version = await self.client.version()
            models = await self.client.models()
        except (ProviderUnavailableError, ProviderRequestError) as exc:
            return ProviderHealth(available=False, message=str(exc))

        return ProviderHealth(
            available=True,
            message="Ollama is available.",
            version=version,
            model_count=len(models),
        )

    async def models(self) -> list[dict[str, Any]]:
        return await self.client.models()

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        async for token in self.client.stream_chat(model, messages):
            yield token
