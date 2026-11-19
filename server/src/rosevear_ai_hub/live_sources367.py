"""Build 367: explicit private TLS + pinned Ed25519 source receipts.

This module NEVER schedules polling, activates Comms, controls devices, or claims
that an HTTPS fetch is an independently verified three-Master delivery ACK.
"""
from __future__ import annotations

import ipaddress
import json
import os
import platform
import re
import sqlite3
import ssl
import time
from contextlib import closing
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx

from rosevear_ai_hub.api.server_shell365 import TAG
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.seven_app_stats365 import APPS, HEX40, HEX64, verify_peer365
from rosevear_ai_hub.sysop_history366 import _safe_path, append_verified366

SCHEMA = "rosevear.hub.live-sources367.v1"
PATH = "/internal/rosevear/sysop/telemetry/v1"
MAX_RESPONSE = 16_384
TTL_MS = 90_000
PRIVATE_RANGES = tuple(
    ipaddress.ip_network(cidr)
    for cidr in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10")
)
DDL = """CREATE TABLE IF NOT EXISTS verified_tls_sources367 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    source_commit TEXT NOT NULL,
    received_ms INTEGER NOT NULL,
    issued_ms INTEGER NOT NULL,
    UNIQUE(app_id,event_id)
)"""
# Only non-sensitive event identifiers/metadata; no URL, IP, keys, token or raw JSON.


def safe_peer_url367(url: str) -> str:
    """Reject public hosts, redirects, URL credentials, query strings and arbitrary paths."""
    if not isinstance(url, str) or len(url) > 256 or any(ch.isspace() for ch in url):
        raise ValueError("HOLD_SYSOP367_INVALID_SOURCE_URL")
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        address = ipaddress.IPv4Address(host)
        port = parsed.port or 443
    except (ValueError, TypeError):
        raise ValueError("HOLD_SYSOP367_PRIVATE_IPV4_REQUIRED") from None
    if (
        parsed.scheme != "https"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path != PATH
        or parsed.port not in (None, 443, 8443)
        or not any(address in network for network in PRIVATE_RANGES)
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or url != f"https://{host}{':' + str(port) if parsed.port else ''}{PATH}"
    ):
        raise ValueError("HOLD_SYSOP367_PRIVATE_TLS_ENDPOINT_REQUIRED")
    return url


def _private_bytes367(value: str | None, *, maximum: int) -> bytes:
    """Read a pre-provisioned absolute private file; never accept inline secrets."""
    if not value:
        raise ValueError("HOLD_SYSOP367_PRIVATE_FILE_NOT_ENROLLED")
    path = Path(value)
    if not path.is_absolute() or path.is_symlink() or path.parent.is_symlink():
        raise ValueError("HOLD_SYSOP367_UNSAFE_PRIVATE_FILE")
    if not path.is_file() or not 1 <= path.stat().st_size <= maximum:
        raise ValueError("HOLD_SYSOP367_PRIVATE_FILE_UNAVAILABLE")
    if Path(__file__).resolve().parents[3] in path.resolve().parents:
        raise ValueError("HOLD_SYSOP367_PRIVATE_FILE_IN_SOURCE")
    return path.read_bytes()


def _load_enrollment367(app_id: str) -> tuple[str, str, bytes, str, str, ssl.SSLContext]:
    if app_id not in APPS:
        raise ValueError("HOLD_SYSOP367_UNKNOWN_APP")
    tag = TAG[app_id]
    root = "ROSEVEAR_SYSOP367_" + tag + "_"
    base = "ROSEVEAR_SYSOP365_" + tag + "_"
    url = safe_peer_url367(os.environ.get(root + "URL", ""))
    token = _private_bytes367(os.environ.get(root + "READ_TOKEN_PATH"), maximum=512).decode("ascii")
    if re.fullmatch(r"[A-Za-z0-9._~-]{24,256}", token) is None:
        raise ValueError("HOLD_SYSOP367_TOKEN_INVALID")
    public_key = _private_bytes367(os.environ.get(base + "PUBLIC_KEY_PATH"), maximum=4096)
    pin = os.environ.get(base + "PUBLIC_KEY_PIN", "")
    commit = os.environ.get(base + "SOURCE_COMMIT", "")
    if HEX64.fullmatch(pin) is None or HEX40.fullmatch(commit) is None:
        raise ValueError("HOLD_SYSOP367_SOURCE_PIN_OR_COMMIT_MISSING")
    cert_path = os.environ.get(root + "TLS_CA_PATH")
    _private_bytes367(cert_path, maximum=16384)
    # The independent private CA must authenticate the peer certificate SAN,
    # including the exact IP in the owner-approved URL; never trust OS proxies.
    context = ssl.create_default_context(cafile=cert_path)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED
    return url, token, public_key, pin, commit, context


def validate_get367(
    response: httpx.Response,
    *,
    app_id: str,
    public_key: bytes,
    pin: str,
    expected_commit: str,
    now_ms: int,
) -> dict[str, Any]:
    """Validate only an exact-size, signed and fresh read-only aggregate."""
    if response.status_code != 200 or response.is_redirect:
        raise ValueError("HOLD_SYSOP367_SOURCE_HTTP")
    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        raise ValueError("HOLD_SYSOP367_SOURCE_CONTENT_TYPE")
    # Strictly bounded streaming so the remote producer cannot force an unbounded read.
    data = bytearray()
    for chunk in response.iter_bytes():
        data.extend(chunk)
        if len(data) > MAX_RESPONSE:
            raise ValueError("HOLD_SYSOP367_SOURCE_TOO_LARGE")
    try:
        envelope = json.loads(bytes(data))
    except (ValueError, UnicodeDecodeError):
        raise ValueError("HOLD_SYSOP367_SOURCE_JSON") from None
    verdict = verify_peer365(envelope, public_key, pin, app_id, expected_commit, now_ms)
    if not verdict["accepted"]:
        raise ValueError(verdict["reason"])
    return envelope


def record_transport_receipt367(
    journal: Path,
    *,
    app_id: str,
    envelope: dict[str, Any],
    public_key: bytes,
    pin: str,
    expected_commit: str,
    now_ms: int,
    transport_authenticated: bool,
) -> dict[str, Any]:
    """Only a validated, non-injected TLS+signature GET may be recorded."""
    if not transport_authenticated:
        raise ValueError("HOLD_SYSOP367_TLS_NOT_AUTHENTICATED")
    # The original journal enforces durable nonce/event replay protection and privacy.
    append_verified366(
        journal, app_id=app_id, signed_envelope=envelope,
        public_key_pem=public_key, trusted_pin=pin,
        expected_commit=expected_commit, now_ms=now_ms,
    )
    safe = _safe_path(journal, create=False)
    with closing(sqlite3.connect(str(safe), timeout=5)) as db:
        with db:
            db.execute(DDL)
            db.execute(
                """INSERT INTO verified_tls_sources367
                   (app_id,event_id,source_commit,received_ms,issued_ms)
                   VALUES (?,?,?,?,?)""",
                (app_id, envelope["payload"]["eventId"], expected_commit,
                 now_ms, envelope["payload"]["issuedAtMs"]),
            )
            db.execute(
                "DELETE FROM verified_tls_sources367 WHERE received_ms < ?",
                (now_ms - 7 * 86_400_000,),
            )
            db.execute(
                """DELETE FROM verified_tls_sources367 WHERE id IN
                   (SELECT id FROM verified_tls_sources367 ORDER BY id DESC
                    LIMIT -1 OFFSET 2048)"""
            )
    return {
        "appId": app_id,
        "result": "AUTHENTICATED_TLS_SIGNED_SOURCE_RECEIPT_STORED",
        "threeMasterDeliveryAckProven": False,
        "commsReceiverAuthorized": False,
        "physicalHostBootWitnessed": False,
    }


def collect_once367(app_id: str, *, now_ms: int | None = None) -> dict[str, Any]:
    """Owner-approved one-pass collector, not a background job or an API route."""
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        raise ValueError("HOLD_SYSOP367_NOT_ORIGINAL_WINDOWS_HOST")
    url, token, key, pin, commit, context = _load_enrollment367(app_id)
    journal_env = os.environ.get("ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH", "")
    if not journal_env:
        raise ValueError("HOLD_SYSOP367_PRIVATE_JOURNAL_REQUIRED")
    journal = Path(journal_env)
    _safe_path(journal, create=True)
    now = int(time.time() * 1000) if now_ms is None else now_ms
    try:
        with httpx.Client(
            verify=context, trust_env=False, follow_redirects=False, timeout=5.0
        ) as client:
            with client.stream(
                "GET", url,
                headers={"x-rosevear-telemetry-token": token, "accept": "application/json"},
            ) as response:
                envelope = validate_get367(
                    response, app_id=app_id, public_key=key,
                    pin=pin, expected_commit=commit, now_ms=now,
                )
    except (httpx.HTTPError, ssl.SSLError):
        raise ValueError("HOLD_SYSOP367_PRIVATE_TLS_FETCH_FAILED") from None
    return record_transport_receipt367(
        journal, app_id=app_id, envelope=envelope,
        public_key=key, pin=pin, expected_commit=commit, now_ms=now,
        transport_authenticated=True,
    )


def summary367(journal: Path | None, *, now_ms: int, original_host: bool) -> dict[str, Any]:
    """Only records local signed TLS GET receipts; never asserts Master CONNECTED."""
    result: dict[str, Any] = {
        "schema": SCHEMA, "sourceBuild": 367,
        "originalHost": ORIGINAL_HOST, "serverShell": "ai-data-platform",
        "status": "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED",
        "sources": [
            {"appId": name, "receiptCount": 0, "lastTlsSignedReceiptMs": None,
             "freshTlsSignedSourceOnly": False} for name in APPS
        ],
        "verifiedTlsSignedReceiptCount": 0,
        "verifiedThreeMasterDeliveryAcks": 0,
        "threeMasterRuntimeGreen": False,
        "allSevenLiveConnected": False,
        "commsPrivateReceiverAuthorized": False,
        "physicalBootIndependentlyWitnessed": False,
        "webMutationsEnabled": False,
    }
    if not original_host or journal is None:
        return result
    try:
        safe = _safe_path(journal, create=False)
        with closing(sqlite3.connect(f"{safe.as_uri()}?mode=ro", uri=True, timeout=3)) as db:
            rows = db.execute(
                """SELECT app_id, event_id, source_commit, received_ms
                   FROM verified_tls_sources367 ORDER BY id DESC LIMIT 2048"""
            ).fetchall()
        ids: set[tuple[str,str]] = set()
        buckets: dict[str, list[int]] = {name: [] for name in APPS}
        for app_id, event_id, commit, received in rows:
            if (app_id not in APPS or not isinstance(event_id,str)
                or (app_id,event_id) in ids or not isinstance(received,int)
                or received > now_ms + 2000 or received < now_ms - 7 * 86_400_000
                or not isinstance(commit,str) or HEX40.fullmatch(commit) is None):
                raise ValueError("HOLD_SYSOP367_RECEIPT_INVALID")
            ids.add((app_id,event_id))
            buckets[app_id].append(received)
        result["sources"] = [
            {"appId": name, "receiptCount": len(buckets[name]),
             "lastTlsSignedReceiptMs": max(buckets[name]) if buckets[name] else None,
             "freshTlsSignedSourceOnly": bool(
                 buckets[name] and now_ms - max(buckets[name]) <= TTL_MS
             )} for name in APPS
        ]
        result["verifiedTlsSignedReceiptCount"] = len(rows)
        result["status"] = "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY"
    except (OSError, sqlite3.Error, ValueError, TypeError):
        result["status"] = "HOLD_NO_VALID_TLS_RECEIPT_LEDGER"
    return result
