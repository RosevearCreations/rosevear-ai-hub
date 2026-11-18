"""Build 365: fail-closed seven-app signed Sysop aggregate statistics.

A valid detached Ed25519 signature verifies a peer *claim*, not an independently
observed live mTLS connection or original-host physical reboot. No actions.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    PublicFormat,
    load_pem_public_key,
)

APPS = (
    "ai-data-platform",
    "rosevear-ai-hub",
    "rosevear-comms-hub",
    "yw",
    "icamp",
    "rosiedazzlers",
    "devilndove",
)
SCHEMA = "rosevear.sysop.statistics.v1"
OUTPUT_SCHEMA = "rosevear.hub.sysop-seven-app365.v1"
METRICS = frozenset(
    (
        "requests",
        "serverErrors",
        "jobsCompleted",
        "jobsFailed",
        "queueDepth",
        "latencyP95Ms",
        "activeSessions",
    )
)
EVENTS = frozenset(
    (
        "HEARTBEAT",
        "PROCESS_RESTART_OBSERVED",
        "HOST_BOOT_OBSERVED",
        "SCHEDULED_MAINTENANCE_OBSERVED",
        "BACKUP_VERIFY_OBSERVED",
        "INCIDENT_OBSERVED",
    )
)
SIGNED_FIELDS = frozenset(
    (
        "schema",
        "protocolVersion",
        "appId",
        "sourceCommit",
        "eventId",
        "nonce",
        "issuedAtMs",
        "expiresAtMs",
        "state",
        "metricsWindowSeconds",
        "metrics",
        "sysop",
        "dataClass",
        "tenantId",
        "authorizesAction",
    )
)
SYSOP_FIELDS = frozenset(
    (
        "eventKind",
        "observedAtMs",
        "processUptimeSec",
        "restartCount",
        "lastRestartAtMs",
        "bootTimeMs",
        "rebootIsIndependentlyWitnessed",
    )
)
HEX40 = re.compile(r"[a-f0-9]{40}\Z")
HEX64 = re.compile(r"[a-f0-9]{64}\Z")
HEX128 = re.compile(r"[a-f0-9]{128}\Z")
HEX32 = re.compile(r"[a-f0-9]{32}\Z")
EVENT_ID = re.compile(r"[A-Za-z0-9_-]{16,80}\Z")
MAX_AGE_MS = 90_000
MAX_COUNTER = 2_147_483_647


def canonical(value: dict[str, Any]) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")


def _bounded_number(value: Any) -> bool:
    return value is None or (type(value) is int and 0 <= value <= MAX_COUNTER)


def verify_peer365(
    envelope: Any,
    public_pem: bytes | None,
    trusted_fingerprint: str,
    app_id: str,
    expected_commit: str,
    now_ms: int,
) -> dict[str, Any]:
    """Return strictly sanitized signed source data or one explicit HOLD reason."""
    hold = {"accepted": False, "reason": "HOLD_UNENROLLED_OR_INVALID_STATISTICS"}
    if (
        app_id not in APPS
        or type(now_ms) is not int
        or type(expected_commit) is not str
        or HEX40.fullmatch(expected_commit) is None
        or type(trusted_fingerprint) is not str
        or HEX64.fullmatch(trusted_fingerprint) is None
        or type(public_pem) is not bytes
        or not 1 <= len(public_pem) <= 4096
        or type(envelope) is not dict
        or set(envelope) != {"payload", "signature"}
        or type(envelope["payload"]) is not dict
        or set(envelope["payload"]) != SIGNED_FIELDS
        or type(envelope["signature"]) is not str
        or HEX128.fullmatch(envelope["signature"]) is None
    ):
        return hold
    p = envelope["payload"]
    stats = p["metrics"]
    sysop = p["sysop"]
    if (
        p["schema"] != SCHEMA
        or p["protocolVersion"] != "1.1"
        or p["appId"] != app_id
        or p["sourceCommit"] != expected_commit
        or type(p["eventId"]) is not str
        or EVENT_ID.fullmatch(p["eventId"]) is None
        or type(p["nonce"]) is not str
        or HEX32.fullmatch(p["nonce"]) is None
        or type(p["issuedAtMs"]) is not int
        or type(p["expiresAtMs"]) is not int
        or not 0 <= now_ms - p["issuedAtMs"] <= MAX_AGE_MS
        or not p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_AGE_MS
        or now_ms >= p["expiresAtMs"]
        or type(p["state"]) is not str
        or p["state"] not in ("HEALTHY", "DEGRADED", "UNHEALTHY", "UNKNOWN")
        or type(p["metricsWindowSeconds"]) is not int
        or not 60 <= p["metricsWindowSeconds"] <= 86400
        or type(stats) is not dict
        or set(stats) != METRICS
        or not all(_bounded_number(value) for value in stats.values())
        or type(sysop) is not dict
        or set(sysop) != SYSOP_FIELDS
        or type(sysop["eventKind"]) is not str
        or sysop["eventKind"] not in EVENTS
        or type(sysop["observedAtMs"]) is not int
        or not 0 <= p["issuedAtMs"] - sysop["observedAtMs"] <= MAX_AGE_MS
        or not all(
            _bounded_number(sysop[key])
            for key in ("processUptimeSec", "restartCount")
        )
        or not all(
            value is None or (type(value) is int and 0 <= value <= now_ms + 2000)
            for value in (sysop["lastRestartAtMs"], sysop["bootTimeMs"])
        )
        or (
            sysop["bootTimeMs"] is not None
            and sysop["bootTimeMs"] > sysop["observedAtMs"]
        )
        or sysop["rebootIsIndependentlyWitnessed"] is not False
        or (
            app_id != "rosevear-ai-hub"
            and (
                sysop["bootTimeMs"] is not None
                or sysop["eventKind"] == "HOST_BOOT_OBSERVED"
            )
        )
        or p["dataClass"] != "NON_SENSITIVE_AGGREGATE"
        or p["tenantId"] is not None
        or p["authorizesAction"] is not False
        or len(canonical(p)) > 8192
    ):
        return {**hold, "reason": "HOLD_WRONG_SCOPE_STALE_OR_PRIVACY"}
    try:
        key = load_pem_public_key(public_pem)
        if not isinstance(key, Ed25519PublicKey):
            return {**hold, "reason": "HOLD_ED25519_KEY_REQUIRED"}
        raw = key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        if hashlib.sha256(raw).hexdigest() != trusted_fingerprint:
            return {**hold, "reason": "HOLD_INDEPENDENT_PIN_MISMATCH"}
        key.verify(bytes.fromhex(envelope["signature"]), canonical(p))
    except (ValueError, TypeError, AttributeError):
        return {**hold, "reason": "HOLD_FORGED_STATISTICS"}
    except Exception:
        return {**hold, "reason": "HOLD_FORGED_STATISTICS"}
    return {
        "accepted": True,
        "reason": "SIGNED_AGGREGATE_SOURCE_ONLY",
        "state": p["state"],
        "sourceCommit": p["sourceCommit"],
        "issuedAtMs": p["issuedAtMs"],
        "metricsWindowSeconds": p["metricsWindowSeconds"],
        "metrics": dict(stats),
        "sysop": {
            "eventKind": sysop["eventKind"],
            "observedAtMs": sysop["observedAtMs"],
            "processUptimeSec": sysop["processUptimeSec"],
            "restartCount": sysop["restartCount"],
            "lastRestartAtMs": sysop["lastRestartAtMs"],
            "bootTimeMs": sysop["bootTimeMs"],
        },
        "liveAuthenticatedTransportVerified": False,
        "physicalRebootIndependentlyWitnessed": False,
    }


def seven_app_summary365(
    records: dict[str, Any],
    public_keys: dict[str, bytes | None],
    fingerprints: dict[str, str],
    commits: dict[str, str],
    *,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    """Never convert manually delivered signed receipts into CONNECTED status."""
    apps = []
    for app_id in APPS:
        source = (
            verify_peer365(
                records.get(app_id),
                public_keys.get(app_id),
                fingerprints.get(app_id, ""),
                app_id,
                commits.get(app_id, ""),
                now_ms,
            )
            if original_host
            else {"accepted": False, "reason": "HOLD_NOT_ORIGINAL_WINDOWS_HOST"}
        )
        apps.append({"appId": app_id, **source, "connected": False})
    return {
        "schema": OUTPUT_SCHEMA,
        "sourceBuild": 365,
        "serverShell": "ai-data-platform",
        "originalHost": "DESKTOP-AE894KC",
        "apps": apps,
        "acceptedSignedSourceSnapshots": sum(bool(a["accepted"]) for a in apps),
        "verifiedLiveConnections": 0,
        "liveSevenAppStatisticsVerified": False,
        "originalHostAutonomousBootVerified": False,
        "commsPrivateReceiverAuthorized": False,
        "webMutationAvailable": False,
        "nextStep": "OWNER_ENROLLED_PEER_KEYS_AND_ACTUAL_AUTHENTICATED_LIVE_SAMPLES",
    }
