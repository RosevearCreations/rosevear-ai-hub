"""Read-only Rosie Dazzlers business API adapter for Build 038."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx


class RosieDazzlersError(RuntimeError):
    """Base sanitized Rosie Dazzlers integration error."""


class RosieDazzlersConfigurationError(RosieDazzlersError):
    """The connector configuration is missing or unsafe."""


class RosieDazzlersAuthenticationError(RosieDazzlersError):
    """The configured staff session was rejected."""


class RosieDazzlersUnavailableError(RosieDazzlersError):
    """Rosie Dazzlers could not be reached or is temporarily unavailable."""


class RosieDazzlersRequestError(RosieDazzlersError):
    """Rosie Dazzlers returned an unusable read response."""


@dataclass(frozen=True)
class RosieDazzlersReadPage:
    """One bounded page of normalized business records."""

    records: tuple[dict[str, Any], ...]
    next_cursor: str | None = None


_READ_CONTRACTS = frozenset(
    {
        ("POST", "/api/admin/bookings_search"),
        ("POST", "/api/admin/customers_list"),
        ("GET", "/api/detailer/jobs"),
        ("GET", "/api/admin/catalog_inventory_list"),
    }
)


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def validate_rosiedazzlers_base_url(value: str) -> str:
    """Require HTTPS remotely while permitting HTTP for loopback testing."""

    normalized = value.strip().rstrip("/")
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL must be a valid http:// or https:// URL."
        )
    if parsed.scheme == "http" and not _is_loopback(parsed.hostname):
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL must use HTTPS unless it points to localhost."
        )
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL must not contain credentials, query, or fragment."
        )
    if parsed.path not in {"", "/"}:
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL must identify the site origin without an API path."
        )
    try:
        port = parsed.port
    except ValueError as exc:
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL contains an invalid port."
        ) from exc
    if port is not None and not 1 <= port <= 65535:
        raise RosieDazzlersConfigurationError(
            "ROSIEDAZZLERS_BASE_URL contains an invalid port."
        )
    return normalized


def _text(value: Any, *, max_length: int = 240) -> str:
    return str(value or "").strip()[:max_length]


def _nullable_text(value: Any, *, max_length: int = 240) -> str | None:
    normalized = _text(value, max_length=max_length)
    return normalized or None


def _integer(value: Any, *, minimum: int | None = None) -> int:
    if isinstance(value, bool):
        number = 0
    else:
        try:
            number = int(value or 0)
        except (TypeError, ValueError):
            number = 0
    return max(minimum, number) if minimum is not None else number


def _number(value: Any, *, minimum: float | None = None) -> float:
    if isinstance(value, bool):
        number = 0.0
    else:
        try:
            number = float(value or 0)
        except (TypeError, ValueError):
            number = 0.0
    return max(minimum, number) if minimum is not None else number


def _boolean(value: Any) -> bool:
    return value is True


class RosieDazzlersClient:
    """Server-side client for existing Rosie Dazzlers read-only contracts."""

    def __init__(
        self,
        base_url: str,
        staff_session_token: str,
        *,
        timeout_seconds: float = 8.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = validate_rosiedazzlers_base_url(base_url)
        self._staff_session_token = staff_session_token.strip()
        if not self._staff_session_token:
            raise RosieDazzlersConfigurationError(
                "Rosie Dazzlers staff session token is not configured."
            )
        if any(char in self._staff_session_token for char in (";", "\r", "\n")):
            raise RosieDazzlersConfigurationError(
                "Rosie Dazzlers staff session token contains invalid cookie characters."
            )
        if len(self._staff_session_token) > 4096:
            raise RosieDazzlersConfigurationError(
                "Rosie Dazzlers staff session token is unexpectedly long."
            )
        if timeout_seconds <= 0 or timeout_seconds > 60:
            raise RosieDazzlersConfigurationError(
                "ROSIEDAZZLERS_TIMEOUT_SECONDS must be greater than 0 and at most 60."
            )
        self.timeout_seconds = timeout_seconds
        self._transport = transport

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        method = method.upper()
        if (method, path) not in _READ_CONTRACTS:
            raise RosieDazzlersConfigurationError(
                "Rosie Dazzlers request is outside the Build 038 read allow list."
            )

        headers = {
            "Accept": "application/json",
            "Cookie": f"rd_staff_session={self._staff_session_token}",
            "User-Agent": "Rosevear-AI-Hub/0.0.38",
        }
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
                headers=headers,
            ) as client:
                response = client.request(
                    method,
                    path,
                    params=params,
                    json=json_body,
                )
        except httpx.TimeoutException as exc:
            raise RosieDazzlersUnavailableError(
                "Rosie Dazzlers timed out during a read request."
            ) from exc
        except httpx.RequestError as exc:
            raise RosieDazzlersUnavailableError(
                "Rosie Dazzlers is unavailable for read access."
            ) from exc

        if response.status_code in {401, 403}:
            raise RosieDazzlersAuthenticationError(
                "Rosie Dazzlers rejected the configured staff session."
            )
        if response.status_code in {408, 425, 429, 502, 503, 504}:
            raise RosieDazzlersUnavailableError(
                "Rosie Dazzlers is temporarily unavailable for read access."
            )
        if response.status_code < 200 or response.status_code >= 300:
            raise RosieDazzlersRequestError(
                f"Rosie Dazzlers read request failed with HTTP {response.status_code}."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned invalid JSON."
            ) from exc
        if not isinstance(payload, dict):
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned an invalid read response."
            )
        if payload.get("ok") is False:
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers reported that the read request failed."
            )
        return payload

    def bookings(self, *, limit: int = 100) -> RosieDazzlersReadPage:
        """Read bounded booking summaries through the existing search contract."""

        bounded_limit = min(max(int(limit), 1), 100)
        payload = self._request_json(
            "POST",
            "/api/admin/bookings_search",
            json_body={"limit": bounded_limit},
        )
        raw_rows = payload.get("bookings")
        if not isinstance(raw_rows, list):
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned an invalid bookings response."
            )

        records: list[dict[str, Any]] = []
        for raw in raw_rows[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            booking_id = _text(raw.get("id"), max_length=64)
            if not booking_id:
                continue
            records.append(
                {
                    "booking_id": booking_id,
                    "service_date": _nullable_text(raw.get("service_date"), max_length=32),
                    "start_slot": _nullable_text(raw.get("start_slot"), max_length=32),
                    "status": _text(raw.get("status"), max_length=64),
                    "job_status": _text(raw.get("job_status"), max_length=64),
                    "customer_name": _text(raw.get("customer_name")),
                    "package_code": _text(raw.get("package_code"), max_length=100),
                    "vehicle_size": _text(raw.get("vehicle_size"), max_length=100),
                    "total_price": _number(raw.get("total_price"), minimum=0),
                    "deposit_amount": _number(raw.get("deposit_amount"), minimum=0),
                    "assigned_to": _nullable_text(raw.get("assigned_to")),
                    "progress_enabled": _boolean(raw.get("progress_enabled")),
                    "updated_at": _nullable_text(raw.get("updated_at")),
                }
            )
        return RosieDazzlersReadPage(records=tuple(records))

    def customers(self, *, limit: int = 100) -> RosieDazzlersReadPage:
        """Read bounded customer profiles through the existing customer list contract."""

        bounded_limit = min(max(int(limit), 1), 100)
        payload = self._request_json(
            "POST",
            "/api/admin/customers_list",
            json_body={"limit": bounded_limit},
        )
        raw_rows = payload.get("customer_profiles")
        if not isinstance(raw_rows, list):
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned an invalid customers response."
            )

        records: list[dict[str, Any]] = []
        for raw in raw_rows[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            customer_id = _text(raw.get("id"), max_length=64)
            customer_name = _text(raw.get("full_name") or raw.get("customer_name"))
            if not customer_id and not customer_name:
                continue
            records.append(
                {
                    "customer_id": customer_id or None,
                    "customer_name": customer_name,
                    "customer_email": _nullable_text(
                        raw.get("email") or raw.get("customer_email")
                    ),
                    "customer_phone": _nullable_text(
                        raw.get("phone") or raw.get("customer_phone"),
                        max_length=64,
                    ),
                    "tier_code": _nullable_text(raw.get("tier_code"), max_length=64),
                    "booking_count": _integer(raw.get("booking_count"), minimum=0),
                    "total_estimated_value": _number(
                        raw.get("total_estimated_value"),
                        minimum=0,
                    ),
                    "last_booking_at": _nullable_text(raw.get("last_booking_at")),
                    "updated_at": _nullable_text(raw.get("updated_at")),
                }
            )
        return RosieDazzlersReadPage(records=tuple(records))

    def jobs(self, *, limit: int = 80) -> RosieDazzlersReadPage:
        """Read the bounded mobile/detailer job workspace."""

        bounded_limit = min(max(int(limit), 1), 80)
        payload = self._request_json(
            "GET",
            "/api/detailer/jobs",
            params={"scope": "workspace"},
        )
        raw_rows = payload.get("jobs")
        if not isinstance(raw_rows, list):
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned an invalid jobs response."
            )

        records: list[dict[str, Any]] = []
        for raw in raw_rows[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            booking_id = _text(raw.get("id"), max_length=64)
            if not booking_id:
                continue
            records.append(
                {
                    "booking_id": booking_id,
                    "service_date": _nullable_text(raw.get("service_date"), max_length=32),
                    "start_slot": _nullable_text(raw.get("start_slot"), max_length=32),
                    "status": _text(raw.get("status"), max_length=64),
                    "job_status": _text(raw.get("job_status"), max_length=64),
                    "workflow_stage": _nullable_text(
                        raw.get("current_workflow_stage"),
                        max_length=100,
                    ),
                    "detailer_response_status": _nullable_text(
                        raw.get("detailer_response_status"),
                        max_length=100,
                    ),
                    "customer_name": _text(raw.get("customer_name")),
                    "package_code": _text(raw.get("package_code"), max_length=100),
                    "vehicle_size": _text(raw.get("vehicle_size"), max_length=100),
                    "assigned_to": _nullable_text(raw.get("assigned_to")),
                    "progress_enabled": _boolean(raw.get("progress_enabled")),
                    "completed_summary_status": _nullable_text(
                        raw.get("completed_summary_status"),
                        max_length=100,
                    ),
                }
            )
        return RosieDazzlersReadPage(records=tuple(records))

    def inventory(self, *, limit: int = 100) -> RosieDazzlersReadPage:
        """Read bounded gear and consumable inventory."""

        bounded_limit = min(max(int(limit), 1), 100)
        payload = self._request_json(
            "GET",
            "/api/admin/catalog_inventory_list",
        )
        raw_rows = payload.get("items")
        if not isinstance(raw_rows, list):
            raise RosieDazzlersRequestError(
                "Rosie Dazzlers returned an invalid inventory response."
            )

        records: list[dict[str, Any]] = []
        for raw in raw_rows[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            item_id = _text(raw.get("id"), max_length=64)
            name = _text(raw.get("name"))
            if not item_id or not name:
                continue
            records.append(
                {
                    "inventory_id": item_id,
                    "item_type": _text(raw.get("item_type"), max_length=64),
                    "name": name,
                    "category": _nullable_text(raw.get("category"), max_length=120),
                    "subcategory": _nullable_text(raw.get("subcategory"), max_length=120),
                    "qty_on_hand": _number(raw.get("qty_on_hand")),
                    "reorder_point": _number(raw.get("reorder_point"), minimum=0),
                    "stock_unit": _nullable_text(raw.get("stock_unit"), max_length=64),
                    "usage_unit": _nullable_text(raw.get("usage_unit"), max_length=64),
                    "usage_units_per_stock_unit": _number(
                        raw.get("usage_units_per_stock_unit"),
                        minimum=0,
                    ),
                    "preferred_vendor": _nullable_text(raw.get("preferred_vendor")),
                    "reuse_policy": _nullable_text(raw.get("reuse_policy"), max_length=64),
                    "purchase_date": _nullable_text(raw.get("purchase_date"), max_length=32),
                    "rating_value": _number(raw.get("rating_value"), minimum=0),
                    "updated_at": _nullable_text(raw.get("updated_at")),
                }
            )
        return RosieDazzlersReadPage(records=tuple(records))
