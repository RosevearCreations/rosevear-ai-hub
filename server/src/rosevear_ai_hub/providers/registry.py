"""Provider registry, retry policy, and runtime availability state."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from functools import lru_cache
from time import monotonic

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.integrations.ollama import OllamaClient
from rosevear_ai_hub.providers.base import AIProvider, ProviderRequestError
from rosevear_ai_hub.providers.ollama import OllamaProvider


@dataclass
class _MutableProviderRuntimeState:
    consecutive_failures: int = 0
    last_error: str | None = None
    offline_until: float = 0.0


@dataclass(frozen=True)
class ProviderRuntimeState:
    """Read-only provider availability snapshot."""

    consecutive_failures: int
    last_error: str | None
    temporarily_offline: bool
    retry_after_seconds: float


class ProviderRegistry:
    """In-process provider registry with conservative retry and cooldown state."""

    def __init__(
        self,
        providers: list[AIProvider],
        *,
        generation_attempts: int = 2,
        retry_delay_seconds: float = 0.35,
        offline_cooldown_seconds: float = 5.0,
        time_source: Callable[[], float] = monotonic,
    ) -> None:
        self._providers = {
            provider.descriptor.key: provider
            for provider in providers
            if provider.descriptor.enabled
        }
        self.generation_attempts = max(1, generation_attempts)
        self.retry_delay_seconds = max(0.0, retry_delay_seconds)
        self.offline_cooldown_seconds = max(0.0, offline_cooldown_seconds)
        self._time_source = time_source
        self._runtime = {
            key: _MutableProviderRuntimeState()
            for key in self._providers
        }

    def list(self) -> list[AIProvider]:
        return sorted(self._providers.values(), key=lambda item: item.descriptor.key)

    def get(self, key: str) -> AIProvider:
        provider = self._providers.get(key)
        if provider is None:
            raise ProviderRequestError(f"Unknown or disabled AI provider: {key}.")
        return provider

    def mark_success(self, key: str) -> None:
        state = self._runtime.get(key)
        if state is None:
            return
        state.consecutive_failures = 0
        state.last_error = None
        state.offline_until = 0.0

    def mark_unavailable(self, key: str, message: str) -> None:
        state = self._runtime.get(key)
        if state is None:
            return
        state.consecutive_failures += 1
        state.last_error = message
        state.offline_until = self._time_source() + self.offline_cooldown_seconds

    def runtime_state(self, key: str) -> ProviderRuntimeState:
        state = self._runtime.get(key)
        if state is None:
            raise ProviderRequestError(f"Unknown or disabled AI provider: {key}.")

        remaining = max(0.0, state.offline_until - self._time_source())
        return ProviderRuntimeState(
            consecutive_failures=state.consecutive_failures,
            last_error=state.last_error,
            temporarily_offline=remaining > 0,
            retry_after_seconds=remaining,
        )


@lru_cache
def get_provider_registry() -> ProviderRegistry:
    """Build the process-level provider registry.

    Runtime availability state is intentionally retained for the life of the
    backend process so repeated failures can degrade gracefully instead of
    hammering an offline provider.
    """

    settings = get_settings()
    ollama_client = OllamaClient(
        settings.ollama_base_url,
        timeout_seconds=settings.ollama_timeout_seconds,
        generation_timeout_seconds=settings.ollama_generation_timeout_seconds,
    )
    return ProviderRegistry(
        [OllamaProvider(ollama_client)],
        generation_attempts=settings.provider_generation_attempts,
        retry_delay_seconds=settings.provider_retry_delay_seconds,
        offline_cooldown_seconds=settings.provider_offline_cooldown_seconds,
    )
