"""Bounded Yard Workers reads plus one Build 040 confirmed private job-comment write."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

_CORE_DATA_PATH = "/functions/v1/core-data-read"
_JOBS_MANAGE_PATH = "/functions/v1/jobs-manage"
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


class YardWorkersError(RuntimeError):
    """Base Yard Workers integration error."""


class YardWorkersConfigurationError(YardWorkersError):
    """Raised when local connector configuration is unsafe or incomplete."""


class YardWorkersAuthenticationError(YardWorkersError):
    """Raised when Yard Workers rejects the configured read authority."""


class YardWorkersUnavailableError(YardWorkersError):
    """Raised for retryable upstream availability failures."""


class YardWorkersRequestError(YardWorkersError):
    """Raised for sanitized upstream contract failures."""


@dataclass(frozen=True)
class YardWorkersReadPage:
    """Normalized bounded records returned by one Yard Workers read."""

    records: tuple[dict[str, Any], ...]
    next_cursor: str | None = None


def validate_yardworkers_base_url(value: str) -> str:
    """Require an origin-only HTTPS URL, with HTTP reserved for loopback tests."""

    normalized = str(value or "").strip().rstrip("/")
    if not normalized:
        raise YardWorkersConfigurationError("YARDWORKERS_BASE_URL is not configured.")

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise YardWorkersConfigurationError(
            "YARDWORKERS_BASE_URL must be an absolute HTTP(S) origin."
        )
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise YardWorkersConfigurationError(
            "YARDWORKERS_BASE_URL must not contain credentials, query text, or a fragment."
        )
    if parsed.path not in {"", "/"}:
        raise YardWorkersConfigurationError(
            "YARDWORKERS_BASE_URL must identify the Supabase project origin without an API path."
        )
    if parsed.scheme != "https" and parsed.hostname not in _LOOPBACK_HOSTS:
        raise YardWorkersConfigurationError("Remote Yard Workers origins must use HTTPS.")
    try:
        port = parsed.port
    except ValueError as exc:
        message = "YARDWORKERS_BASE_URL contains an invalid port."
        raise YardWorkersConfigurationError(message) from exc
    if port is not None and not 1 <= port <= 65535:
        raise YardWorkersConfigurationError("YARDWORKERS_BASE_URL contains an invalid port.")
    return normalized


def _credential(value: str, *, label: str, max_length: int) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise YardWorkersConfigurationError(f"{label} is not configured.")
    if "\r" in normalized or "\n" in normalized:
        raise YardWorkersConfigurationError(f"{label} contains invalid header characters.")
    if len(normalized) > max_length:
        raise YardWorkersConfigurationError(f"{label} is unexpectedly long.")
    return normalized


def _text(value: Any, *, max_length: int = 240) -> str:
    return str(value or "").strip()[:max_length]


def _nullable_text(value: Any, *, max_length: int = 240) -> str | None:
    normalized = _text(value, max_length=max_length)
    return normalized or None


def _number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


class YardWorkersClient:
    """Server-side adapter over Yard Workers' protected Shared Core read endpoint."""

    def __init__(
        self,
        base_url: str,
        access_token: str,
        anon_key: str,
        *,
        timeout_seconds: float = 8.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.base_url = validate_yardworkers_base_url(base_url)
        self._access_token = _credential(
            access_token,
            label="Yard Workers access token",
            max_length=8192,
        )
        self._anon_key = _credential(
            anon_key,
            label="Yard Workers API key",
            max_length=8192,
        )
        if timeout_seconds <= 0 or timeout_seconds > 60:
            raise YardWorkersConfigurationError(
                "YARDWORKERS_TIMEOUT_SECONDS must be greater than 0 and at most 60."
            )
        self.timeout_seconds = timeout_seconds
        self._transport = transport

    def _read_entities(
        self,
        entities: tuple[str, ...],
        *,
        limit: int,
    ) -> dict[str, list[dict[str, Any]]]:
        bounded_limit = min(max(int(limit), 1), 100)
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
            "apikey": self._anon_key,
            "User-Agent": "Rosevear-AI-Hub/0.0.40",
        }
        body = {
            "module_key": "jobs",
            "entities": list(entities),
            "limit": bounded_limit,
        }

        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
                headers=headers,
            ) as client:
                response = client.post(_CORE_DATA_PATH, json=body)
        except httpx.TimeoutException as exc:
            raise YardWorkersUnavailableError(
                "Yard Workers timed out during a read request."
            ) from exc
        except httpx.RequestError as exc:
            raise YardWorkersUnavailableError(
                "Yard Workers is unavailable for read access."
            ) from exc

        if response.status_code in {401, 403}:
            raise YardWorkersAuthenticationError(
                "Yard Workers rejected the configured access token or Jobs view permission."
            )
        if response.status_code in {408, 425, 429, 502, 503, 504}:
            raise YardWorkersUnavailableError(
                "Yard Workers is temporarily unavailable for read access."
            )
        if response.status_code < 200 or response.status_code >= 300:
            raise YardWorkersRequestError(
                f"Yard Workers read request failed with HTTP {response.status_code}."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise YardWorkersRequestError("Yard Workers returned invalid JSON.") from exc
        if not isinstance(payload, dict) or payload.get("ok") is not True:
            raise YardWorkersRequestError("Yard Workers reported that the read request failed.")
        if payload.get("read_only") is not True:
            raise YardWorkersRequestError(
                "Yard Workers did not confirm the protected read-only contract."
            )
        data = payload.get("data")
        if not isinstance(data, dict):
            raise YardWorkersRequestError("Yard Workers returned an invalid read response.")

        result: dict[str, list[dict[str, Any]]] = {}
        for entity in entities:
            rows = data.get(entity)
            if not isinstance(rows, list):
                raise YardWorkersRequestError(
                    f"Yard Workers returned an invalid {entity} read response."
                )
            result[entity] = [row for row in rows if isinstance(row, dict)]
        return result

    def clients(self, *, limit: int = 100) -> YardWorkersReadPage:
        """Read bounded client, site, and service-document summaries."""

        bounded_limit = min(max(int(limit), 1), 100)
        data = self._read_entities(
            ("customer", "customer_site", "service_document"),
            limit=bounded_limit,
        )
        records: list[dict[str, Any]] = []

        for row in data["customer"]:
            client_id = _text(row.get("id"), max_length=80)
            if not client_id:
                continue
            records.append(
                {
                    "record_type": "client",
                    "client_id": client_id,
                    "client_code": _nullable_text(row.get("client_code"), max_length=80),
                    "legal_name": _nullable_text(row.get("legal_name")),
                    "display_name": _nullable_text(row.get("display_name")),
                }
            )

        for row in data["customer_site"]:
            site_id = _text(row.get("id"), max_length=80)
            if not site_id:
                continue
            records.append(
                {
                    "record_type": "site",
                    "site_id": site_id,
                    "client_id": _nullable_text(row.get("client_id"), max_length=80),
                    "site_code": _nullable_text(row.get("site_code"), max_length=80),
                    "site_name": _nullable_text(row.get("site_name")),
                    "city": _nullable_text(row.get("city"), max_length=120),
                    "province": _nullable_text(row.get("province"), max_length=80),
                    "postal_code": _nullable_text(row.get("postal_code"), max_length=32),
                    "approximate_serviceable_area": _number(
                        row.get("approximate_serviceable_area")
                    ),
                    "area_unit": _nullable_text(row.get("area_unit"), max_length=40),
                }
            )

        for row in data["service_document"]:
            document_id = _text(row.get("id"), max_length=80)
            if not document_id:
                continue
            records.append(
                {
                    "record_type": "service_document",
                    "document_id": document_id,
                    "document_number": _nullable_text(
                        row.get("document_number"),
                        max_length=100,
                    ),
                    "document_kind": _nullable_text(
                        row.get("document_kind"),
                        max_length=80,
                    ),
                    "document_status": _nullable_text(
                        row.get("document_status"),
                        max_length=80,
                    ),
                    "agreement_id": _nullable_text(row.get("agreement_id"), max_length=80),
                    "estimate_id": _nullable_text(row.get("estimate_id"), max_length=80),
                    "job_id": _nullable_text(row.get("job_id"), max_length=80),
                }
            )

        return YardWorkersReadPage(records=tuple(records[:bounded_limit]))

    def jobs(self, *, limit: int = 100) -> YardWorkersReadPage:
        """Read bounded canonical Yard Workers job summaries."""

        bounded_limit = min(max(int(limit), 1), 100)
        data = self._read_entities(("job",), limit=bounded_limit)
        records: list[dict[str, Any]] = []
        for row in data["job"][:bounded_limit]:
            job_id = _text(row.get("id"), max_length=80)
            if not job_id:
                continue
            records.append(
                {
                    "job_id": job_id,
                    "job_code": _nullable_text(row.get("job_code"), max_length=100),
                    "job_name": _nullable_text(row.get("job_name")),
                    "status": _nullable_text(row.get("status"), max_length=80),
                    "priority": _nullable_text(row.get("priority"), max_length=80),
                    "start_date": _nullable_text(row.get("start_date"), max_length=40),
                    "end_date": _nullable_text(row.get("end_date"), max_length=40),
                }
            )
        return YardWorkersReadPage(records=tuple(records))

    def crew(self, *, limit: int = 100) -> YardWorkersReadPage:
        """Read bounded active workforce identity summaries."""

        bounded_limit = min(max(int(limit), 1), 100)
        data = self._read_entities(("profile",), limit=bounded_limit)
        records: list[dict[str, Any]] = []
        for row in data["profile"][:bounded_limit]:
            profile_id = _text(row.get("id"), max_length=80)
            if not profile_id:
                continue
            records.append(
                {
                    "profile_id": profile_id,
                    "full_name": _nullable_text(row.get("full_name")),
                    "role": _nullable_text(row.get("role"), max_length=80),
                }
            )
        return YardWorkersReadPage(records=tuple(records))

    def equipment(self, *, limit: int = 100) -> YardWorkersReadPage:
        """Read bounded active equipment identity summaries."""

        bounded_limit = min(max(int(limit), 1), 100)
        data = self._read_entities(("equipment",), limit=bounded_limit)
        records: list[dict[str, Any]] = []
        for row in data["equipment"][:bounded_limit]:
            equipment_id = _text(row.get("id"), max_length=80)
            if not equipment_id:
                continue
            records.append(
                {
                    "equipment_id": equipment_id,
                    "equipment_code": _nullable_text(
                        row.get("equipment_code"),
                        max_length=100,
                    ),
                    "item_name": _nullable_text(row.get("item_name")),
                    "equipment_category": _nullable_text(
                        row.get("equipment_category"),
                        max_length=120,
                    ),
                }
            )
        return YardWorkersReadPage(records=tuple(records))

    def create_private_job_comment(
        self,
        *,
        job_id: int,
        comment_text: str,
    ) -> dict[str, Any]:
        """Create one internal-only job update without changing instructions or
        client visibility.
        """

        if isinstance(job_id, bool) or int(job_id) <= 0:
            raise YardWorkersRequestError("Yard Workers job_id must be a positive integer.")
        clean_comment = str(comment_text or "").strip()
        if not clean_comment or len(clean_comment) > 2000:
            raise YardWorkersRequestError(
                "Yard Workers private job comment must contain 1 to 2000 characters."
            )

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
            "apikey": self._anon_key,
            "User-Agent": "Rosevear-AI-Hub/0.0.40",
        }
        body = {
            "entity": "job_comment",
            "action": "create",
            "job_id": int(job_id),
            "comment_type": "update",
            "comment_text": clean_comment,
            "is_special_instruction": False,
            "visible_to_client": False,
            "set_job_instruction": False,
        }

        try:
            with httpx.Client(
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                transport=self._transport,
                follow_redirects=False,
                headers=headers,
            ) as client:
                response = client.post(_JOBS_MANAGE_PATH, json=body)
        except httpx.TimeoutException as exc:
            raise YardWorkersUnavailableError(
                "Yard Workers timed out during a confirmed write request."
            ) from exc
        except httpx.RequestError as exc:
            raise YardWorkersUnavailableError(
                "Yard Workers is unavailable for confirmed write access."
            ) from exc

        if response.status_code in {401, 403}:
            raise YardWorkersAuthenticationError(
                "Yard Workers rejected the configured access token, Jobs create permission, "
                "or Supervisor+ role required for confirmed writes."
            )
        if response.status_code in {408, 425, 429, 502, 503, 504}:
            raise YardWorkersUnavailableError(
                "Yard Workers is temporarily unavailable for confirmed write access."
            )
        if response.status_code < 200 or response.status_code >= 300:
            raise YardWorkersRequestError(
                f"Yard Workers confirmed write failed with HTTP {response.status_code}."
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise YardWorkersRequestError("Yard Workers returned invalid JSON.") from exc
        if not isinstance(payload, dict) or payload.get("ok") is not True:
            raise YardWorkersRequestError("Yard Workers reported that the confirmed write failed.")
        record = payload.get("record")
        if not isinstance(record, dict):
            raise YardWorkersRequestError("Yard Workers returned an invalid job-comment response.")
        try:
            returned_job_id = int(record.get("job_id") or 0)
        except (TypeError, ValueError):
            returned_job_id = 0
        record_id = str(record.get("id") or "").strip()
        if returned_job_id != int(job_id) or not record_id:
            raise YardWorkersRequestError("Yard Workers returned an invalid job-comment identity.")
        return {
            "accepted": True,
            "comment_id": record_id,
            "job_id": returned_job_id,
            "comment_type": "update",
            "visible_to_client": False,
            "is_special_instruction": False,
        }
