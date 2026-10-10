"""Shared read-first framework with narrowly approved confirmed business writes."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.integrations.devilndove import (
    DevilNDoveAuthenticationError,
    DevilNDoveClient,
    DevilNDoveConfigurationError,
    DevilNDoveRequestError,
    DevilNDoveUnavailableError,
    validate_devilndove_base_url,
)
from rosevear_ai_hub.integrations.rosiedazzlers import (
    RosieDazzlersAuthenticationError,
    RosieDazzlersClient,
    RosieDazzlersConfigurationError,
    RosieDazzlersRequestError,
    RosieDazzlersUnavailableError,
    validate_rosiedazzlers_base_url,
)
from rosevear_ai_hub.integrations.yardworkers import (
    YardWorkersAuthenticationError,
    YardWorkersClient,
    YardWorkersConfigurationError,
    YardWorkersRequestError,
    YardWorkersUnavailableError,
    validate_yardworkers_base_url,
)


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


@dataclass(frozen=True)
class ConnectorWriteResult:
    """Normalized result for one narrowly approved confirmed write."""

    operation: str
    result: dict[str, Any]


class ConnectorError(RuntimeError):
    """Base error whose public message is safe to expose."""

    code = "connector_error"
    retryable = False

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.safe_message = message


class ConnectorConfigurationError(ConnectorError):
    code = "connector_not_configured"


class ConnectorAuthenticationError(ConnectorError):
    code = "connector_authentication_failed"


class ConnectorUnavailableError(ConnectorError):
    code = "connector_unavailable"
    retryable = True


class ConnectorNotFoundError(ConnectorError):
    code = "connector_not_found"


class ConnectorResourceNotFoundError(ConnectorError):
    code = "connector_resource_not_found"


class ConnectorWriteBlockedError(ConnectorError):
    code = "connector_write_blocked"


class ConnectorOperationNotFoundError(ConnectorError):
    code = "connector_operation_not_found"


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

    def write(
        self,
        operation: str,
        payload: dict[str, Any],
    ) -> ConnectorWriteResult:
        """Fail closed unless a concrete connector overrides one exact approved write."""

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

    def __init__(
        self,
        connectors: tuple[BusinessConnector, ...] = (),
    ) -> None:
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


def _capability(
    key: str,
    label: str,
    description: str,
    *,
    access: ConnectorAccessMode = ConnectorAccessMode.READ_ONLY,
) -> ConnectorCapability:
    return ConnectorCapability(
        key=key,
        label=label,
        description=description,
        access=access,
    )


DEVILNDOVE_DESCRIPTOR = ConnectorDescriptor(
    key="devilndove",
    display_name="Devil n Dove",
    description=(
        "Bounded shop reads plus one confirmed review-only product-story draft write."
    ),
    planned_build=37,
    access_mode=ConnectorAccessMode.APPROVED_WRITE,
    capabilities=(
        _capability(
            "catalogue.read",
            "Catalogue",
            "Read bounded Product picker records from the live shop authority.",
        ),
        _capability(
            "orders.read",
            "Orders",
            "Read bounded recent order and payment-status summaries.",
        ),
        _capability(
            "inventory.read",
            "Inventory",
            "Read bounded active maker inventory from the Inventory contract.",
        ),
        _capability(
            "story_draft.write",
            "Create story draft",
            (
                "Create one review-only product-story draft; publishing is never "
                "allowed by this write."
            ),
            access=ConnectorAccessMode.APPROVED_WRITE,
        ),
    ),
)


ROSIEDAZZLERS_DESCRIPTOR = ConnectorDescriptor(
    key="rosiedazzlers",
    display_name="Rosie Dazzlers",
    description=("Read-only view of detailing bookings, customers, jobs, and inventory."),
    planned_build=38,
    capabilities=(
        _capability(
            "bookings.read",
            "Bookings",
            "Read bounded booking and appointment summaries.",
        ),
        _capability(
            "customers.read",
            "Customers",
            "Read bounded customer profile and history summaries.",
        ),
        _capability(
            "jobs.read",
            "Jobs",
            "Read bounded active detailing job workspace data.",
        ),
        _capability(
            "inventory.read",
            "Inventory",
            "Read bounded gear and consumable state.",
        ),
    ),
)


YARDWORKERS_DESCRIPTOR = ConnectorDescriptor(
    key="yardworkers",
    display_name="Yard Workers",
    description=(
        "Bounded landscaping reads plus one confirmed private internal job-comment write."
    ),
    planned_build=39,
    access_mode=ConnectorAccessMode.APPROVED_WRITE,
    capabilities=(
        _capability(
            "clients.read",
            "Clients",
            "Read client, site, and service-document summaries.",
        ),
        _capability(
            "jobs.read",
            "Jobs",
            "Read scheduled and historical job data.",
        ),
        _capability(
            "crew.read",
            "Crew",
            "Read active employee identity summaries.",
        ),
        _capability(
            "equipment.read",
            "Equipment",
            "Read active equipment identity summaries.",
        ),
        _capability(
            "job_comment.write",
            "Create private job comment",
            (
                "Create one internal update comment that is never client-visible "
                "or a special instruction."
            ),
            access=ConnectorAccessMode.APPROVED_WRITE,
        ),
    ),
)


class DevilNDoveReadConnector(BusinessConnector):
    """Build 037 adapter over existing Devil n Dove GET-only contracts."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        credential: str | None = None,
        transport: Any | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._credential = (credential or "").strip()
        self._transport = transport

    @property
    def descriptor(self) -> ConnectorDescriptor:
        return DEVILNDOVE_DESCRIPTOR

    def status(self) -> ConnectorStatus:
        try:
            validate_devilndove_base_url(self.settings.devilndove_base_url)
        except DevilNDoveConfigurationError as exc:
            return ConnectorStatus(
                state=ConnectorState.ERROR,
                configured=False,
                available=False,
                message=str(exc),
                retryable=False,
            )
        if not self._credential:
            return ConnectorStatus(
                state=ConnectorState.UNCONFIGURED,
                configured=False,
                available=False,
                message=("Devil n Dove read access is ready but no credential is configured."),
                retryable=False,
            )
        return ConnectorStatus(
            state=ConnectorState.CONFIGURED,
            configured=True,
            available=False,
            message=(
                "Devil n Dove read access is configured. Availability is "
                "checked only when a bounded read is requested."
            ),
            retryable=False,
        )

    def _client(self) -> DevilNDoveClient:
        try:
            return DevilNDoveClient(
                self.settings.devilndove_base_url,
                self._credential,
                timeout_seconds=self.settings.devilndove_timeout_seconds,
                transport=self._transport,
            )
        except DevilNDoveConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc

    def read(
        self,
        resource: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> ConnectorReadResult:
        if not self._credential:
            raise ConnectorConfigurationError("Devil n Dove admin credential is not configured.")
        normalized = resource.strip().lower()
        aliases = {
            "catalogue": "catalogue",
            "catalogue.read": "catalogue",
            "orders": "orders",
            "orders.read": "orders",
            "inventory": "inventory",
            "inventory.read": "inventory",
        }
        canonical = aliases.get(normalized)
        if canonical is None:
            raise ConnectorResourceNotFoundError(
                f"Devil n Dove does not expose the read resource {resource!r}."
            )

        client = self._client()
        try:
            if canonical == "catalogue":
                page = client.catalogue(
                    limit=min(limit, 50),
                    cursor=cursor,
                )
            elif canonical == "orders":
                if cursor:
                    raise ConnectorResourceNotFoundError(
                        "Devil n Dove orders do not expose a cursor in Build 037."
                    )
                page = client.orders(limit=min(limit, 100))
            else:
                if cursor:
                    raise ConnectorResourceNotFoundError(
                        "Devil n Dove inventory does not expose a cursor in Build 037."
                    )
                page = client.inventory(limit=min(limit, 100))
        except DevilNDoveAuthenticationError as exc:
            raise ConnectorAuthenticationError(str(exc)) from exc
        except DevilNDoveUnavailableError as exc:
            raise ConnectorUnavailableError(str(exc)) from exc
        except DevilNDoveConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc
        except DevilNDoveRequestError as exc:
            raise ConnectorError(str(exc)) from exc

        return ConnectorReadResult(
            resource=canonical,
            records=page.records,
            next_cursor=page.next_cursor,
        )

    def write(
        self,
        operation: str,
        payload: dict[str, Any],
    ) -> ConnectorWriteResult:
        if not self._credential:
            raise ConnectorConfigurationError("Devil n Dove admin credential is not configured.")
        canonical = {
            "story_draft": "story_draft",
            "story_draft.write": "story_draft",
        }.get(operation.strip().lower())
        if canonical is None:
            raise ConnectorOperationNotFoundError(
                f"Devil n Dove does not expose the confirmed write operation {operation!r}."
            )

        client = self._client()
        try:
            result = client.create_story_draft(
                product_id=payload.get("product_id"),
                heading=payload.get("heading"),
                summary=payload.get("summary"),
                body=payload.get("body"),
            )
        except DevilNDoveAuthenticationError as exc:
            raise ConnectorAuthenticationError(str(exc)) from exc
        except DevilNDoveUnavailableError as exc:
            raise ConnectorUnavailableError(str(exc)) from exc
        except DevilNDoveConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc
        except DevilNDoveRequestError as exc:
            raise ConnectorError(str(exc)) from exc

        return ConnectorWriteResult(operation=canonical, result=result)


class RosieDazzlersReadConnector(BusinessConnector):
    """Build 038 adapter over existing Rosie Dazzlers read-only contracts."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        credential: str | None = None,
        transport: Any | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._credential = (credential or "").strip()
        self._transport = transport

    @property
    def descriptor(self) -> ConnectorDescriptor:
        return ROSIEDAZZLERS_DESCRIPTOR

    def status(self) -> ConnectorStatus:
        try:
            validate_rosiedazzlers_base_url(self.settings.rosiedazzlers_base_url)
        except RosieDazzlersConfigurationError as exc:
            return ConnectorStatus(
                state=ConnectorState.ERROR,
                configured=False,
                available=False,
                message=str(exc),
                retryable=False,
            )
        if not self._credential:
            return ConnectorStatus(
                state=ConnectorState.UNCONFIGURED,
                configured=False,
                available=False,
                message=(
                    "Rosie Dazzlers read access is ready but no staff session token is configured."
                ),
                retryable=False,
            )
        return ConnectorStatus(
            state=ConnectorState.CONFIGURED,
            configured=True,
            available=False,
            message=(
                "Rosie Dazzlers read access is configured. Availability is "
                "checked only when a bounded read is requested."
            ),
            retryable=False,
        )

    def _client(self) -> RosieDazzlersClient:
        try:
            return RosieDazzlersClient(
                self.settings.rosiedazzlers_base_url,
                self._credential,
                timeout_seconds=self.settings.rosiedazzlers_timeout_seconds,
                transport=self._transport,
            )
        except RosieDazzlersConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc

    def read(
        self,
        resource: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> ConnectorReadResult:
        if not self._credential:
            raise ConnectorConfigurationError(
                "Rosie Dazzlers staff session token is not configured."
            )
        if cursor:
            raise ConnectorResourceNotFoundError(
                "Rosie Dazzlers resources do not expose a cursor in Build 038."
            )
        normalized = resource.strip().lower()
        aliases = {
            "bookings": "bookings",
            "bookings.read": "bookings",
            "customers": "customers",
            "customers.read": "customers",
            "jobs": "jobs",
            "jobs.read": "jobs",
            "inventory": "inventory",
            "inventory.read": "inventory",
        }
        canonical = aliases.get(normalized)
        if canonical is None:
            raise ConnectorResourceNotFoundError(
                f"Rosie Dazzlers does not expose the read resource {resource!r}."
            )

        client = self._client()
        try:
            if canonical == "bookings":
                page = client.bookings(limit=min(limit, 100))
            elif canonical == "customers":
                page = client.customers(limit=min(limit, 100))
            elif canonical == "jobs":
                page = client.jobs(limit=min(limit, 80))
            else:
                page = client.inventory(limit=min(limit, 100))
        except RosieDazzlersAuthenticationError as exc:
            raise ConnectorAuthenticationError(str(exc)) from exc
        except RosieDazzlersUnavailableError as exc:
            raise ConnectorUnavailableError(str(exc)) from exc
        except RosieDazzlersConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc
        except RosieDazzlersRequestError as exc:
            raise ConnectorError(str(exc)) from exc

        return ConnectorReadResult(
            resource=canonical,
            records=page.records,
            next_cursor=page.next_cursor,
        )


class YardWorkersReadConnector(BusinessConnector):
    """Build 039 adapter over Yard Workers' protected Shared Core read contract."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        access_token: str | None = None,
        anon_key: str | None = None,
        transport: Any | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._access_token = (access_token or "").strip()
        self._anon_key = (anon_key or "").strip()
        self._transport = transport

    @property
    def descriptor(self) -> ConnectorDescriptor:
        return YARDWORKERS_DESCRIPTOR

    def status(self) -> ConnectorStatus:
        try:
            validate_yardworkers_base_url(self.settings.yardworkers_base_url)
        except YardWorkersConfigurationError as exc:
            return ConnectorStatus(
                state=ConnectorState.ERROR,
                configured=False,
                available=False,
                message=str(exc),
                retryable=False,
            )
        missing: list[str] = []
        if not self._access_token:
            missing.append("access token")
        if not self._anon_key:
            missing.append("API key")
        if missing:
            return ConnectorStatus(
                state=ConnectorState.UNCONFIGURED,
                configured=False,
                available=False,
                message=(
                    "Yard Workers read access is ready but the "
                    + " and ".join(missing)
                    + " is not configured."
                ),
                retryable=False,
            )
        return ConnectorStatus(
            state=ConnectorState.CONFIGURED,
            configured=True,
            available=False,
            message=(
                "Yard Workers read access is configured. Availability is checked only "
                "when a bounded read is requested."
            ),
            retryable=False,
        )

    def _client(self) -> YardWorkersClient:
        try:
            return YardWorkersClient(
                self.settings.yardworkers_base_url,
                self._access_token,
                self._anon_key,
                timeout_seconds=self.settings.yardworkers_timeout_seconds,
                transport=self._transport,
            )
        except YardWorkersConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc

    def read(
        self,
        resource: str,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> ConnectorReadResult:
        if not self._access_token or not self._anon_key:
            raise ConnectorConfigurationError(
                "Yard Workers access token and API key are not configured."
            )
        if cursor:
            raise ConnectorResourceNotFoundError(
                "Yard Workers resources do not expose a cursor in Build 039."
            )
        normalized = resource.strip().lower()
        aliases = {
            "clients": "clients",
            "clients.read": "clients",
            "jobs": "jobs",
            "jobs.read": "jobs",
            "crew": "crew",
            "crew.read": "crew",
            "equipment": "equipment",
            "equipment.read": "equipment",
        }
        canonical = aliases.get(normalized)
        if canonical is None:
            raise ConnectorResourceNotFoundError(
                f"Yard Workers does not expose the read resource {resource!r}."
            )

        client = self._client()
        try:
            if canonical == "clients":
                page = client.clients(limit=min(limit, 100))
            elif canonical == "jobs":
                page = client.jobs(limit=min(limit, 100))
            elif canonical == "crew":
                page = client.crew(limit=min(limit, 100))
            else:
                page = client.equipment(limit=min(limit, 100))
        except YardWorkersAuthenticationError as exc:
            raise ConnectorAuthenticationError(str(exc)) from exc
        except YardWorkersUnavailableError as exc:
            raise ConnectorUnavailableError(str(exc)) from exc
        except YardWorkersConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc
        except YardWorkersRequestError as exc:
            raise ConnectorError(str(exc)) from exc

        return ConnectorReadResult(
            resource=canonical,
            records=page.records,
            next_cursor=page.next_cursor,
        )

    def write(
        self,
        operation: str,
        payload: dict[str, Any],
    ) -> ConnectorWriteResult:
        if not self._access_token or not self._anon_key:
            raise ConnectorConfigurationError(
                "Yard Workers access token and API key are not configured."
            )
        canonical = {
            "job_comment": "job_comment",
            "job_comment.write": "job_comment",
        }.get(operation.strip().lower())
        if canonical is None:
            raise ConnectorOperationNotFoundError(
                f"Yard Workers does not expose the confirmed write operation {operation!r}."
            )

        client = self._client()
        try:
            result = client.create_private_job_comment(
                job_id=payload.get("job_id"),
                comment_text=payload.get("comment_text"),
            )
        except YardWorkersAuthenticationError as exc:
            raise ConnectorAuthenticationError(str(exc)) from exc
        except YardWorkersUnavailableError as exc:
            raise ConnectorUnavailableError(str(exc)) from exc
        except YardWorkersConfigurationError as exc:
            raise ConnectorConfigurationError(str(exc)) from exc
        except YardWorkersRequestError as exc:
            raise ConnectorError(str(exc)) from exc

        return ConnectorWriteResult(operation=canonical, result=result)


def build_business_connector_registry(
    *,
    settings: Settings | None = None,
    devilndove_credential: str | None = None,
    devilndove_transport: Any | None = None,
    rosiedazzlers_credential: str | None = None,
    rosiedazzlers_transport: Any | None = None,
    yardworkers_access_token: str | None = None,
    yardworkers_anon_key: str | None = None,
    yardworkers_transport: Any | None = None,
) -> ConnectorRegistry:
    """Build the runtime registry with credentials injected server-side."""

    settings = settings or get_settings()
    return ConnectorRegistry(
        (
            DevilNDoveReadConnector(
                settings,
                credential=devilndove_credential,
                transport=devilndove_transport,
            ),
            RosieDazzlersReadConnector(
                settings,
                credential=rosiedazzlers_credential,
                transport=rosiedazzlers_transport,
            ),
            YardWorkersReadConnector(
                settings,
                access_token=yardworkers_access_token,
                anon_key=yardworkers_anon_key,
                transport=yardworkers_transport,
            ),
        )
    )


DEFAULT_BUSINESS_CONNECTORS = build_business_connector_registry()
