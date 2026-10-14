"""Build 070: short-lived, owner-bound ONVIF discovery review tickets.

A discovery preview never writes to the database. Only previously scanned,
locally vetted ONVIF devices can be accepted, once, with explicit selection.
The cache is in memory and intentionally does not survive server restarts.
"""

from __future__ import annotations

import ipaddress
import secrets
import time
from dataclasses import dataclass
from threading import Lock
from urllib.parse import urlparse

from rosevear_ai_hub.integrations.onvif import DiscoveredONVIFDevice

_TTL_SECONDS = 300
_MAX_TICKETS = 32
_MAX_CANDIDATES = 32
_lock = Lock()


@dataclass(frozen=True)
class DiscoveryTicket:
    owner_id: int
    expires_at: float
    devices: dict[str, DiscoveredONVIFDevice]


_tickets: dict[str, DiscoveryTicket] = {}


def _safe_device(item: DiscoveredONVIFDevice) -> bool:
    try:
        host = ipaddress.ip_address(item.host.strip("[]"))
        parsed = urlparse(item.service_url)
        service_host = ipaddress.ip_address((parsed.hostname or "").strip("[]"))
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        return False
    return (
        (host.is_private or host.is_loopback or host.is_link_local)
        and host == service_host
        and parsed.scheme in {"http", "https"}
        and not parsed.username
        and not parsed.password
        and not parsed.query
        and not parsed.fragment
        and port == item.port
        and 1 <= port <= 65535
        and bool(item.endpoint_uuid)
        and len(item.endpoint_uuid) <= 255
    )


def create_ticket(
    owner_id: int, devices: list[DiscoveredONVIFDevice]
) -> tuple[str, list[DiscoveredONVIFDevice]]:
    selected: dict[str, DiscoveredONVIFDevice] = {}
    for device in devices:
        if _safe_device(device):
            selected.setdefault(device.endpoint_uuid, device)
        if len(selected) == _MAX_CANDIDATES:
            break

    with _lock:
        now = time.monotonic()
        for old, ticket in list(_tickets.items()):
            if ticket.expires_at <= now:
                del _tickets[old]
        while len(_tickets) >= _MAX_TICKETS:
            del _tickets[next(iter(_tickets))]
        key = secrets.token_urlsafe(32)
        _tickets[key] = DiscoveryTicket(owner_id, now + _TTL_SECONDS, selected)
    return key, list(selected.values())


def consume_ticket(
    owner_id: int, key: str, selected_ids: list[str]
) -> list[DiscoveredONVIFDevice] | None:
    with _lock:
        ticket = _tickets.get(key)
        if ticket is None or ticket.owner_id != owner_id:
            return None
        if ticket.expires_at <= time.monotonic():
            del _tickets[key]
            return None
        if (
            not selected_ids
            or len(selected_ids) > _MAX_CANDIDATES
            or len(set(selected_ids)) != len(selected_ids)
            or any(item not in ticket.devices for item in selected_ids)
        ):
            return None
        # Consume before registration to prevent re-use or double submits.
        del _tickets[key]
        return [ticket.devices[item] for item in selected_ids]
