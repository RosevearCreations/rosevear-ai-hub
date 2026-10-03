"""Provider registry and default local routing configuration."""

from __future__ import annotations

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.integrations.ollama import OllamaClient
from rosevear_ai_hub.providers.base import AIProvider, ProviderRequestError
from rosevear_ai_hub.providers.ollama import OllamaProvider


class ProviderRegistry:
    """Small in-process registry keyed by stable provider identifiers."""

    def __init__(self, providers: list[AIProvider]) -> None:
        self._providers = {
            provider.descriptor.key: provider
            for provider in providers
            if provider.descriptor.enabled
        }

    def list(self) -> list[AIProvider]:
        return sorted(self._providers.values(), key=lambda item: item.descriptor.key)

    def get(self, key: str) -> AIProvider:
        provider = self._providers.get(key)
        if provider is None:
            raise ProviderRequestError(f"Unknown or disabled AI provider: {key}.")
        return provider


def get_provider_registry() -> ProviderRegistry:
    """Build the currently configured provider registry.

    Build 009 registers only Ollama. Future cloud adapters must be explicitly
    configured and added here or through a later configuration layer.
    """

    settings = get_settings()
    ollama_client = OllamaClient(
        settings.ollama_base_url,
        timeout_seconds=settings.ollama_timeout_seconds,
        generation_timeout_seconds=settings.ollama_generation_timeout_seconds,
    )
    return ProviderRegistry([OllamaProvider(ollama_client)])
