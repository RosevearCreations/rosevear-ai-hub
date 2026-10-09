"""Shared read-first framework for Rosevear business connectors."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class ConnectorAccessMode(StrEnum):
    """Supported connector access boundaries."""

    READ_ONLY = "read_only"
    APPROVED_WRITE = "approved_write"


class ConnectorState(StrEnum):
    """Normalized connector health/configuration states."""

    PLANNED = "planned"
    UNCONFIGURED = "unconfigured"
    CONFIGURED = "configured"
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"


@dataclass(frozen=True)
class ConnectorCapability:
    """One bounded resource family exposed by a connector."""

    key: str
    label: str
    description: str
    access: ConnectorAccessMode = ConnectorAccessMode.READ_ONLY


@dataclass(frozen=True)
class ConnectorDescriptor:
    """Code-owned connector identity and policy metadata."""

    key: str
    display_name: str
    description: str
    planned_build: int
    capabilities: tuple[ConnectorCapability, ...]
    access_mode: ConnectorAccessMode = ConnectorAccessMode.READ_ONLY
    writes_require_confirmation: bool = True


@dataclass(frozen=True)
class ConnectorStatus:
    """Safe connector status returned to API/UI callers."""

    state: ConnectorState
    configured: bool
    available: bool
    message: str
    retryable: bool = False


@dataclass(frozen=True)
class ConnectorReadResult:
    """Normalized container used by concrete read connectors."""

    resource: str
    records: tuple[dict[str, Any], ...]
    next_cursor: str | None = None


class ConnectorError(RuntimeError):
    """Base error whose public message is safe to expose."""

    code = "connector_error"
    retryable = False

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.safe_message = message


class ConnectorConfigurationError(ConnectorError):
    code = "connector_not_configured"


class ConnectorUnavailableError(ConnectorError):
    code = "connector_unavailable"
    retryable = True


class ConnectorNotFoundError(ConnectorError):
    code = "connector_not_found"


class ConnectorWriteBlockedError(ConnectorError):
    code = "connector_write_blocked"


class BusinessConnector(ABC):
    """Contract implemented by every concrete business connector."""

    @property
    @abstractmethod
    def descriptor(self) -> ConnectorDescriptor:
        """Return stable code-owned metadata for this connector."""

    @abstractmethod
    def status(self) -> ConnectorStatus:
        """Return normalized configuration/availability state."""

    @abstractmethod
    def read(
        self,
        resource: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> ConnectorReadResult:
        """Read one bounded resource family."""

    def write(self, operation: str, payload: dict[str, Any]) -> None:
        """Fail closed until a later build defines a narrow approved write."""

        del operation, payload
        raise ConnectorWriteBlockedError(
            f"{self.descriptor.display_name} writes are blocked by the connector framework."
        )


class PlannedReadConnector(BusinessConnector):
    """Placeholder registration used before a connector's implementation build."""

    def __init__(self, descriptor: ConnectorDescriptor) -> None:
        self._descriptor = descriptor

    @property
    def descriptor(self) -> ConnectorDescriptor:
        return self._descriptor

    def status(self) -> ConnectorStatus:
        return ConnectorStatus(
            state=ConnectorState.PLANNED,
            configured=False,
            available=False,
            message=(
                f"{self.descriptor.display_name} read connector is reserved for "
                f"Build {self.descriptor.planned_build:03d}."
            ),
            retryable=False,
        )

    def read(
        self,
        resource: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> ConnectorReadResult:
        del resource, cursor, limit
        raise ConnectorUnavailableError(
            f"{self.descriptor.display_name} read connector is not implemented yet."
        )


class ConnectorRegistry:
    """Deterministic in-process registry for code-owned connectors."""

    def __init__(self, connectors: tuple[BusinessConnector, ...] = ()) -> None:
        self._connectors: dict[str, BusinessConnector] = {}
        for connector in connectors:
            self.register(connector)

    def register(self, connector: BusinessConnector) -> None:
        key = connector.descriptor.key
        if not key or key != key.strip().lower():
            raise ValueError("Connector keys must be non-empty lowercase canonical values.")
        if key in self._connectors:
            raise ValueError(f"Connector key {key!r} is already registered.")
        self._connectors[key] = connector

    def list(self) -> tuple[BusinessConnector, ...]:
        return tuple(self._connectors[key] for key in sorted(self._connectors))

    def get(self, key: str) -> BusinessConnector:
        connector = self._connectors.get(key)
        if connector is None:
            raise ConnectorNotFoundError(f"Unknown business connector: {key}.")
        return connector


def _capability(key: str, label: str, description: str) -> ConnectorCapability:
    return ConnectorCapability(key=key, label=label, description=description)


DEFAULT_BUSINESS_CONNECTORS = ConnectorRegistry(
    (
        PlannedReadConnector(
            ConnectorDescriptor(
                key="devilndove",
                display_name="Devil n Dove",
                description=(
                    "Read-first view of shop commerce, catalogue, inventory, and order data."
                ),
                planned_build=37,
                capabilities=(
                    _capability(
                        "catalogue.read",
                        "Catalogue",
                        "Read products and listing metadata.",
                    ),
                    _capability("orders.read", "Orders", "Read order and fulfilment summaries."),
                    _capability(
                        "inventory.read",
                        "Inventory",
                        "Read stock and maker inventory state.",
                    ),
                ),
            )
        ),
        PlannedReadConnector(
            ConnectorDescriptor(
                key="rosiedazzlers",
                display_name="Rosie Dazzlers",
                description=(
                    "Read-first view of detailing customers, bookings, jobs, and inventory."
                ),
                planned_build=38,
                capabilities=(
                    _capability("bookings.read", "Bookings", "Read booking and appointment data."),
                    _capability("customers.read", "Customers", "Read customer profile summaries."),
                    _capability("jobs.read", "Jobs", "Read detailing job and service history."),
                    _capability("inventory.read", "Inventory", "Read gear and consumable state."),
                ),
            )
        ),
        PlannedReadConnector(
            ConnectorDescriptor(
                key="yardworkers",
                display_name="Yard Workers",
                description="Read-first view of landscaping clients, jobs, crews, and equipment.",
                planned_build=39,
                capabilities=(
                    _capability("clients.read", "Clients", "Read client and contract summaries."),
                    _capability("jobs.read", "Jobs", "Read scheduled and historical job data."),
                    _capability("crew.read", "Crew", "Read employee and assignment summaries."),
                    _capability(
                        "equipment.read",
                        "Equipment",
                        "Read equipment and availability state.",
                    ),
                ),
            )
        ),
    )
)
