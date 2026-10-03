"""Provider-neutral AI interfaces and routing metadata."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal


class ProviderError(RuntimeError):
    """Base error raised through the provider abstraction."""


class ProviderUnavailableError(ProviderError):
    """Raised when a configured provider cannot be reached."""


class ProviderTimeoutError(ProviderUnavailableError):
    """Raised when a provider times out before completing a request."""


class ProviderRequestError(ProviderError):
    """Raised when a provider rejects or cannot complete a safe request."""


@dataclass(frozen=True)
class ProviderDescriptor:
    """Static metadata used by routing and user-visible provider selection."""

    key: str
    display_name: str
    provider_type: Literal["local", "cloud"]
    privacy_policy: str
    supports_streaming: bool
    supports_tools: bool
    enabled: bool = True


@dataclass(frozen=True)
class ProviderHealth:
    """Normalized provider health for routing and status UI."""

    available: bool
    message: str
    version: str | None = None
    model_count: int | None = None


class AIProvider(ABC):
    """Common provider interface used by chat and future model routing."""

    @property
    @abstractmethod
    def descriptor(self) -> ProviderDescriptor:
        """Return stable provider routing metadata."""

    @abstractmethod
    async def health(self) -> ProviderHealth:
        """Return normalized provider health."""

    @abstractmethod
    async def models(self) -> list[dict[str, Any]]:
        """Return provider model metadata in provider-native dictionaries."""

    @abstractmethod
    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        """Yield text chunks for one chat generation."""
