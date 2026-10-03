"""Provider-neutral local and optional-cloud AI contracts."""

from rosevear_ai_hub.providers.base import (
    AIProvider,
    ProviderDescriptor,
    ProviderError,
    ProviderHealth,
    ProviderRequestError,
    ProviderUnavailableError,
)

__all__ = [
    "AIProvider",
    "ProviderDescriptor",
    "ProviderError",
    "ProviderHealth",
    "ProviderRequestError",
    "ProviderUnavailableError",
]
