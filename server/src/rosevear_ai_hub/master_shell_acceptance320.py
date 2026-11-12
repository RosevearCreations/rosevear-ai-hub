"""Build 320 — original-host protected QL-429 enrollment and re-entry witnesses.

Protected library only; never runs an enrolled receiver, provisions a remote
store, signs production evidence, or claims operational owner acceptance.
"""

import base64
import hashlib
import json
import secrets
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp, _utc
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN
from rosevear_ai_hub.master_shell_acceptance319 import (
    ProtectedAnchorJournal319,
    _anchor_readback,
    _digest,
    _id,
    _native,
    _recent,
    _scope,
    reconcile_master_evidence319,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE319_MAIN = "0693d70965a5ada3320b8fcb261f554e0dbff88f"
COMMS429_CONTRACT = "245cdc6f5dc21d9897ca454b2e16fdb51c33ae62"
ENROLL = "rosevear.ql429.external-anchor-enrollment.v1"
APPROVAL = "rosevear.ql429.enrollment-owner-approval.v1"
POSSESSION = "rosevear.ql429.pin-possession.v1"
CHALLENGE = "rosevear.ql429.original-host-challenge.v1"
RESPONSE = "rosevear.ql429.original-host-fresh-response.v1"
WITNESS = "rosevear.ql429.master-pilot-reentry-witness.v1"
OWNER = "rosevear.ql429.owner-three-master-pilot-witness.v1"
ACTION = "ACCEPT_SIGNED_PRECHECK_ONLY_REQUIRE_NEW_QL424_CEREMONY_KEEP_OFF"
HOST = "DESKTOP-AE894KC"
ZERO = "0" * 64


def _pub(encoded: Any) -> tuple[bytes, str] | None:
    if not isinstance(encoded, str) or len(encoded) > 680:
        return None
    try:
        der = base64.b64decode(encoded, validate=True)
        if base64.b64encode(der).decode() != encoded:
            return None
        pin = hashlib.sha256(der).hexdigest()
        return (der, pin) if _public_ed25519(der, pin) else None
    except (ValueError, TypeError):
        return None


def _pins(enrollment: Any) -> dict[str, tuple[bytes, str]] | None:
    if not (
        isinstance(enrollment, dict)
        and set(enrollment)
        == {
            "schema",
            "externalStoreId",
            "anchorId",
            "originalHostMachineId",
            "pins",
            "ownerId",
            "reviewerId",
            "createdAt",
        }
        and enrollment["schema"] == ENROLL
        and _id(enrollment["externalStoreId"])
        and _id(enrollment["anchorId"])
        and enrollment["originalHostMachineId"] == HOST
        and _id(enrollment["ownerId"])
        and _id(enrollment["reviewerId"])
        and enrollment["ownerId"] != enrollment["reviewerId"]
        and isinstance(enrollment["pins"], dict)
        and set(enrollment["pins"]) == {"anchor", "reader", "originalHost", "masters"}
        and isinstance(enrollment["pins"]["masters"], dict)
        and set(enrollment["pins"]["masters"]) == set(MASTERS)
    ):
        return None
    fields = {key: enrollment["pins"][key] for key in ("anchor", "reader", "originalHost")}
    fields.update(enrollment["pins"]["masters"])
    verified = {key: _pub(encoded) for key, encoded in fields.items()}
    if any(v is None for v in verified.values()) or len(set(fields.values())) != 6:
        return None
    return verified


class ProtectedEnrollmentJournal320:
    """Original-host one-use SQLite metadata. Public pins only; no private keys.

    This local journal does not defeat privileged deletion. Export independent
    record digests to separately administered off-host immutable custody.
    """

    def __init__(self, path: Path):
        self.path = path

    def read(self, monitor: PersistentReeMonitor304, kind: str, identity: str):
        if not (
            _on_ree(monitor)
            and kind in ("enrollment", "challenge", "witness")
            and _id(identity)
            and self.path.is_file()
        ):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    "SELECT payload,record_digest FROM enrollment320 WHERE kind=? AND identity=?",
                    (kind, identity),
                ).fetchone()
            if row is None:
                return None
            payload = json.loads(row[0])
            if (
                not isinstance(payload, dict)
                or _digest({"kind": kind, "identity": identity, "payload": payload}) != row[1]
            ):
                return None
            return {"payload": payload, "recordDigest": row[1]}
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        kind: str,
        identity: str,
        payload: Any,
        *,
        nonce: str | None = None,
    ) -> str | None:
        if not (
            _on_ree(monitor)
            and kind in ("enrollment", "challenge", "witness")
            and _id(identity)
            and isinstance(payload, dict)
            and (nonce is None or _id(nonce))
        ):
            return None
        try:
            raw = _serialize(payload).decode("utf-8")
            if len(raw) > 12000:
                return None
            digest = _digest({"kind": kind, "identity": identity, "payload": payload})
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS enrollment320 ("
                    "kind TEXT NOT NULL, identity TEXT NOT NULL, payload TEXT NOT NULL,"
                    "record_digest TEXT NOT NULL, nonce TEXT UNIQUE,"
                    "PRIMARY KEY(kind,identity))"
                )
                row = db.execute(
                    "INSERT OR IGNORE INTO enrollment320 VALUES (?,?,?,?,?)",
                    (kind, identity, raw, digest, nonce),
                )
                if row.rowcount != 1:
                    return None
            read = self.read(monitor, kind, identity)
            return digest if read and read["recordDigest"] == digest else None
        except (OSError, sqlite3.Error, TypeError, ValueError, OverflowError):
            return None


def enroll_ql429_external_pins320(
    monitor: PersistentReeMonitor304,
    enrollment: Any,
    approval: Any,
    proofs: Any,
    *,
    journal: ProtectedEnrollmentJournal320,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    attest_owner_custody: Callable[..., bool] | None,
    attest_reviewer_custody: Callable[..., bool] | None,
    attest_external_store: Callable[..., bool] | None,
    attest_original_host: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Dual-owner approval + separate signer key-possession proofs; no enrollment I/O."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    pins = _pins(enrollment)
    if not (
        _on_ree(monitor)
        and type(now) is int
        and pins
        and isinstance(journal, ProtectedEnrollmentJournal320)
        and _recent(enrollment.get("createdAt"), now) is not None
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and len({owner_pin, reviewer_pin, *(value[1] for value in pins.values())}) == 8
    ):
        return _hold("HOLD_QL429_INDEPENDENT_PUBLIC_ENROLLMENT_AUTHORITY_REQUIRED")
    approval_body = approval.get("payload") if isinstance(approval, dict) else None
    if not (
        isinstance(approval, dict)
        and set(approval) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(approval_body, dict)
        and set(approval_body) == {"schema", "enrollmentDigest", "action", "signedAt"}
        and approval_body["schema"] == APPROVAL
        and approval_body["enrollmentDigest"] == _digest(enrollment)
        and approval_body["action"] == "ENROLL_OFF_HOST_PUBLIC_PINS_NO_RECEIVER_ACTIVATION"
        and _recent(approval_body["signedAt"], now) is not None
        and _trusted_signature(approval_body, approval["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(
            approval_body, approval["reviewerSignature"], reviewer_der, reviewer_pin
        )
    ):
        return _hold("HOLD_QL429_DUAL_SIGNED_PIN_ENROLLMENT_REJECTED")
    if not isinstance(proofs, dict) or set(proofs) != {"anchor", "reader", "originalHost"}:
        return _hold("HOLD_QL429_INDEPENDENT_KEY_POSSESSION_REQUIRED")
    evidence = {
        "external_store_id": enrollment["externalStoreId"],
        "anchor_id": enrollment["anchorId"],
        "enrollment_digest": _digest(enrollment),
        "source_revision": SOURCE319_MAIN,
        "comms_revision": COMMS429_CONTRACT,
        "host": HOST,
    }
    if not all(
        (
            _callback(attest_owner_custody, **evidence),
            _callback(attest_reviewer_custody, **evidence),
            _callback(attest_external_store, **evidence),
            _callback(attest_original_host, **evidence),
        )
    ):
        return _hold("HOLD_QL429_PHYSICAL_CUSTODY_UNVERIFIED")
    digests = {}
    for role in ("anchor", "reader", "originalHost"):
        p = _native(
            proofs[role],
            {"schema", "enrollmentDigest", "role", "observedAt"},
            POSSESSION,
            *pins[role],
        )
        if not (
            p
            and p["enrollmentDigest"] == _digest(enrollment)
            and p["role"] == role
            and _recent(p["observedAt"], now) is not None
        ):
            return _hold("HOLD_QL429_KEY_POSSESSION_SIGNATURE_INVALID")
        digests[role] = _digest(p)
    digest = journal.claim(
        monitor,
        "enrollment",
        enrollment["externalStoreId"],
        {
            "enrollment": enrollment,
            "ownerApprovalDigest": _digest(approval_body),
            "proofDigests": digests,
        },
    )
    if digest is None:
        return _hold("HOLD_QL429_ENROLLMENT_REPLAY_OR_DURABILITY")
    return {
        **_hold("QL429_PUBLIC_PINS_ENROLLED_NOT_REMOTE_ACTIVATION"),
        "accepted": True,
        "state": "QL429_PUBLIC_PIN_ENROLLMENT_ONLY",
        "externalStoreId": enrollment["externalStoreId"],
        "enrollmentDigest": digest,
        "receiver": "OFF_NOT_FRESHLY_VERIFIED",
    }


def _enrolled(monitor: PersistentReeMonitor304, journal: ProtectedEnrollmentJournal320, store: str):
    data = journal.read(monitor, "enrollment", store)
    if data is None or not isinstance(data["payload"], dict):
        return None
    enrollment = data["payload"].get("enrollment")
    pins = _pins(enrollment)
    if pins is None or enrollment["externalStoreId"] != store:
        return None
    return data, enrollment, pins


def issue_ql429_original_challenge320(
    monitor: PersistentReeMonitor304,
    precheck319: Any,
    *,
    old_journal: ProtectedAnchorJournal319,
    journal: ProtectedEnrollmentJournal320,
    external_store_id: str,
    scope: dict[str, Any],
    reentry_id: str,
    request_id: str,
    comms_precheck_digest: str,
    read_remote: Callable[..., Any] | None,
    read_local: Callable[..., Any] | None,
    attest_external_store: Callable[..., bool] | None,
    attest_reopened_ql428_precheck: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """192-bit one-use challenge ONLY after signed fresh off-host custody."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    enrolled = _enrolled(monitor, journal, external_store_id)
    if not (
        _on_ree(monitor)
        and type(now) is int
        and enrolled
        and _scope(scope)
        and _id(reentry_id)
        and _id(request_id)
        and _sha(comms_precheck_digest)
        and isinstance(old_journal, ProtectedAnchorJournal319)
        and isinstance(precheck319, dict)
        and precheck319.get("accepted") is True
        and precheck319.get("state") == "QL428_SUPERVISED_REENTRY_PRECHECK_ONLY"
        and precheck319.get("reentryId") == reentry_id
        and precheck319.get("connection") == "HOLD"
        and precheck319.get("receiver") == "OFF"
        and old_journal.exact(monitor, scope, "PRECHECK", precheck319.get("precheckDigest"))
    ):
        return _hold("HOLD_QL429_DURABLE_QL428_PRECHECK_REQUIRED")
    enroll_record, enrollment, pins = enrolled
    remote = _anchor_readback(
        scope,
        enrollment["anchorId"],
        request_id,
        external_store_id,
        read_remote,
        read_local,
        *pins["anchor"],
        *pins["reader"],
        attest_external_store,
        now,
    )
    if remote is None:
        return _hold("HOLD_QL429_NEW_REMOTE_ANCHOR_CHALLENGE_FAILED")
    evidence = {
        "source_revision": SOURCE319_MAIN,
        "comms_revision": COMMS429_CONTRACT,
        "external_store_id": external_store_id,
        "ceremony_id": scope["ceremonyId"],
        "episode_id": scope["episodeId"],
        "reentry_id": reentry_id,
        "incident_id": remote["incidentId"],
        "anchor_digest": remote["anchorDigest"],
        "closure_receipt_digest": remote["closureReceiptDigest"],
        "comms_precheck_digest": comms_precheck_digest,
        "source_precheck_digest": precheck319["precheckDigest"],
    }
    if not _callback(attest_reopened_ql428_precheck, **evidence):
        return _hold("HOLD_QL429_Ql428_PRECHECK_NOT_INDEPENDENTLY_REOPENED")
    challenge = {
        "schema": CHALLENGE,
        "scope": scope,
        "incidentId": remote["incidentId"],
        "externalStoreId": external_store_id,
        "anchorDigest": remote["anchorDigest"],
        "closureReceiptDigest": remote["closureReceiptDigest"],
        "reentryId": reentry_id,
        "ql428PrecheckDigest": comms_precheck_digest,
        "challengeId": secrets.token_hex(24),
        "issuedAt": _utc(now),
        "expiresAt": _utc(now + 60_000),
    }
    digest = journal.claim(
        monitor,
        "challenge",
        reentry_id,
        {
            "enrollmentDigest": enroll_record["recordDigest"],
            "challenge": challenge,
            "sourcePrecheckDigest": precheck319["precheckDigest"],
            "remoteReadbackDigest": remote["readbackDigest"],
        },
        nonce=challenge["challengeId"],
    )
    if digest is None:
        return _hold("HOLD_QL429_CHALLENGE_REPLAY_OR_UNDURABLE")
    return {
        **_hold("QL429_NEW_ORIGINAL_HOST_CHALLENGE_WAITING_FOR_SIGNED_OFF"),
        "accepted": True,
        "state": "QL429_FRESH_ORIGINAL_HOST_CHALLENGE_ISSUED",
        "challenge": challenge,
        "challengeDigest": _digest(challenge),
        "challengeCustodyDigest": digest,
        "receiver": "OFF_NOT_FRESHLY_VERIFIED",
    }


def _challenge(
    monitor: PersistentReeMonitor304,
    journal: ProtectedEnrollmentJournal320,
    store: str,
    reentry: str,
    now: int,
):
    enrolled = _enrolled(monitor, journal, store)
    record = journal.read(monitor, "challenge", reentry)
    if not (enrolled and record and isinstance(record["payload"], dict)):
        return None
    data = record["payload"]
    c = data.get("challenge")
    if not (
        data.get("enrollmentDigest") == enrolled[0]["recordDigest"]
        and isinstance(c, dict)
        and set(c)
        == {
            "schema",
            "scope",
            "incidentId",
            "externalStoreId",
            "anchorDigest",
            "closureReceiptDigest",
            "reentryId",
            "ql428PrecheckDigest",
            "challengeId",
            "issuedAt",
            "expiresAt",
        }
        and c["schema"] == CHALLENGE
        and _scope(c["scope"])
        and _id(c["incidentId"])
        and c["externalStoreId"] == store
        and c["reentryId"] == reentry
        and all(_sha(c[k]) for k in ("anchorDigest", "closureReceiptDigest", "ql428PrecheckDigest"))
        and isinstance(c["challengeId"], str)
        and len(c["challengeId"]) == 48
        and all(v in "0123456789abcdef" for v in c["challengeId"])
        and _recent(c["issuedAt"], now) is not None
        and _timestamp(c["expiresAt"]) == _timestamp(c["issuedAt"]) + 60_000
        and now <= _timestamp(c["expiresAt"])
    ):
        return None
    return enrolled, record, c


def verify_ql429_original_host_off320(
    monitor: PersistentReeMonitor304,
    external_store_id: str,
    reentry_id: str,
    response: Any,
    *,
    journal: ProtectedEnrollmentJournal320,
    attest_original_host_off: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Original Ree signer proof only; never an activation request."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (_on_ree(monitor) and type(now) is int):
        return _hold("HOLD_QL429_ORIGINAL_HOST_PROTECTED_SESSION_REQUIRED")
    challenge = _challenge(monitor, journal, external_store_id, reentry_id, now)
    if challenge is None:
        return _hold("HOLD_QL429_FRESH_CHALLENGE_EXPIRED_OR_NOT_ENROLLED")
    enrolled, _, c = challenge
    p = _native(
        response,
        {
            "schema",
            "scope",
            "incidentId",
            "externalStoreId",
            "reentryId",
            "challengeDigest",
            "challengeId",
            "hostMachineId",
            "receiverState",
            "nextCeremonyId",
            "respondedAt",
        },
        RESPONSE,
        *enrolled[2]["originalHost"],
    )
    if not (
        p
        and p["scope"] == c["scope"]
        and p["incidentId"] == c["incidentId"]
        and p["externalStoreId"] == external_store_id
        and p["reentryId"] == reentry_id
        and p["challengeDigest"] == _digest(c)
        and p["challengeId"] == c["challengeId"]
        and p["hostMachineId"] == HOST
        and p["receiverState"] == "OFF"
        and _id(p["nextCeremonyId"])
        and p["nextCeremonyId"] != c["scope"]["ceremonyId"]
        and _recent(p["respondedAt"], now) is not None
        and _timestamp(p["respondedAt"]) >= _timestamp(c["issuedAt"])
    ):
        return _hold("HOLD_QL429_SIGNED_HOST_CHALLENGE_WRONG_OR_ON")
    evidence = {
        "source_revision": SOURCE319_MAIN,
        "comms_revision": COMMS429_CONTRACT,
        "ceremony_id": c["scope"]["ceremonyId"],
        "episode_id": c["scope"]["episodeId"],
        "incident_id": c["incidentId"],
        "reentry_id": reentry_id,
        "challenge_id": c["challengeId"],
        "host": HOST,
        "next_ceremony_id": p["nextCeremonyId"],
        "receiver": "OFF",
        "response_digest": _digest(p),
    }
    if not _callback(attest_original_host_off, **evidence):
        return _hold("HOLD_QL429_REAL_ORIGINAL_RECEIVER_OFF_NOT_CONFIRMED")
    return {
        **_hold("QL429_HOST_OFF_SIGNED_AWAIT_INDEPENDENT_THREE_MASTERS"),
        "accepted": True,
        "state": "QL429_ORIGINAL_HOST_OFF_CHALLENGE_VERIFIED",
        "scope": c["scope"],
        "incidentId": c["incidentId"],
        "externalStoreId": external_store_id,
        "closureReceiptDigest": c["closureReceiptDigest"],
        "reentryId": reentry_id,
        "nextCeremonyId": p["nextCeremonyId"],
        "challengeDigest": _digest(c),
        "hostResponseDigest": _digest(p),
        "hostObservedAt": p["respondedAt"],
        "receiver": "OFF",
    }


def witness_ql429_three_master_pilot320(
    monitor: PersistentReeMonitor304,
    external_store_id: str,
    reentry_id: str,
    response: Any,
    reports: Any,
    approval: Any,
    *,
    journal: ProtectedEnrollmentJournal320,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    attest_original_host_off: Callable[..., bool] | None,
    attest_master_witness_custody: Callable[..., bool] | None,
    attest_owner_decision: Callable[..., bool] | None,
    attest_external_witness_storage: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Three unique Ed25519 Masters + dual-owner precheck; still receiver OFF."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    host = verify_ql429_original_host_off320(
        monitor,
        external_store_id,
        reentry_id,
        response,
        journal=journal,
        attest_original_host_off=attest_original_host_off,
        now_ms=now,
    )
    enrolled = _enrolled(monitor, journal, external_store_id)
    if not (
        host.get("accepted")
        and enrolled
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and owner_pin != reviewer_pin
        and owner_pin not in {value[1] for value in enrolled[2].values()}
        and reviewer_pin not in {value[1] for value in enrolled[2].values()}
        and isinstance(reports, dict)
        and set(reports) == set(MASTERS)
    ):
        return _hold("HOLD_QL429_THREE_MASTER_AND_OWNER_AUTHORITY_REQUIRED")
    bodies = []
    for master in MASTERS:
        p = _native(
            reports[master],
            {
                "schema",
                "masterId",
                "scope",
                "incidentId",
                "externalStoreId",
                "closureReceiptDigest",
                "reentryId",
                "challengeDigest",
                "hostResponseDigest",
                "nextCeremonyId",
                "status",
                "witnessedAt",
            },
            WITNESS,
            *enrolled[2][master],
        )
        if not (
            p
            and p["masterId"] == master
            and p["scope"] == host["scope"]
            and p["incidentId"] == host["incidentId"]
            and p["externalStoreId"] == external_store_id
            and p["closureReceiptDigest"] == host["closureReceiptDigest"]
            and p["reentryId"] == reentry_id
            and p["challengeDigest"] == host["challengeDigest"]
            and p["hostResponseDigest"] == host["hostResponseDigest"]
            and p["nextCeremonyId"] == host["nextCeremonyId"]
            and p["status"] == "WITNESSED_NEW_SUPERVISED_PILOT_PRECHECK_ONLY"
            and _recent(p["witnessedAt"], now) is not None
            and _timestamp(p["witnessedAt"]) >= _timestamp(host["hostObservedAt"])
        ):
            return _hold("HOLD_QL429_SIGNED_MASTER_REENTRY_WITNESS_INVALID")
        bodies.append(p)
    reports_digest = _digest(bodies)
    d = approval.get("payload") if isinstance(approval, dict) else None
    if not (
        isinstance(approval, dict)
        and set(approval) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(d, dict)
        and set(d)
        == {
            "schema",
            "scope",
            "incidentId",
            "externalStoreId",
            "reentryId",
            "closureReceiptDigest",
            "challengeDigest",
            "hostResponseDigest",
            "nextCeremonyId",
            "mastersDigest",
            "action",
            "ownerId",
            "reviewerId",
            "approvedAt",
        }
        and d["schema"] == OWNER
        and d["scope"] == host["scope"]
        and d["incidentId"] == host["incidentId"]
        and d["externalStoreId"] == external_store_id
        and d["reentryId"] == reentry_id
        and d["closureReceiptDigest"] == host["closureReceiptDigest"]
        and d["challengeDigest"] == host["challengeDigest"]
        and d["hostResponseDigest"] == host["hostResponseDigest"]
        and d["nextCeremonyId"] == host["nextCeremonyId"]
        and d["mastersDigest"] == reports_digest
        and d["action"] == ACTION
        and _id(d["ownerId"])
        and _id(d["reviewerId"])
        and d["ownerId"] != d["reviewerId"]
        and _recent(d["approvedAt"], now) is not None
        and _timestamp(d["approvedAt"]) >= _timestamp(host["hostObservedAt"])
        and _trusted_signature(d, approval["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(d, approval["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return _hold("HOLD_QL429_DUAL_SIGNED_PILOT_OWNER_WITNESS_REJECTED")
    evidence = {
        "source_revision": SOURCE319_MAIN,
        "comms_revision": COMMS429_CONTRACT,
        "external_store_id": external_store_id,
        "reentry_id": reentry_id,
        "old_ceremony_id": host["scope"]["ceremonyId"],
        "next_ceremony_id": host["nextCeremonyId"],
        "challenge_digest": host["challengeDigest"],
        "host_response_digest": host["hostResponseDigest"],
        "masters_digest": reports_digest,
        "owner_digest": _digest(d),
    }
    if not all(
        (
            _callback(attest_master_witness_custody, **evidence),
            _callback(attest_owner_decision, **evidence),
            _callback(attest_external_witness_storage, **evidence),
        )
    ):
        return _hold("HOLD_QL429_INDEPENDENT_WITNESS_CUSTODY_MISSING")
    digest = journal.claim(
        monitor,
        "witness",
        reentry_id,
        {
            "enrollmentDigest": enrolled[0]["recordDigest"],
            "challengeDigest": host["challengeDigest"],
            "hostResponseDigest": host["hostResponseDigest"],
            "mastersDigest": reports_digest,
            "ownerDecisionDigest": _digest(d),
            "nextCeremonyId": host["nextCeremonyId"],
        },
    )
    if digest is None:
        return _hold("HOLD_QL429_SIGNED_PILOT_WITNESS_REPLAY_OR_DURABILITY")
    return {
        **_hold("QL429_NEW_ORIGINAL_HOST_QL424_CEREMONY_REQUIRED"),
        "accepted": True,
        "state": "QL429_DURABLE_THREE_MASTER_PILOT_REENTRY_WITNESS_ONLY",
        "witnessDigest": digest,
        "masterCount": 3,
        "reentryId": reentry_id,
        "nextCeremonyId": host["nextCeremonyId"],
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "recovery": "NEW_SUPERVISED_QL424_CEREMONY_AND_LIVE_ACCEPTANCE_REQUIRED",
    }


def reconcile_master_evidence320(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Authenticated, read-only source view; no live enrollment acceptance."""
    return {
        **reconcile_master_evidence319(monitor),
        "schema": "rosevear.ai-hub.master360-ql429-enrollment-witness320.v1",
        "sourceBuild": 320,
        "source319MainAtReconciliation": SOURCE319_MAIN,
        "commsQl429ContractAtReconciliation": COMMS429_CONTRACT,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql429ExternalStoreIdentity": "HOLD_NO_INDEPENDENT_REMOTE_STORE_CUSTODY",
        "ql429SeparateSignerEnrollment": "HOLD_NO_REAL_SIGNER_ENROLLMENT",
        "ql429IndependentPossessionProofs": "HOLD_NO_ORIGINAL_DEVICE_SIGNED_PROOFS",
        "ql429FreshChallenge": "HOLD_NO_ORIGINAL_HOST_192_BIT_CHALLENGE",
        "ql429OriginalHostOff": "HOLD_NO_FRESH_ORIGINAL_SIGNED_RECEIVER_OFF",
        "ql429ThreeMasterWitness": "HOLD_NO_THREE_SIGNED_PILOT_WITNESSES",
        "ql429OwnerWitness": "HOLD_NO_DISTINCT_DUAL_SIGNED_OWNER_PRECHECK",
        "ql429DurableWitness": "HOLD_NO_EXTERNAL_WITNESS_CUSTODY",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
