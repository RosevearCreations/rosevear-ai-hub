"""Build 362 / QL-471: signed offline field claims and bounded hash-chained drill history.

Signed statements are NOT independent verification that the physical Windows PC,
devices or Master workers actually operated. No lifecycle/receiver actions exist.
"""
from __future__ import annotations

import base64
import hashlib
import json
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_pem_public_key

HOST = "DESKTOP-AE894KC"
CLAIM_SCHEMA = "rosevear.hub.ql471.field-claim362.v1"
LEDGER_SCHEMA = "rosevear.hub.ql471.local-claim-history362.v1"
DASH_SCHEMA = "rosevear.hub.ql471.signed-history-dashboard362.v1"
ZERO = "0" * 64
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
HEX32 = re.compile(r"[0-9a-f]{32}\Z")
IDENT = re.compile(r"[A-Za-z0-9_-]{8,64}\Z")
MAX_EVENTS = 48
CHECKS = {
    "reboot-before": frozenset(("backupReviewed", "taskStatesInspected", "supervisorPresent")),
    "reboot-after": frozenset(("offHostWitnessClaimed", "preLoginHttpsClaimed", "recoveryClaimed")),
    "guest": frozenset(
        ("homeAssistantAuthClaimed", "mqttAckClaimed", "cameraPlaybackClaimed",
         "offlineBackupRestoreClaimed")
    ),
    "ai-data-worker": frozenset(
        ("ownerPilotPermitClaimed", "disabledFirstInstallClaimed", "mtlsClaimed",
         "peerAckClaimed", "rollbackClaimed")
    ),
    "comms-worker": frozenset(
        ("ownerPilotPermitClaimed", "disabledFirstInstallClaimed", "mtlsClaimed",
         "peerAckClaimed", "rollbackClaimed", "privateQl340cReceiverOffClaimed")
    ),
}
CLAIM_KEYS = frozenset(
    ("schema", "scope", "host", "sourceCommit", "drillId", "eventId", "nonce",
     "observedAt", "issuedAt", "evidenceSha256", "signerKeyFingerprint", "checks")
)
EVENT_KEYS = frozenset(
    ("sequence", "drillId", "eventId", "scope", "observedAt", "sourceCommit",
     "signerKeyFingerprint", "nonce", "receiptSha256", "evidenceSha256",
     "signatureSha256", "previousSha256", "sha256")
)


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def utc(value: Any) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
        r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z", value
    ):
        raise ValueError("HOLD_QL471_UTC_INVALID")
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00").astimezone(UTC)
    except ValueError as error:
        raise ValueError("HOLD_QL471_UTC_INVALID") from error


def hex_value(value: Any, pattern: re.Pattern[str], reason: str) -> str:
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise ValueError(reason)
    return value


def validate_pins(pins: Any) -> dict[str, str]:
    if not isinstance(pins, dict) or set(pins) != set(CHECKS):
        raise ValueError("HOLD_QL471_TRUST_PINS_MISSING")
    for value in pins.values():
        hex_value(value, HEX64, "HOLD_QL471_TRUST_PIN_INVALID")
    if len(set(pins.values())) != len(CHECKS):
        raise ValueError("HOLD_QL471_INDEPENDENT_SIGNERS_REQUIRED")
    return pins


def verify_claim(
    receipt: bytes,
    signature_b64: bytes,
    evidence: bytes,
    public_pem: bytes,
    pins: dict[str, str],
    expected_commit: str,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Verify an Ed25519 attribution with independent owner-provided trust pins."""
    validate_pins(pins)
    hex_value(expected_commit, HEX40, "HOLD_QL471_SOURCE_REQUIRED")
    if not (2 <= len(receipt) <= 8192 and 1 <= len(evidence) <= 131072):
        raise ValueError("HOLD_QL471_EVIDENCE_SIZE")
    if not (1 <= len(signature_b64) <= 256 and 1 <= len(public_pem) <= 4096):
        raise ValueError("HOLD_QL471_SIGNATURE_SIZE")
    try:
        claim = json.loads(receipt)
    except (ValueError, UnicodeError) as error:
        raise ValueError("HOLD_QL471_RECEIPT_JSON") from error
    if not isinstance(claim, dict) or set(claim) != CLAIM_KEYS:
        raise ValueError("HOLD_QL471_RECEIPT_SCHEMA")
    scope = claim["scope"]
    if (
        claim["schema"] != CLAIM_SCHEMA or not isinstance(scope, str) or scope not in CHECKS
        or claim["host"] != HOST or claim["sourceCommit"] != expected_commit
    ):
        raise ValueError("HOLD_QL471_SOURCE_HOST_SCOPE")
    for field in ("drillId", "eventId"):
        if not isinstance(claim[field], str) or not IDENT.fullmatch(claim[field]):
            raise ValueError("HOLD_QL471_EVENT_ID_INVALID")
    hex_value(claim["nonce"], HEX32, "HOLD_QL471_NONCE_INVALID")
    digest = hex_value(claim["evidenceSha256"], HEX64, "HOLD_QL471_DIGEST_INVALID")
    if digest != hashlib.sha256(evidence).hexdigest():
        raise ValueError("HOLD_QL471_EVIDENCE_TAMPERED")
    pin = pins[scope]
    if claim["signerKeyFingerprint"] != pin:
        raise ValueError("HOLD_QL471_PIN_NOT_TRUSTED")
    checks = claim["checks"]
    if not isinstance(checks, dict) or set(checks) != CHECKS[scope]:
        raise ValueError("HOLD_QL471_CHECKS_INCOMPLETE")
    if not all(item is True for item in checks.values()):
        raise ValueError("HOLD_QL471_FAILED_CHECK")
    observed, issued = utc(claim["observedAt"]), utc(claim["issuedAt"])
    current = now or datetime.now(UTC)
    if (
        observed > issued or issued > current + timedelta(minutes=2)
        or current - observed > timedelta(hours=24)
        or issued - observed > timedelta(hours=2)
    ):
        raise ValueError("HOLD_QL471_STALE_OR_FUTURE_CLAIM")
    try:
        pub = load_pem_public_key(public_pem)
        if not isinstance(pub, Ed25519PublicKey):
            raise ValueError("HOLD_QL471_ED25519_REQUIRED")
        raw = pub.public_bytes(Encoding.Raw, PublicFormat.Raw)
        if hashlib.sha256(raw).hexdigest() != pin:
            raise ValueError("HOLD_QL471_PUBLIC_PIN_MISMATCH")
        signature = base64.b64decode(signature_b64.strip(), validate=True)
        if len(signature) != 64:
            raise ValueError("HOLD_QL471_SIGNATURE_FORMAT")
        pub.verify(signature, canonical(claim))
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("HOLD_QL471_SIGNATURE_INVALID") from error
    return {
        "drillId": claim["drillId"], "eventId": claim["eventId"],
        "scope": scope, "observedAt": claim["observedAt"],
        "sourceCommit": expected_commit, "signerKeyFingerprint": pin,
        "nonce": claim["nonce"], "receiptSha256": hashlib.sha256(receipt).hexdigest(),
        "evidenceSha256": digest, "signatureSha256": hashlib.sha256(signature).hexdigest(),
    }


def empty_ledger(commit: str) -> dict[str, Any]:
    hex_value(commit, HEX40, "HOLD_QL471_SOURCE_REQUIRED")
    return {
        "schema": LEDGER_SCHEMA, "originalHost": HOST,
        "sourceCommit": commit, "events": [],
    }


def verify_ledger(value: Any, commit: str) -> dict[str, Any]:
    """Check local tamper-evident linkage, NOT immutable custody or reverified signatures."""
    hex_value(commit, HEX40, "HOLD_QL471_SOURCE_REQUIRED")
    if (
        not isinstance(value, dict) or set(value) != {"schema", "originalHost", "sourceCommit", "events"}
        or value["schema"] != LEDGER_SCHEMA or value["originalHost"] != HOST
        or value["sourceCommit"] != commit or not isinstance(value["events"], list)
        or len(value["events"]) > MAX_EVENTS
    ):
        raise ValueError("HOLD_QL471_LEDGER_SCHEMA_SOURCE")
    previous = ZERO
    event_ids: set[str] = set()
    nonces: set[tuple[str, str]] = set()
    for i, event in enumerate(value["events"], 1):
        if not isinstance(event, dict) or set(event) != EVENT_KEYS:
            raise ValueError("HOLD_QL471_LEDGER_EVENT_SCHEMA")
        if (
            type(event["sequence"]) is not int or event["sequence"] != i
            or event["sourceCommit"] != commit or type(event["scope"]) is not str
            or event["scope"] not in CHECKS
            or not all(isinstance(event[k], str) and IDENT.fullmatch(event[k])
                       for k in ("drillId", "eventId"))
        ):
            raise ValueError("HOLD_QL471_LEDGER_EVENT_INVALID")
        hex_value(event["nonce"], HEX32, "HOLD_QL471_LEDGER_NONCE")
        for key in ("signerKeyFingerprint", "receiptSha256", "evidenceSha256", "signatureSha256"):
            hex_value(event[key], HEX64, "HOLD_QL471_LEDGER_DIGEST")
        utc(event["observedAt"])
        if event["eventId"] in event_ids or (event["signerKeyFingerprint"], event["nonce"]) in nonces:
            raise ValueError("HOLD_QL471_REPLAY_DUPLICATE")
        if event["previousSha256"] != previous:
            raise ValueError("HOLD_QL471_LEDGER_CHAIN_BROKEN")
        payload = {k: v for k, v in event.items() if k != "sha256"}
        if hashlib.sha256(canonical(payload)).hexdigest() != event["sha256"]:
            raise ValueError("HOLD_QL471_LEDGER_CHAIN_BROKEN")
        event_ids.add(event["eventId"])
        nonces.add((event["signerKeyFingerprint"], event["nonce"]))
        previous = event["sha256"]
    return value


def append_claim(ledger: dict[str, Any], item: dict[str, Any]) -> dict[str, Any]:
    commit = ledger.get("sourceCommit", "")
    verify_ledger(ledger, commit)
    if len(ledger["events"]) >= MAX_EVENTS:
        raise ValueError("HOLD_QL471_LEDGER_FULL")
    if set(item) != EVENT_KEYS - {"sequence", "previousSha256", "sha256"}:
        raise ValueError("HOLD_QL471_UNVERIFIED_INTAKE_FIELDS")
    next_event = {
        **item,
        "sequence": len(ledger["events"]) + 1,
        "previousSha256": ledger["events"][-1]["sha256"] if ledger["events"] else ZERO,
    }
    next_event["sha256"] = hashlib.sha256(canonical(next_event)).hexdigest()
    new_ledger = {**ledger, "events": [*ledger["events"], next_event]}
    verify_ledger(new_ledger, commit)
    for prior in ledger["events"]:
        if prior["eventId"] == item["eventId"]:
            raise ValueError("HOLD_QL471_REPLAY_DUPLICATE")
    return new_ledger


def dashboard(ledger: Any, expected_commit: str) -> dict[str, Any]:
    """Report historical signed-at-intake claims without claiming live pilot readiness."""
    result = {
        "schema": DASH_SCHEMA, "sourceBuild": 362, "originalHost": HOST,
        "serverShell": "ai-data-platform", "sourceCommit": expected_commit,
        "ledgerIntegrity": "HOLD_UNAVAILABLE", "historyCount": 0,
        "drills": [], "lastRecordedAt": None, "latestChainHash": None,
        "signedClaimsAreLiveMeasurements": False,
        "signaturesReverifiedAtRead": False,
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateReceiverAuthorized": False, "pilotInstallAuthorized": False,
        "webMutationAvailable": False,
        "masterPilotReadiness": {
            "ai-data-platform": "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK",
            "rosevear-comms-hub": "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK",
        },
    }
    try:
        verified = verify_ledger(ledger, expected_commit)
    except (ValueError, TypeError):
        return result
    events = verified["events"]
    drill_ids = list(dict.fromkeys(e["drillId"] for e in events))
    drills = []
    for name in drill_ids[-12:]:
        records = [e for e in events if e["drillId"] == name]
        before = [e for e in records if e["scope"] == "reboot-before"]
        after = [e for e in records if e["scope"] == "reboot-after"]
        paired = bool(
            before and after and
            utc(before[-1]["observedAt"]) < utc(after[-1]["observedAt"]) and
            before[-1]["signerKeyFingerprint"] != after[-1]["signerKeyFingerprint"]
        )
        drills.append({
            "drillId": name, "eventsRecorded": len(records), "pairedClaimTimeline": paired,
            "lastObservedAt": max((e["observedAt"] for e in records), default=None),
            "scopes": sorted({e["scope"] for e in records}),
            "physicalRecoveryIndependentlyVerified": False,
        })
    result.update({
        "ledgerIntegrity": "LOCAL_HASH_CHAIN_ONLY_NOT_INDEPENDENTLY_ANCHORED",
        "historyCount": len(events), "drills": drills,
        "lastRecordedAt": events[-1]["observedAt"] if events else None,
        "latestChainHash": events[-1]["sha256"] if events else ZERO,
    })
    return result
