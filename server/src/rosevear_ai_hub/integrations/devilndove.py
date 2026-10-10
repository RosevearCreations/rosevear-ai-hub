"""Bounded Devil n Dove read adapter plus Build 040 confirmed draft write."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx


class DevilNDoveError(RuntimeError):
    """Base sanitized Devil n Dove integration error."""


class DevilNDoveConfigurationError(DevilNDoveError):
    """The connector configuration is missing or unsafe."""


class DevilNDoveAuthenticationError(DevilNDoveError):
    """The configured admin session credential was rejected."""


class DevilNDoveUnavailableError(DevilNDoveError):
    """Devil n Dove could not be reached or is temporarily unavailable."""


class DevilNDoveRequestError(DevilNDoveError):
    """Devil n Dove returned an unusable provider response."""


@dataclass(frozen=True)
class DevilNDoveReadPage:
    """One bounded page of normalized business records."""

    records: tuple[dict[str, Any], ...]
    next_cursor: str | None = None


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    if host.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def validate_devilndove_base_url(value: str) -> str:
    """Require HTTPS remotely while permitting HTTP for loopback testing."""

    normalized = value.strip().rstrip("/")
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise DevilNDoveConfigurationError(
            "DEVILNDOVE_BASE_URL must be a valid http:// or https:// URL."
        )
    if parsed.scheme == "http" and not _is_loopback(parsed.hostname):
        raise DevilNDoveConfigurationError(
            "DEVILNDOVE_BASE_URL must use HTTPS unless it points to localhost."
        )
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise DevilNDoveConfigurationError(
            "DEVILNDOVE_BASE_URL must not contain credentials, query, or fragment."
        )
    if parsed.path not in {"", "/"}:
        raise DevilNDoveConfigurationError(
            "DEVILNDOVE_BASE_URL must identify the site origin without an API path."
        )
    try:
        port = parsed.port
    except ValueError as exc:
        raise DevilNDoveConfigurationError("DEVILNDOVE_BASE_URL contains an invalid port.") from exc
    if port is not None and not 1 <= port <= 65535:
        raise DevilNDoveConfigurationError("DEVILNDOVE_BASE_URL contains an invalid port.")
    return normalized


def _text(value: Any, *, max_length: int = 240) -> str:
    return str(value or "").strip()[:max_length]


def _integer(value: Any, *, minimum: int | None = None) -> int:
    if isinstance(value, bool):
        number = 0
    else:
        try:
            number = int(value or 0)
        except (TypeError, ValueError):
            number = 0
    return max(minimum, number) if minimum is not None else number


def _nullable_text(value: Any, *, max_length: int = 240) -> str | None:
    normalized = _text(value, max_length=max_length)
    return normalized or None


class DevilNDoveClient:
    """Server-side client for bounded Devil n Dove reads and one confirmed draft write."""

    def __init__(
        self,
        base_url: str,
        credential: str,
        *,
        timeout_seconds: float = 8.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = validate_devilndove_base_url(base_url)
        self._credential = credential.strip()
        if not self._credential:
            raise DevilNDoveConfigurationError("Devil n Dove admin credential is not configured.")
        if "\r" in self._credential or "\n" in self._credential:
            raise DevilNDoveConfigurationError(
                "Devil n Dove admin credential contains invalid header characters."
            )
        if len(self._credential) > 8192:
            raise DevilNDoveConfigurationError(
                "Devil n Dove admin credential is unexpectedly long."
            )
        if timeout_seconds <= 0 or timeout_seconds > 60:
            raise DevilNDoveConfigurationError(
                "DEVILNDOVE_TIMEOUT_SECONDS must be greater than 0 and at most 60."
            )
        self.timeout_seconds = timeout_seconds
        self._transport = transport

    def _request_json(
        self,
        path: str,
        *,
        params: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self._credential}",
            "User-Agent": "Rosevear-AI-Hub/0.0.40",
        }
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
                headers=headers,
            ) as client:
                response = client.get(path, params=params)
        except httpx.TimeoutException as exc:
            raise DevilNDoveUnavailableError(
                "Devil n Dove timed out during a read request."
            ) from exc
        except httpx.RequestError as exc:
            raise DevilNDoveUnavailableError(
                "Devil n Dove is unavailable for read access."
            ) from exc

        if response.status_code in {401, 403}:
            raise DevilNDoveAuthenticationError(
                "Devil n Dove rejected the configured admin credential."
            )
        if response.status_code in {408, 425, 429, 502, 503, 504}:
            raise DevilNDoveUnavailableError(
                "Devil n Dove is temporarily unavailable for read access."
            )
        if response.status_code < 200 or response.status_code >= 300:
            raise DevilNDoveRequestError(
                f"Devil n Dove read request failed with HTTP {response.status_code}."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise DevilNDoveRequestError("Devil n Dove returned invalid JSON.") from exc
        if not isinstance(payload, dict):
            raise DevilNDoveRequestError("Devil n Dove returned an invalid read response.")
        if payload.get("ok") is False:
            raise DevilNDoveRequestError("Devil n Dove reported that the read request failed.")
        return payload

    def _post_json(
        self,
        path: str,
        *,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._credential}",
            "User-Agent": "Rosevear-AI-Hub/0.0.40",
        }
        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
                headers=headers,
            ) as client:
                response = client.post(path, json=body)
        except httpx.TimeoutException as exc:
            raise DevilNDoveUnavailableError(
                "Devil n Dove timed out during a confirmed write request."
            ) from exc
        except httpx.RequestError as exc:
            raise DevilNDoveUnavailableError(
                "Devil n Dove is unavailable for confirmed write access."
            ) from exc

        if response.status_code in {401, 403}:
            raise DevilNDoveAuthenticationError(
                "Devil n Dove rejected the configured admin credential."
            )
        if response.status_code in {408, 425, 429, 502, 503, 504}:
            raise DevilNDoveUnavailableError(
                "Devil n Dove is temporarily unavailable for confirmed write access."
            )
        if response.status_code < 200 or response.status_code >= 300:
            raise DevilNDoveRequestError(
                f"Devil n Dove confirmed write failed with HTTP {response.status_code}."
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise DevilNDoveRequestError("Devil n Dove returned invalid JSON.") from exc
        if not isinstance(payload, dict) or payload.get("ok") is not True:
            raise DevilNDoveRequestError(
                "Devil n Dove reported that the confirmed write failed."
            )
        return payload

    def catalogue(
        self,
        *,
        limit: int = 50,
        cursor: str | None = None,
    ) -> DevilNDoveReadPage:
        """Read the lightweight Product picker rather than the heavy Product rollup."""

        bounded_limit = min(max(int(limit), 1), 50)
        params = {"limit": str(bounded_limit)}
        if cursor:
            try:
                cursor_value = int(cursor)
            except ValueError as exc:
                raise DevilNDoveRequestError(
                    "Devil n Dove catalogue cursor must be a positive integer."
                ) from exc
            if cursor_value <= 0:
                raise DevilNDoveRequestError(
                    "Devil n Dove catalogue cursor must be a positive integer."
                )
            params["cursor"] = str(cursor_value)

        payload = self._request_json("/api/admin/product-picker", params=params)
        raw_products = payload.get("products")
        if not isinstance(raw_products, list):
            raise DevilNDoveRequestError("Devil n Dove returned an invalid catalogue response.")

        records: list[dict[str, Any]] = []
        for raw in raw_products[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            product_id = _integer(raw.get("product_id"), minimum=0)
            name = _text(raw.get("name"))
            if product_id <= 0 or not name:
                continue
            records.append(
                {
                    "product_id": product_id,
                    "name": name,
                    "slug": _text(raw.get("slug")),
                    "sku": _text(raw.get("sku")),
                    "status": _text(raw.get("status")),
                    "updated_at": _nullable_text(raw.get("updated_at")),
                }
            )

        pagination = payload.get("pagination")
        next_cursor: str | None = None
        if isinstance(pagination, dict):
            raw_cursor = _integer(pagination.get("next_cursor"), minimum=0)
            if raw_cursor > 0:
                next_cursor = str(raw_cursor)
        return DevilNDoveReadPage(
            records=tuple(records),
            next_cursor=next_cursor,
        )

    def orders(self, *, limit: int = 100) -> DevilNDoveReadPage:
        """Read a bounded recent-order projection."""

        bounded_limit = min(max(int(limit), 1), 100)
        payload = self._request_json(
            "/api/admin/orders",
            params={"limit": str(bounded_limit)},
        )
        raw_orders = payload.get("orders")
        if not isinstance(raw_orders, list):
            raise DevilNDoveRequestError("Devil n Dove returned an invalid orders response.")

        records: list[dict[str, Any]] = []
        for raw in raw_orders[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            order_id = _integer(raw.get("order_id"), minimum=0)
            if order_id <= 0:
                continue
            records.append(
                {
                    "order_id": order_id,
                    "order_number": _text(raw.get("order_number")),
                    "customer_name": _text(raw.get("customer_name")),
                    "customer_email": _text(raw.get("customer_email")),
                    "order_status": _text(raw.get("order_status")),
                    "payment_status": _text(
                        raw.get("derived_payment_status") or raw.get("payment_status")
                    ),
                    "fulfillment_type": _text(raw.get("fulfillment_type")),
                    "currency": (_text(raw.get("currency"), max_length=8) or "CAD"),
                    "total_cents": _integer(
                        raw.get("total_cents"),
                        minimum=0,
                    ),
                    "outstanding_cents": _integer(
                        raw.get("outstanding_cents"),
                        minimum=0,
                    ),
                    "item_count": _integer(
                        raw.get("item_count"),
                        minimum=0,
                    ),
                    "created_at": _nullable_text(raw.get("created_at")),
                    "updated_at": _nullable_text(raw.get("updated_at")),
                }
            )
        return DevilNDoveReadPage(records=tuple(records))

    def inventory(self, *, limit: int = 100) -> DevilNDoveReadPage:
        """Read the dedicated Inventory-owned read contract."""

        bounded_limit = min(max(int(limit), 1), 100)
        payload = self._request_json(
            "/api/admin/contracts/inventory-read",
            params={
                "limit": str(bounded_limit),
                "include_tools": "false",
            },
        )
        raw_items = payload.get("items")
        if not isinstance(raw_items, list):
            raise DevilNDoveRequestError("Devil n Dove returned an invalid inventory response.")

        records: list[dict[str, Any]] = []
        for raw in raw_items[:bounded_limit]:
            if not isinstance(raw, dict):
                continue
            item_id = _integer(
                raw.get("site_item_inventory_id"),
                minimum=0,
            )
            name = _text(raw.get("item_name"))
            if item_id <= 0 or not name:
                continue
            records.append(
                {
                    "inventory_id": item_id,
                    "source_type": _text(raw.get("source_type")),
                    "external_key": _text(raw.get("external_key")),
                    "item_name": name,
                    "category": _text(raw.get("category")),
                    "on_hand_quantity": _integer(raw.get("on_hand_quantity")),
                    "reserved_quantity": _integer(raw.get("reserved_quantity")),
                    "available_quantity": _integer(raw.get("available_quantity")),
                    "unit_cost_cents": _integer(
                        raw.get("unit_cost_cents"),
                        minimum=0,
                    ),
                    "stock_unit_label": _text(raw.get("stock_unit_label")),
                    "supplier_name": _text(raw.get("supplier_name")),
                    "supplier_sku": _text(raw.get("supplier_sku")),
                }
            )
        return DevilNDoveReadPage(records=tuple(records))

    def create_story_draft(
        self,
        *,
        product_id: int,
        heading: str,
        summary: str,
        body: str,
    ) -> dict[str, Any]:
        """Create one public-story draft that cannot be published by this Hub call."""

        if isinstance(product_id, bool) or int(product_id) <= 0:
            raise DevilNDoveRequestError("Devil n Dove product_id must be a positive integer.")
        clean_heading = str(heading or "").strip()
        clean_summary = str(summary or "").strip()
        clean_body = str(body or "").strip()
        if not clean_heading or len(clean_heading) > 180:
            raise DevilNDoveRequestError(
                "Devil n Dove story heading must contain 1 to 180 characters."
            )
        if not clean_summary or len(clean_summary) > 500:
            raise DevilNDoveRequestError(
                "Devil n Dove story summary must contain 1 to 500 characters."
            )
        if len(clean_body) > 5000:
            raise DevilNDoveRequestError(
                "Devil n Dove story body must be at most 5000 characters."
            )

        payload = self._post_json(
            "/api/admin/product-story-notes",
            body={
                "action": "save",
                "product_id": int(product_id),
                "story_heading": clean_heading,
                "story_summary": clean_summary,
                "story_body": clean_body,
                "process_notes": "",
                "care_notes": "",
                "local_pickup_note": "",
                "display_status": "draft",
                "story_source": "rosevear_ai_hub",
                "privacy_status": "needs_review",
                "review_notes": (
                    "Created from Rosevear AI Hub. Review privacy and wording before public use."
                ),
                "internal_notes": "",
            },
        )
        note = payload.get("note")
        if not isinstance(note, dict):
            raise DevilNDoveRequestError(
                "Devil n Dove returned an invalid story-draft response."
            )
        note_id = _integer(note.get("product_story_public_note_id"), minimum=0)
        returned_product_id = _integer(note.get("product_id"), minimum=0)
        if returned_product_id != int(product_id) or note_id <= 0:
            raise DevilNDoveRequestError(
                "Devil n Dove returned an invalid story-draft identity."
            )
        return {
            "accepted": True,
            "product_id": returned_product_id,
            "note_id": note_id,
            "display_status": "draft",
            "privacy_status": "needs_review",
        }
