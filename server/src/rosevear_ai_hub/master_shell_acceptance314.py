"""Build 314 original-host field receipt, QL-423 replay and owner recheck.

Private host-only verifiers. CI cannot install a source, sign third-party
receipts, authorize Windows recovery, or switch any Master to CONNECTED.
"""

import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _corr, _episode, _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance313 import (
    ProtectedPilotJournal313,
    _signed,
    reconcile_master_evidence313,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE313_MAIN = "b790adf2e19343d1132fad0eef8107c21e3e560d"
COMMS423_MAIN = "2adc527a88adb790f0edc5192df62f03be8c397c"
CONTROLLER379_MAIN = "ce4216c667b514f40e2fb6e506e5b62c222b1736"
FIELD_SCHEMA = "rosevear.ai-hub.master360-original-field-receipt314.v1"
RESTORE_SCHEMA = "rosevear.ai-hub.master360-ql423-restoration314.v1"
REVIEW_SCHEMA = "rosevear.ai-hub.master360-owner-review314.v1"
STAGES = ("FIELD", "RESTORE", "REVIEW")
ZERO = "0" * 64


class ProtectedFieldJournal314:
    """Private single-use episode custody, storing only ordered SHA-256 digests."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and stage in STAGES
            and _sha(digest)
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                item = db.execute(
                    """SELECT digest FROM field_journal314
                    WHERE episode=? AND correlation=? AND stage=?""",
                    (episode, correlation, stage),
                ).fetchone()
                return item == (digest,)
        except (OSError, sqlite3.Error):
            return False

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
        predecessor: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and stage in STAGES
            and _sha(digest)
            and _sha(predecessor)
        ):
            return False
        index = STAGES.index(stage)
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS field_journal314 (
                    episode TEXT NOT NULL, correlation TEXT NOT NULL,
                    stage TEXT NOT NULL, digest TEXT NOT NULL,
                    predecessor TEXT NOT NULL, PRIMARY KEY (episode,stage),
                    UNIQUE (correlation,stage))"""
                )
                if index == 0:
                    if predecessor != ZERO:
                        return False
                else:
                    prev = db.execute(
                        """SELECT digest FROM field_journal314
                        WHERE episode=? AND correlation=? AND stage=?""",
                        (episode, correlation, STAGES[index - 1]),
                    ).fetchone()
                    if prev != (predecessor,):
                        return False
                cur = db.execute(
                    """INSERT OR IGNORE INTO field_journal314
                    VALUES (?,?,?,?,?)""",
                    (episode, correlation, stage, digest, predecessor),
                )
                return cur.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def reconcile_original_field314(
    monitor: PersistentReeMonitor304,
    pilot313: Any,
    comms313: Any,
    owner313: Any,
    signed_field: Any,
    *,
    old_journal: ProtectedPilotJournal313,
    journal: ProtectedFieldJournal314,
    public_der: bytes | None,
    independent_pin: str,
    attest_original_process: Callable[..., bool] | None,
    attest_ql423_custody: Callable[..., bool] | None,
    attest_reopened_source: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Require a genuine signed original-host source receipt and prior custody."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(old_journal, ProtectedPilotJournal313)
        and isinstance(journal, ProtectedFieldJournal314)
        and isinstance(pilot313, dict)
        and isinstance(comms313, dict)
        and isinstance(owner313, dict)
        and pilot313.get("accepted") is True
        and comms313.get("accepted") is True
        and owner313.get("accepted") is True
        and pilot313.get("state") == "ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION"
        and comms313.get("state") == "QL421_CLOSURE_REVIEW_WITNESSED_NOT_ACCEPTED"
        and owner313.get("state") == "SIGNED_OWNER_REVIEW_CONTINUITY_NO_ACTIVATION"
        and all(v.get("connection") == "HOLD" for v in (pilot313, comms313, owner313))
        and owner313.get("ownerAcceptance") == "HOLD"
    ):
        return _hold("HOLD_UNVERIFIED_BUILD_313_CHAIN")
    episode = pilot313.get("episodeId")
    corr = pilot313.get("correlationId")
    if not (
        _episode(episode)
        and _corr(corr)
        and all(v.get("episodeId") == episode for v in (comms313, owner313))
        and all(v.get("correlationId") == corr for v in (comms313, owner313))
        and _sha(pilot313.get("pilotReceiptSha256"))
        and _sha(comms313.get("commsReviewSha256"))
        and _sha(owner313.get("controllerReviewSha256"))
        and old_journal.exact(
            monitor,
            episode=episode,
            correlation=corr,
            stage="CONTROLLER",
            digest=owner313["controllerReviewSha256"],
        )
    ):
        return _hold("HOLD_NO_EXACT_BUILD_313_CONTROLLER_JOURNAL")
    fields = {
        "schema",
        "sourceId",
        "hostId",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "episodeId",
        "correlationId",
        "pilotReceiptSha256",
        "commsReviewSha256",
        "controllerReviewSha256",
        "ql423CustodySha256",
        "ql423ReceiverAckSha256",
        "issuedAt",
        "connection",
    }
    body = _signed(signed_field, fields, FIELD_SCHEMA, public_der, independent_pin, now)
    if body is None:
        return _hold("HOLD_UNSIGNED_OR_STALE_ORIGINAL_FIELD_RECEIPT")
    if not (
        body["sourceId"] == SOURCE
        and body["hostId"] == HOST
        and body["sourceRevision"] == SOURCE313_MAIN
        and body["commsRevision"] == COMMS423_MAIN
        and body["controllerRevision"] == CONTROLLER379_MAIN
        and body["episodeId"] == episode
        and body["correlationId"] == corr
        and body["pilotReceiptSha256"] == pilot313["pilotReceiptSha256"]
        and body["commsReviewSha256"] == comms313["commsReviewSha256"]
        and body["controllerReviewSha256"] == owner313["controllerReviewSha256"]
        and _sha(body["ql423CustodySha256"])
        and _sha(body["ql423ReceiverAckSha256"])
        and body["connection"] == "HOLD"
    ):
        return _hold("HOLD_FIELD_IDENTITY_OR_MASTER_REVISION_DRIFT")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    args = {
        "host_id": HOST,
        "source_revision": SOURCE313_MAIN,
        "comms_revision": COMMS423_MAIN,
        "controller_revision": CONTROLLER379_MAIN,
        "episode_id": episode,
        "correlation_id": corr,
        "field_digest": digest,
        "custody_digest": body["ql423CustodySha256"],
        "receiver_digest": body["ql423ReceiverAckSha256"],
    }
    if not (
        _callback(attest_original_process, **args)
        and _callback(attest_ql423_custody, **args)
        and _callback(attest_reopened_source, **args)
    ):
        return _hold("HOLD_NO_REAL_ORIGINAL_HOST_OR_QL423_CUSTODY")
    if not journal.claim(monitor, episode, corr, "FIELD", digest, ZERO):
        return _hold("HOLD_FIELD_REPLAY_OR_CUSTODY_STORAGE")
    return {
        **_hold("ORIGINAL_FIELD_RECEIPT_WITNESSED_NO_ACTIVATION"),
        "accepted": True,
        "episodeId": episode,
        "correlationId": corr,
        "fieldDigest": digest,
        "custodyDigest": body["ql423CustodySha256"],
        "receiverDigest": body["ql423ReceiverAckSha256"],
        "controllerReviewSha256": owner313["controllerReviewSha256"],
    }


def reconcile_ql423_restoration314(
    monitor: PersistentReeMonitor304,
    field: Any,
    signed_checkpoints: Any,
    *,
    journal: ProtectedFieldJournal314,
    master_public_keys: dict[str, bytes],
    master_pins: dict[str, str],
    ql422_terminal_digest: str,
    attest_ql423_reopened_store: Callable[..., bool] | None,
    attest_real_restart: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Only three independent Master signatures can witness QL-423 replay."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedFieldJournal314)
        and isinstance(field, dict)
        and field.get("accepted") is True
        and field.get("state") == "ORIGINAL_FIELD_RECEIPT_WITNESSED_NO_ACTIVATION"
        and field.get("connection") == "HOLD"
        and _sha(ql422_terminal_digest)
        and isinstance(signed_checkpoints, dict)
        and set(signed_checkpoints) == set(MASTERS)
        and set(master_public_keys) == set(MASTERS)
        and set(master_pins) == set(MASTERS)
        and journal.exact(
            monitor,
            field.get("episodeId"),
            field.get("correlationId"),
            "FIELD",
            field.get("fieldDigest"),
        )
    ):
        return _hold("HOLD_MISSING_ORIGINAL_FIELD_OR_THREE_MASTER_CHAIN")
    fields = {
        "schema",
        "master",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "episodeId",
        "correlationId",
        "fieldDigest",
        "custodyDigest",
        "receiverDigest",
        "ql422TerminalSha256",
        "checkpointId",
        "issuedAt",
        "connection",
    }
    digests = []
    ids = set()
    for master in MASTERS:
        body = _signed(
            signed_checkpoints[master],
            fields,
            RESTORE_SCHEMA,
            master_public_keys[master],
            master_pins[master],
            now,
        )
        if body is None:
            return _hold("HOLD_INVALID_MASTER_RESTORATION_SIGNATURE")
        checkpoint = body["checkpointId"]
        if not (
            body["master"] == master
            and body["sourceRevision"] == SOURCE313_MAIN
            and body["commsRevision"] == COMMS423_MAIN
            and body["controllerRevision"] == CONTROLLER379_MAIN
            and body["episodeId"] == field["episodeId"]
            and body["correlationId"] == field["correlationId"]
            and body["fieldDigest"] == field["fieldDigest"]
            and body["custodyDigest"] == field["custodyDigest"]
            and body["receiverDigest"] == field["receiverDigest"]
            and body["ql422TerminalSha256"] == ql422_terminal_digest
            and isinstance(checkpoint, str)
            and 8 <= len(checkpoint) <= 96
            and checkpoint.isascii()
            and checkpoint.isalnum()
            and checkpoint not in ids
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_MISMATCHED_MASTER_RESTORATION_LEDGER")
        ids.add(checkpoint)
        digests.append(hashlib.sha256(_serialize(body)).hexdigest())
    result_digest = hashlib.sha256("|".join(digests).encode()).hexdigest()
    args = {
        "source_revision": SOURCE313_MAIN,
        "comms_revision": COMMS423_MAIN,
        "controller_revision": CONTROLLER379_MAIN,
        "episode_id": field["episodeId"],
        "correlation_id": field["correlationId"],
        "custody_digest": field["custodyDigest"],
        "terminal_digest": ql422_terminal_digest,
        "restoration_digest": result_digest,
    }
    if not (
        _callback(attest_ql423_reopened_store, **args) and _callback(attest_real_restart, **args)
    ):
        return _hold("HOLD_UNVERIFIED_QL423_DURABLE_RESTART_READBACK")
    if not journal.claim(
        monitor,
        field["episodeId"],
        field["correlationId"],
        "RESTORE",
        result_digest,
        field["fieldDigest"],
    ):
        return _hold("HOLD_REPLAYED_OR_UNAVAILABLE_RESTORATION_CUSTODY")
    return {
        **_hold("THREE_MASTER_QL423_RESTORATION_WITNESSED_REVIEW_ONLY"),
        "accepted": True,
        "episodeId": field["episodeId"],
        "correlationId": field["correlationId"],
        "fieldDigest": field["fieldDigest"],
        "restorationDigest": result_digest,
        "ql422TerminalSha256": ql422_terminal_digest,
        "controllerReviewSha256": field["controllerReviewSha256"],
    }


def recheck_owner_decision314(
    monitor: PersistentReeMonitor304,
    restored: Any,
    signed_decisions: Any,
    *,
    journal: ProtectedFieldJournal314,
    public_keys: dict[str, bytes],
    independent_pins: dict[str, str],
    attest_independent_owner_review: Callable[..., bool] | None,
    attest_controller_owner_ledger: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Two distinct Ed25519 signatures authorize a review, never activation."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedFieldJournal314)
        and isinstance(restored, dict)
        and restored.get("accepted") is True
        and restored.get("state") == "THREE_MASTER_QL423_RESTORATION_WITNESSED_REVIEW_ONLY"
        and restored.get("connection") == "HOLD"
        and isinstance(signed_decisions, dict)
        and set(signed_decisions) == {"owner", "reviewer"}
        and set(public_keys) == {"owner", "reviewer"}
        and set(independent_pins) == {"owner", "reviewer"}
        and public_keys["owner"] != public_keys["reviewer"]
        and independent_pins["owner"] != independent_pins["reviewer"]
        and journal.exact(
            monitor,
            restored.get("episodeId"),
            restored.get("correlationId"),
            "RESTORE",
            restored.get("restorationDigest"),
        )
    ):
        return _hold("HOLD_NO_INDEPENDENT_MASTER_OWNER_RECHECK")
    fields = {
        "schema",
        "role",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "episodeId",
        "correlationId",
        "fieldDigest",
        "restorationDigest",
        "ql422TerminalSha256",
        "previousControllerReviewSha256",
        "decision",
        "issuedAt",
        "ownerAcceptance",
        "connection",
    }
    decisions = []
    for role in ("owner", "reviewer"):
        body = _signed(
            signed_decisions[role],
            fields,
            REVIEW_SCHEMA,
            public_keys[role],
            independent_pins[role],
            now,
        )
        if body is None or not (
            body["role"] == role
            and body["sourceRevision"] == SOURCE313_MAIN
            and body["commsRevision"] == COMMS423_MAIN
            and body["controllerRevision"] == CONTROLLER379_MAIN
            and body["episodeId"] == restored["episodeId"]
            and body["correlationId"] == restored["correlationId"]
            and body["fieldDigest"] == restored["fieldDigest"]
            and body["restorationDigest"] == restored["restorationDigest"]
            and body["ql422TerminalSha256"] == restored["ql422TerminalSha256"]
            and body["previousControllerReviewSha256"] == restored["controllerReviewSha256"]
            and body["decision"] in ("REQUEST_ACTIVATION_REVIEW", "MAINTAIN_HOLD", "REOPEN")
            and body["ownerAcceptance"] == "HOLD"
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_INVALID_SEPARATE_OWNER_REVIEW_SIGNATURE")
        decisions.append(body)
    if any(decisions[0][key] != decisions[1][key] for key in fields - {"role", "issuedAt"}):
        return _hold("HOLD_OWNER_AND_REVIEWER_DECISIONS_DISAGREE")
    digest = hashlib.sha256(
        "|".join(hashlib.sha256(_serialize(body)).hexdigest() for body in decisions).encode()
    ).hexdigest()
    args = {
        "episode_id": restored["episodeId"],
        "correlation_id": restored["correlationId"],
        "controller_revision": CONTROLLER379_MAIN,
        "source_revision": SOURCE313_MAIN,
        "restoration_digest": restored["restorationDigest"],
        "decision_digest": digest,
    }
    if not (
        _callback(attest_independent_owner_review, **args)
        and _callback(attest_controller_owner_ledger, **args)
    ):
        return _hold("HOLD_NO_INDEPENDENT_OWNER_OR_CONTROLLER_READBACK")
    if not journal.claim(
        monitor,
        restored["episodeId"],
        restored["correlationId"],
        "REVIEW",
        digest,
        restored["restorationDigest"],
    ):
        return _hold("HOLD_OWNER_DECISION_REPLAY_OR_STORAGE")
    requested = decisions[0]["decision"] == "REQUEST_ACTIVATION_REVIEW"
    state = (
        "READY_FOR_SEPARATE_SUPERVISED_ACTIVATION_NOT_EXECUTED"
        if requested
        else "OWNER_RECHECK_RECORDED_HOLD"
    )
    return {
        **_hold(state),
        "accepted": True,
        "episodeId": restored["episodeId"],
        "correlationId": restored["correlationId"],
        "ownerDecisionSha256": digest,
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "masterSync": "HOLD",
    }


def reconcile_master_evidence314(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Code-level HOLD only. No signed runtime proof is imported by this API."""
    return {
        **reconcile_master_evidence313(monitor),
        "schema": "rosevear.ai-hub.master360-field-ledger-recheck314.v1",
        "sourceBuild": 314,
        "source313MainAtReconciliation": SOURCE313_MAIN,
        "commsQl423MainAtReconciliation": COMMS423_MAIN,
        "controller379MainAtReconciliation": CONTROLLER379_MAIN,
        "originalFieldReceipt": "HOLD_NO_ORIGINAL_HOST_SIGNED_FIELD_RECEIPT",
        "ql423ReplayRestoration": "HOLD_NO_DURABLE_THREE_MASTER_REPLAY_READBACK",
        "ownerDecisionRecheck": "HOLD_NO_SEPARATELY_SIGNED_OWNER_REVIEW",
        "privateFieldJournal": "NO_ORIGINAL_HOST_LEDGER_ADMISSION",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
