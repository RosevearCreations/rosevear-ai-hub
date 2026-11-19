"""AIDP Build 423 original-host signed, read-only Sysop telemetry source.

This endpoint is not an actuator and never proves an independently witnessed reboot.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import secrets
import time
import uuid
from pathlib import Path
from typing import Any

import psutil
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import APIRouter, Header, Response

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST

router = APIRouter(prefix="/internal/rosevear/sysop/telemetry/v1", tags=["sysop423"])
SCHEMA = "rosevear.sysop.statistics.v1"
MAX_KEY_BYTES = 8192


def _canonical(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def _private_key(path_text: str | None) -> Ed25519PrivateKey:
    if not path_text:
        raise ValueError("HOLD_SYSOP423_SIGNER_PATH_REQUIRED")
    path = Path(path_text)
    if not path.is_absolute() or not path.is_file() or path.is_symlink():
        raise ValueError("HOLD_SYSOP423_SIGNER_PATH_INVALID")
    raw = path.read_bytes()
    if not 1 <= len(raw) <= MAX_KEY_BYTES:
        raise ValueError("HOLD_SYSOP423_SIGNER_SIZE_INVALID")
    key = serialization.load_pem_private_key(raw, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise ValueError("HOLD_SYSOP423_ED25519_REQUIRED")
    return key


def build_sysop_telemetry423(*, now_ms: int, machine_name: str, windows_host: bool) -> dict[str, Any]:
    if not windows_host or machine_name.upper() != ORIGINAL_HOST:
        raise ValueError("HOLD_SYSOP423_NOT_ORIGINAL_WINDOWS_HOST")
    commit = os.environ.get("ROSEVEAR_SYSOP_TELEMETRY_SOURCE_COMMIT", "")
    if len(commit) != 40 or any(c not in "0123456789abcdef" for c in commit):
        raise ValueError("HOLD_SYSOP423_SOURCE_COMMIT_REQUIRED")
    key = _private_key(os.environ.get("ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH"))
    boot_ms = int(psutil.boot_time() * 1000)
    payload = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "appId": "rosevear-ai-hub",
        "sourceCommit": commit,
        "eventId": uuid.uuid4().hex,
        "nonce": secrets.token_hex(16),
        "issuedAtMs": now_ms,
        "expiresAtMs": now_ms + 60_000,
        "state": "UNKNOWN",
        "metricsWindowSeconds": 60,
        "metrics": {
            "requests": None,
            "serverErrors": None,
            "jobsCompleted": None,
            "jobsFailed": None,
            "queueDepth": None,
            "latencyP95Ms": None,
            "activeSessions": None,
        },
        "sysop": {
            "eventKind": "HEARTBEAT",
            "observedAtMs": now_ms,
            "processUptimeSec": max(0, int(time.monotonic())),
            "restartCount": None,
            "lastRestartAtMs": None,
            "bootTimeMs": boot_ms,
            "rebootIsIndependentlyWitnessed": False,
        },
        "dataClass": "NON_SENSITIVE_AGGREGATE",
        "tenantId": None,
        "authorizesAction": False,
    }
    signature = key.sign(_canonical(payload)).hex()
    return {"payload": payload, "signature": signature}


def _authorized(actual: str | None) -> bool:
    expected = os.environ.get("ROSEVEAR_SYSOP_TELEMETRY_READ_TOKEN")
    return bool(expected and actual and secrets.compare_digest(actual, expected))


@router.get("")
def get_sysop_telemetry423(
    response: Response,
    x_rosevear_telemetry_token: str | None = Header(default=None),
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    if not _authorized(x_rosevear_telemetry_token):
        response.status_code = 401
        return {"state": "NOT_AUTHORIZED", "connected": False, "authorizesAction": False}
    try:
        return build_sysop_telemetry423(
            now_ms=int(time.time() * 1000),
            machine_name=platform.node(),
            windows_host=os.name == "nt",
        )
    except (ValueError, OSError, TypeError):
        response.status_code = 503
        return {"state": "NOT_ENROLLED", "connected": False, "authorizesAction": False}
