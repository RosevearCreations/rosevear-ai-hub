"""QL-438 protected corrective closure: source-only and fail-closed.

All signed evidence is supplied by independently supervised read-only adapters.
Synthetic CI never constitutes original-host, off-host, or live receiver proof.
"""
import os
import sqlite3
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF

REMEDIES = {
    LATE_HOST: (
        "ORIGINAL_HOST_PILOT_SHUTDOWN_OVERRAN_LEASE",
        "ORIGINAL_HOST_FAIL_CLOSED_SHUTDOWN_WATCHDOG_REMEDIATED",
    ),
    LATE_OFF: (
        "INDEPENDENT_RECEIVER_OFF_RECEIPT_LATE",
        "INDEPENDENT_OFF_WITNESS_DELIVERY_REMEDIATED",
    ),
}
DECISION = "CLOSE_EXPIRED_LEASE_EXCEPTION_CORRECTIVE_EVIDENCE_ONLY_KEEP_HOLD"
MASTER_DECISION = "SIGNED_CORRECTIVE_REVIEW_NO_RUNTIME_REENTRY"
UNKNOWN_OFF = "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"


def _hold438(reason: str) -> dict[str, Any]:
    return {
        "accepted": False, "state": reason, "receiver": UNKNOWN_OFF,
        "connection": "HOLD", "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "runtimeUptime": "UNKNOWN", "leaseExceptionOpen": True,
        "incidentClosureAuthorized": False,
    }


class ProtectedCorrectiveJournal329:
    """Incident-keyed, single-use PENDING -> CLOSED, with exact digest readback."""

    def __init__(self, path: Path):
        self.path = path

    def read(self, monitor: Any, incident: str, stage: str) -> dict[str, str] | None:
        if not (
            _on_ree(monitor) and self.path.is_absolute()
            and stage in ("PENDING", "CLOSED") and self.path.is_file()
        ):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    "SELECT request_digest,evidence_digest,receipt_digest "
                    "FROM corrective329 WHERE incident=? AND stage=?",
                    (incident, stage),
                ).fetchone()
            if row is None:
                return None
            request, evidence, receipt = row
            if receipt != _digest({
                "incident": incident, "stage": stage,
                "request": request, "evidence": evidence,
            }):
                raise ValueError("QL438_TAMPERED_PRIVATE_RECEIPT")
            return {"requestDigest": request, "evidenceDigest": evidence, "receiptDigest": receipt}
        except sqlite3.OperationalError as exc:
            if "no such table" in str(exc):
                return None
            raise ValueError("QL438_UNREADABLE_PRIVATE_CUSTODY") from None
        except (sqlite3.Error, OSError):
            raise ValueError("QL438_UNREADABLE_PRIVATE_CUSTODY") from None

    def claim(
        self, monitor: Any, incident: str, stage: str,
        request: str, evidence: str,
    ) -> dict[str, str] | None:
        if not (_on_ree(monitor) and self.path.is_absolute() and
                not self.path.is_symlink() and not self.path.parent.is_symlink() and
                stage in ("PENDING", "CLOSED") and
                all(
                    isinstance(x, str) and len(x) == 64
                    and all(c in "0123456789abcdef" for c in x)
                    for x in (request, evidence)
                )):
            return None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS corrective329 ("
                    "incident TEXT NOT NULL, stage TEXT NOT NULL, "
                    "request_digest TEXT NOT NULL, evidence_digest TEXT NOT NULL, "
                    "receipt_digest TEXT NOT NULL, PRIMARY KEY(incident,stage))"
                )
                if stage == "PENDING":
                    if db.execute(
                        "SELECT 1 FROM corrective329 WHERE incident=?", (incident,)
                    ).fetchone():
                        return None
                else:
                    pending = db.execute(
                        "SELECT request_digest FROM corrective329 "
                        "WHERE incident=? AND stage='PENDING'", (incident,)
                    ).fetchone()
                    if pending != (request,) or db.execute(
                        "SELECT 1 FROM corrective329 WHERE incident=? AND stage='CLOSED'",
                        (incident,),
                    ).fetchone():
                        return None
                receipt = _digest({
                    "incident": incident, "stage": stage,
                    "request": request, "evidence": evidence,
                })
                db.execute(
                    "INSERT INTO corrective329 VALUES (?,?,?,?,?)",
                    (incident, stage, request, evidence, receipt),
                )
            if os.name != "nt":
                os.chmod(self.path, 0o600)
            recorded = self.read(monitor, incident, stage)
            return recorded if recorded and recorded["receiptDigest"] == receipt else None
        except (OSError, sqlite3.Error, ValueError):
            return None


def _verify(
    role: str, signed: Any, keys: dict[str, tuple[bytes, str]],
    expected: dict[str, Any],
) -> bool:
    """Use the existing Ed25519 pinned verifier and reject any unexpected fields."""
    return (
        role in keys
        and isinstance(signed, dict)
        and isinstance(signed.get("payload"), dict)
        and signed["payload"] == expected
        and signed["payload"].get("schema") == f"rosevear.ai-hub.ql438.{role}.v1"
        and _native(
            signed, set(expected), f"rosevear.ai-hub.ql438.{role}.v1", *keys[role]
        ) == expected
    )


def review_corrective_closure329(
    monitor: Any, prior437: dict[str, Any], request: dict[str, Any],
    journal: ProtectedCorrectiveJournal329, keys: dict[str, tuple[bytes, str]],
    *, read_host: Any, read_off: Any, read_reviewer: Any,
    read_anchor: Any, read_reader: Any, master_reports: dict[str, Any],
    owner_signatures: dict[str, Any],
) -> dict[str, Any]:
    """No receiver mutation. One-use PENDING is committed before any adapter call."""
    def fail(reason: str):
        return _hold438(reason)

    if not (_on_ree(monitor) and isinstance(prior437, dict)
            and prior437.get("accepted") is True
            and prior437.get("state")
            == "DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY"
            and prior437.get("leaseExceptionOpen") is True
            and prior437.get("incidentClosureAuthorized") is False
            and prior437.get("connection") == "HOLD"
            and prior437.get("activationAuthorized") is False
            and prior437.get("leaseDisposition") in REMEDIES
            and isinstance(journal, ProtectedCorrectiveJournal329)
            and isinstance(request, dict) and isinstance(keys, dict)):
        return fail("HOLD_QL438_EXACT_OPEN_QL437_EXCEPTION_REQUIRED")
    incident = prior437.get("originalIncidentId")
    nonce = request.get("remediationNonce")
    rid = request.get("remediationId")
    if not (isinstance(incident, str) and incident and isinstance(nonce, str) and len(nonce) >= 16
            and isinstance(rid, str) and len(rid) >= 12
            and len({incident, nonce, rid, prior437.get("nextCeremonyId")}) == 4
            and request.get("originalIncidentId") == incident
            and request.get("ql437FinalReceiptDigest") == prior437.get("finalReceiptDigest")
            and request.get("ql437AnchorDigest") == prior437.get("externalAnchorDigest")
            and request.get("ql437ReaderDigest") == prior437.get("independentAnchorReadbackDigest")
            and request.get("leaseDisposition") == prior437.get("leaseDisposition")
            and request.get("rootCause") == REMEDIES[prior437["leaseDisposition"]][0]
            and request.get("remedy") == REMEDIES[prior437["leaseDisposition"]][1]
            and all(isinstance(request.get(x), str) and len(request[x]) == 40
                    for x in ("sourceRevision", "controllerRevision"))
            and all(
                callable(x) for x in
                (read_host, read_off, read_reviewer, read_anchor, read_reader)
            )
            and set(keys) == {
                "host", "receiver", "remediationReviewer", "anchor",
                "reader", "owner", "ownerReviewer", *MASTERS,
            }
            and all(
                isinstance(key, tuple) and len(key) == 2
                and isinstance(key[0], bytes) and len(key[0]) == 32
                and isinstance(key[1], str) and bool(key[1])
                for key in keys.values()
            )
            and len({key[0] for key in keys.values()}) == len(keys)
            and len({key[1] for key in keys.values()}) == len(keys)):
        return fail("HOLD_QL438_INVALID_BOUND_REQUEST_OR_SIGNER_PINS")
    digest = _digest(request)
    pending = journal.claim(monitor, incident, "PENDING", digest, digest)
    if pending is None:
        return fail("HOLD_QL438_ONE_USE_PENDING_FAILED_OR_REPLAY")
    try:
        host = read_host(request=request)
        hp = host["payload"]
        if not (_verify("host", host, keys, hp) and hp.get("requestDigest") == digest
                and hp.get("hostMachineId") == "DESKTOP-AE894KC"
                and hp.get("receiverState") == "OFF"
                and hp.get("failClosedShutdownArmed") is True
                and type(hp.get("repairSequence")) is int and hp["repairSequence"] > 0
                and hp.get("remedy") == request["remedy"]):
            return fail("HOLD_QL438_ORIGINAL_HOST_CORRECTIVE_OFF_INVALID")
        off = read_off(request=request, hostDigest=_digest(hp))
        op = off["payload"]
        if not (_verify("receiver", off, keys, op) and op.get("requestDigest") == digest
                and op.get("hostDigest") == _digest(hp) and op.get("receiverState") == "OFF"
                and type(op.get("offSequence")) is int and op["offSequence"] >= hp["repairSequence"]
                and type(op.get("observedAtMs")) is int
                and type(hp.get("observedAtMs")) is int
                and op["observedAtMs"] > hp["observedAtMs"]):
            return fail("HOLD_QL438_INDEPENDENT_OFF_INVALID")
        review = read_reviewer(request=request, hostDigest=_digest(hp), offDigest=_digest(op))
        rp = review["payload"]
        if not (_verify("remediationReviewer", review, keys, rp)
                and rp.get("requestDigest") == digest
                and rp.get("hostDigest") == _digest(hp) and rp.get("offDigest") == _digest(op)
                and rp.get("remedy") == request["remedy"]
                and type(rp.get("reviewedAtMs")) is int
                and rp["reviewedAtMs"] > op["observedAtMs"]):
            return fail("HOLD_QL438_INDEPENDENT_REMEDIATION_REVIEW_INVALID")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL438_THREE_MASTERS_MISSING")
        for name in MASTERS:
            report = master_reports[name]
            mp = report["payload"]
            if not (_verify(name, report, keys, mp) and mp.get("masterId") == name
                    and mp.get("requestDigest") == digest and mp.get("offDigest") == _digest(op)
                    and mp.get("reviewDigest") == _digest(rp)
                    and mp.get("decision") == MASTER_DECISION):
                return fail("HOLD_QL438_MASTER_SIGNATURE_OR_CORRELATION_INVALID")
        master_digest = _digest([master_reports[name]["payload"] for name in MASTERS])
        anchor = read_anchor(request=request, masterDigest=master_digest)
        ap = anchor["payload"]
        if not (_verify("anchor", anchor, keys, ap) and ap.get("requestDigest") == digest
                and ap.get("previousAnchorDigest") == prior437["externalAnchorDigest"]
                and ap.get("masterDigest") == master_digest
                and ap.get("offDigest") == _digest(op)):
            return fail("HOLD_QL438_EXTERNAL_ANCHOR_INVALID")
        reader = read_reader(request=request, anchorDigest=_digest(ap))
        rd = reader["payload"]
        if not (_verify("reader", reader, keys, rd) and rd.get("requestDigest") == digest
                and rd.get("anchorDigest") == _digest(ap)):
            return fail("HOLD_QL438_INDEPENDENT_ANCHOR_READBACK_INVALID")
        if (
            not isinstance(owner_signatures, dict)
            or set(owner_signatures) != {"owner", "ownerReviewer"}
        ):
            return fail("HOLD_QL438_DUAL_OWNER_MISSING")
        for role in ("owner", "ownerReviewer"):
            approval = owner_signatures[role]
            p = approval["payload"]
            if not (_verify(role, approval, keys, p) and p.get("requestDigest") == digest
                    and p.get("readerDigest") == _digest(rd)
                    and p.get("masterDigest") == master_digest
                    and p.get("decision") == DECISION):
                return fail("HOLD_QL438_DUAL_OWNER_SIGNATURE_INVALID")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL438_PRIVATE_PENDING_TAMPERED")
        evidence = _digest({"host": hp, "off": op, "review": rp, "masters": master_digest,
                            "anchor": ap, "reader": rd,
                            "owners": [
                                owner_signatures[r]["payload"]
                                for r in ("owner", "ownerReviewer")
                            ]})
        closed = journal.claim(monitor, incident, "CLOSED", digest, evidence)
        if not closed:
            return fail("HOLD_QL438_CLOSED_COMMIT_OR_READBACK_FAILED")
        return {
            **_hold438("DURABLE_QL438_OWNER_GATED_LEASE_EXCEPTION_CLOSURE_READBACK"),
            "accepted": True, "leaseExceptionOpen": False, "incidentClosureAuthorized": True,
            "originalIncidentId": incident, "pendingReceiptDigest": pending["receiptDigest"],
            "closedReceiptDigest": closed["receiptDigest"],
            "receiver": "OFF_VERIFIED_FOR_THIS_SIGNED_REVIEW_ONLY",
            "ownerAcceptance": "DUAL_SIGNED_CORRECTIVE_EVIDENCE_CLOSURE_ONLY",
        }
    except (KeyError, TypeError, ValueError, OSError, sqlite3.Error):
        return fail("HOLD_QL438_MISSING_OR_MALFORMED_SIGNED_EVIDENCE")


def reconcile_master_evidence329(monitor: Any) -> dict[str, Any]:
    """Authenticated source-only owner projection; no private custody or live OFF inference."""
    return {
        **_hold438("HOLD_QL438_NO_FRESH_SIGNED_CORRECTIVE_CLOSURE_READBACK"),
        "schema": "rosevear.ai-hub.master360-ql438-corrective329.v1",
        "sourceBuild": 329,
        "ql438OriginalHost": "HOLD_NO_SIGNED_ORIGINAL_HOST_CORRECTIVE_OFF",
        "ql438IndependentOff": "HOLD_NO_INDEPENDENT_SIGNED_OFF",
        "ql438ThirdReviewer": "HOLD_NO_DISTINCT_REMEDIATION_REVIEW",
        "ql438ThreeMasters": "HOLD_NO_THREE_SIGNED_MASTER_REVIEWS",
        "ql438ExternalAnchor": "HOLD_NO_SIGNED_OFF_HOST_CORRECTIVE_ANCHOR",
        "ql438IndependentReader": "HOLD_NO_DISTINCT_SIGNED_ANCHOR_READER",
        "ql438DualOwner": "HOLD_NO_DUAL_SIGNED_OWNER_CLOSURE",
        "ql438PrivateClosure": "HOLD_NO_DURABLE_ORIGINAL_HOST_CLOSED_READBACK",
    }
