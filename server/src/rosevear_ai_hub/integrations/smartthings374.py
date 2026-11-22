"""Build 374: bounded, read-only Samsung SmartThings REST integration.

Only fixed-host HTTPS GET requests. No polling, pairing, device commands,
provider writes, callbacks or background jobs.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlsplit

import httpx

ORIGIN = "https://api.smartthings.com"
IDENTITY = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class SmartThingsReadError(RuntimeError):
    """A fixed, sanitized source failure code, never vendor response text."""


class SmartThingsReadClient:
    def __init__(self, token: str, *, transport: httpx.AsyncBaseTransport | None = None):
        if not token or len(token) > 4096 or any(c in token for c in "\r\n"):
            raise SmartThingsReadError("HOLD_INVALID_TOKEN")
        self.token = token
        self.transport = transport

    async def _list(self, client: httpx.AsyncClient, path: str) -> list[dict]:
        next_path: str | None = path
        seen: set[str] = set()
        rows: list[dict] = []
        for _ in range(4):
            if next_path is None:
                return rows
            if next_path in seen:
                raise SmartThingsReadError("HOLD_REPEATED_PAGE")
            seen.add(next_path)
            try:
                response = await client.get(next_path)
            except (httpx.TimeoutException, httpx.RequestError) as exc:
                raise SmartThingsReadError("HOLD_VENDOR_OFFLINE") from exc
            if response.status_code == 401:
                raise SmartThingsReadError("HOLD_TOKEN_EXPIRED")
            if response.status_code == 403:
                raise SmartThingsReadError("HOLD_SCOPE_DENIED")
            if response.status_code == 429:
                raise SmartThingsReadError("HOLD_RATE_LIMITED")
            if response.status_code != 200:
                raise SmartThingsReadError("HOLD_VENDOR_READ_FAILED")
            if len(response.content) > 512_000:
                raise SmartThingsReadError("HOLD_TOO_LARGE")
            try:
                payload = response.json()
            except ValueError as exc:
                raise SmartThingsReadError("HOLD_INVALID_JSON") from exc
            if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
                raise SmartThingsReadError("HOLD_INCOMPLETE_PAGE")
            batch = payload["items"]
            if len(batch) > 200 or not all(isinstance(x, dict) for x in batch):
                raise SmartThingsReadError("HOLD_MALFORMED_ITEMS")
            rows.extend(batch)
            if len(rows) > 500:
                raise SmartThingsReadError("HOLD_INVENTORY_LIMIT")
            links = payload.get("_links") or {}
            if not isinstance(links, dict):
                raise SmartThingsReadError("HOLD_MALFORMED_PAGE_LINK")
            link = links.get("next")
            if link is None:
                return rows
            if not isinstance(link, dict) or not isinstance(link.get("href"), str):
                raise SmartThingsReadError("HOLD_MALFORMED_PAGE_LINK")
            href = link["href"]
            url = urlsplit(href)
            if (
                url.scheme != "https"
                or url.netloc != "api.smartthings.com"
                or url.path != path
                or url.username is not None
                or url.password is not None
                or bool(url.fragment)
                or len(href) > 512
            ):
                raise SmartThingsReadError("HOLD_UNSAFE_PAGINATION")
            params = parse_qs(url.query, keep_blank_values=True)
            if any(key not in {"page", "max", "isNext"} for key in params):
                raise SmartThingsReadError("HOLD_UNSAFE_PAGINATION")
            if any(len(v) != 1 or len(v[0]) > 12 for v in params.values()):
                raise SmartThingsReadError("HOLD_UNSAFE_PAGINATION")
            next_path = url.path + ("?" + url.query if url.query else "")
        raise SmartThingsReadError("HOLD_PAGE_LIMIT")

    async def snapshot(self) -> dict:
        async with httpx.AsyncClient(
            base_url=ORIGIN,
            headers={"Authorization": f"Bearer {self.token}", "Accept": "application/json"},
            timeout=6,
            follow_redirects=False,
            trust_env=False,
            transport=self.transport,
        ) as client:
            locations = await self._list(client, "/v1/locations")
            devices = await self._list(client, "/v1/devices")
            if len(locations) > 12:
                raise SmartThingsReadError("HOLD_LOCATION_LIMIT")
            rooms = []
            for location in locations:
                identity = location.get("locationId")
                if not isinstance(identity, str) or not IDENTITY.fullmatch(identity):
                    raise SmartThingsReadError("HOLD_LOCATION_INVALID")
                for room in await self._list(client, f"/v1/locations/{identity}/rooms"):
                    rooms.append({**room, "sourceLocationId": identity})
                    if len(rooms) > 500:
                        raise SmartThingsReadError("HOLD_ROOM_LIMIT")
            return {"locations": locations, "rooms": rooms, "devices": devices}
