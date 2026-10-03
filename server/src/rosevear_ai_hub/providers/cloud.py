"""Contract for optional cloud AI adapters.

No cloud provider is configured by Build 009. Concrete adapters added later must
implement this contract and remain explicitly optional.
"""

from __future__ import annotations

from abc import abstractmethod

from rosevear_ai_hub.providers.base import AIProvider


class OptionalCloudProvider(AIProvider):
    """Additional contract required for any future cloud provider."""

    @property
    @abstractmethod
    def credential_reference_name(self) -> str:
        """Return the configuration key name, never a credential value."""

    @property
    @abstractmethod
    def configured(self) -> bool:
        """Return whether required external configuration is present."""
