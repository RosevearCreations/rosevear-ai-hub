"""QL-243 server-only read-only integration test boundary; disabled unless explicitly configured.

This is NOT an owner pilot, an Ed25519 gateway receipt signer, or a live connector.
The AI Data Platform alone may request coarse Hub status with its own scoped key.
"""

import base64
import hashlib
import hmac
import os
import re
import sqlite3
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/integration/v1", include_in_schema=False)

_HEADERS = (
    "contract",
    "environment",
    "source",
    "destination",
    "business",
    "tenant",
    "key-id",
    "timestamp",
    "nonce",
    "signature",
)
_EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()
_APP = "rosevear-ai-hub"
_SOURCE = "ai-data-platform"
_CONTRACT = "rosevear.integration.v1"
_PATHS = {"/api/integration/v1/health", "/api/integration/v1/capabilities"}
_PUBLIC_METADATA_HEADERS = {
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
}
_NONCE_PATTERN = re.compile(r"np-[a-f0-9]{32}\Z")
# QL-245 requires an independently issued *nonproduction* key ID. This is a
# format guard only; no key or trusted gateway identity is provisioned here.
_ID_PATTERN = re.compile(r"np-[a-zA-Z0-9._-]{1,87}\Z")


def _settings():
    """Do not use normal Hub secrets or emit any secret into logs."""
    return {
        "enabled": os.getenv("ROSEVEAR_INTEGRATION_V1_ENABLED") == "1",
        "environment": os.getenv("APP_ENV", "development"),
        "key_id": os.getenv("ROSEVEAR_INTEGRATION_V1_KEY_ID", ""),
        "secret": os.getenv("ROSEVEAR_INTEGRATION_V1_HMAC_KEY_B64", ""),
        "revoked": os.getenv("ROSEVEAR_INTEGRATION_V1_KEY_REVOKED") == "1",
        "audit_path": os.getenv("ROSEVEAR_INTEGRATION_V1_AUDIT_SQLITE", ""),
    }


def _audit(
    path: str, event: str, reason: str, key_id: str, nonce: str = "", accepted: bool = False
) -> bool:
    """Atomically persist replay identity and redacted events; no fallback to in-memory state."""
    if not path or not Path(path).parent.is_dir():
        return False
    try:
        with sqlite3.connect(path, timeout=2) as connection:
            connection.execute("PRAGMA busy_timeout=2000")
            connection.execute("BEGIN IMMEDIATE")
            connection.execute("""CREATE TABLE IF NOT EXISTS integration_v1_nonces (
                caller TEXT NOT NULL, business TEXT NOT NULL, tenant TEXT NOT NULL,
                key_id TEXT NOT NULL, nonce TEXT NOT NULL, created_at INTEGER NOT NULL,
                PRIMARY KEY (caller,business,tenant,key_id,nonce))""")
            connection.execute("""CREATE TABLE IF NOT EXISTS integration_v1_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT, epoch_ms INTEGER NOT NULL,
                path TEXT NOT NULL, result TEXT NOT NULL, reason TEXT NOT NULL,
                key_id TEXT NOT NULL)""")
            if accepted:
                connection.execute(
                    """INSERT INTO integration_v1_nonces VALUES (?,?,?,?,?,?)""",
                    (_SOURCE, _APP, "-", key_id, nonce, int(time.time() * 1000)),
                )
            connection.execute(
                """INSERT INTO integration_v1_audit
                (epoch_ms,path,result,reason,key_id) VALUES (?,?,?,?,?)""",
                (
                    int(time.time() * 1000),
                    event,
                    "HOLD_ACCEPTED" if accepted else "DENIED",
                    reason,
                    key_id,
                ),
            )
        return True
    except (sqlite3.Error, OSError):
        return False


def _deny(settings: dict, path: str, code: int, reason: str) -> None:
    # Auditing is best effort only when configuration is invalid; valid credentials fail
    # closed if durable audit/replay storage is unavailable.
    _audit(settings["audit_path"], path, reason, settings["key_id"])
    raise HTTPException(status_code=code, detail="Integration v1 access denied")


def _key(settings: dict) -> bytes | None:
    try:
        raw = base64.b64decode(settings["secret"], validate=True)
        return raw if len(raw) == 32 else None
    except (ValueError, TypeError):
        return None


async def _authorize(request: Request) -> None:
    settings = _settings()
    path = request.scope["path"]
    if not settings["enabled"]:
        raise HTTPException(status_code=404, detail="Not found")
    if (
        settings["environment"] not in {"development", "test", "nonproduction"}
        or request.method != "GET"
        or path not in _PATHS
    ):
        _deny(settings, path, 403, "SCOPE_OR_METHOD")
    if request.url.query or request.headers.get("content-length") not in (None, "0"):
        _deny(settings, path, 403, "QUERY_OR_BODY")
    if request.headers.get("transfer-encoding"):
        _deny(settings, path, 403, "BODY_STREAM")
    # FastAPI/Starlette normally coalesces duplicate headers: reject rather than guess.
    for suffix in _HEADERS:
        name = f"x-rosevear-{suffix}"
        if len(request.headers.getlist(name)) != 1:
            _deny(settings, path, 401, "MISSING_OR_DUPLICATE_HEADER")
    header = {suffix: request.headers[f"x-rosevear-{suffix}"] for suffix in _HEADERS}
    if (
        any(len(value) > 200 for value in header.values())
        or header["contract"] != _CONTRACT
        or header["environment"] != "nonproduction"
        or header["source"] != _SOURCE
        or header["destination"] != _APP
        or header["business"] != _APP
        or header["tenant"] != "-"
        or not _ID_PATTERN.fullmatch(header["key-id"])
        or not _NONCE_PATTERN.fullmatch(header["nonce"])
    ):
        _deny(settings, path, 403, "IDENTITY_SCOPE")
    if settings["revoked"] or header["key-id"] != settings["key_id"] or not _key(settings):
        _deny(settings, path, 401, "KEY_DISABLED_OR_REVOKED")
    try:
        stamp = int(header["timestamp"])
    except ValueError:
        _deny(settings, path, 401, "TIME_INVALID")
    if str(stamp) != header["timestamp"] or abs(int(time.time() * 1000) - stamp) > 300_000:
        _deny(settings, path, 401, "STALE_TIME")
    canonical = "\n".join(
        (
            _CONTRACT,
            "GET",
            path,
            header["timestamp"],
            header["nonce"],
            _SOURCE,
            _APP,
            _APP,
            "-",
            "nonproduction",
            _EMPTY_SHA256,
            header["key-id"],
        )
    )
    expected = (
        base64.urlsafe_b64encode(
            hmac.new(_key(settings), canonical.encode("utf-8"), hashlib.sha256).digest()
        )
        .decode("ascii")
        .rstrip("=")
    )
    if not hmac.compare_digest(expected, header["signature"]):
        _deny(settings, path, 401, "SIGNATURE_MISMATCH")
    if not _audit(
        settings["audit_path"],
        path,
        "AUTHENTICATED_GET_HOLD",
        header["key-id"],
        header["nonce"],
        accepted=True,
    ):
        # Duplicate nonces (including after restart) and unavailable storage both deny.
        _deny(settings, path, 409, "REPLAY_OR_STORAGE_UNAVAILABLE")


@router.get("/health")
async def integration_health(request: Request):
    await _authorize(request)
    return JSONResponse(
        {
            "source_system": _APP,
            "contract_version": _CONTRACT,
            "environment": "nonproduction",
            "tenant_id": None,
            "connection_status": "DISCONNECTED",
            "service_status": "UNVERIFIED",
        },
        headers=_PUBLIC_METADATA_HEADERS,
    )


@router.get("/capabilities")
async def integration_capabilities(request: Request):
    await _authorize(request)
    return JSONResponse(
        {
            "source_system": _APP,
            "contract_version": _CONTRACT,
            "environment": "nonproduction",
            "tenant_id": None,
            "connection_status": "DISCONNECTED",
            "capabilities": ["read_health", "read_capabilities"],
            "allowed_paths": ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
            "enabled_operations": [],
        },
        headers=_PUBLIC_METADATA_HEADERS,
    )


@router.api_route(
    "/{unrecognized:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
)
async def integration_denied(request: Request, unrecognized: str):
    settings = _settings()
    if not settings["enabled"]:
        raise HTTPException(status_code=404, detail="Not found")
    _deny(settings, request.scope["path"][:120], 403, "UNKNOWN_ROUTE_OR_METHOD")
