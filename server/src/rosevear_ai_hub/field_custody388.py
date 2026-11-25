"""Private, bounded, transactional Build 388 witness custody; never actuates devices."""

from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from rosevear_ai_hub.field_witness388 import (
    GATE_IDS,
    HEX40,
    HEX64,
    MAX_AGE_MS,
    WitnessPair388,
    reconcile388,
)

MAX_ROWS = 10000


class Evidence388(BaseModel):
    """Only redacted metadata; no screenshots, credentials, paths or private logs."""

    model_config = ConfigDict(extra="forbid", strict=True)
    gate_id: str = Field(max_length=64)
    artifact_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    result: Literal["observed", "issue", "unavailable"]
    recovery: Literal["not_applicable", "isolated_restore_reported"]


class Intake388(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    pair: WitnessPair388
    evidence: Evidence388


class Issue388(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    gate_id: str = Field(max_length=64)


class Review388(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    challenge: str = Field(pattern=r"^[0-9a-f]{64}$")
    decision: Literal["reviewed", "follow_up"]


def evidence_bytes388(evidence: Evidence388) -> bytes:
    return json.dumps(evidence.model_dump(), sort_keys=True, separators=(",", ":")).encode()


def _connect(path: Path) -> sqlite3.Connection:
    # Provision the private parent separately under an owner-restricted ACL.
    if (
        not path.is_absolute()
        or path.suffix != ".sqlite3"
        or not path.parent.is_dir()
        or path.is_symlink()
        or path.resolve() != path
        or (path.exists() and not path.is_file())
    ):
        raise ValueError("HOLD_PRIVATE_LEDGER_PATH")
    db = sqlite3.connect(path, timeout=5)
    try:
        db.execute("PRAGMA busy_timeout=5000")
        db.execute(
            """CREATE TABLE IF NOT EXISTS witness388 (
            challenge TEXT PRIMARY KEY, gate TEXT NOT NULL, release TEXT NOT NULL,
            owner INTEGER NOT NULL, issued INTEGER NOT NULL, expires INTEGER NOT NULL,
            original_key TEXT NOT NULL, reviewer_key TEXT NOT NULL,
            digest TEXT, evidence TEXT, pair TEXT, received INTEGER,
            decision TEXT, reviewed INTEGER)"""
        )
        db.commit()
        return db
    except BaseException:
        db.close()
        raise


def _trust(original_key: str, reviewer_key: str, release_sha: str) -> None:
    if (
        not HEX64.fullmatch(original_key)
        or not HEX64.fullmatch(reviewer_key)
        or original_key == reviewer_key
        or not HEX40.fullmatch(release_sha)
    ):
        raise ValueError("HOLD_TRUST_PINS_MISSING_OR_INVALID")


def issue388(
    path: Path, *, gate: str, owner: int, now_ms: int,
    original_key: str, reviewer_key: str, release_sha: str,
) -> dict[str, object]:
    _trust(original_key, reviewer_key, release_sha)
    if gate not in GATE_IDS:
        raise ValueError("HOLD_UNKNOWN_GATE")
    challenge = secrets.token_hex(32)
    with closing(_connect(path)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        if db.execute("SELECT COUNT(*) FROM witness388").fetchone()[0] >= MAX_ROWS:
            raise ValueError("HOLD_LEDGER_CAPACITY_REVIEW")
        db.execute(
            "INSERT INTO witness388 VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,NULL)",
            (challenge, gate, release_sha, owner, now_ms, now_ms + MAX_AGE_MS,
             original_key, reviewer_key),
        )
    return {
        "challenge": challenge, "gateId": gate, "releaseSha": release_sha,
        "issuedAtMs": now_ms, "expiresAtMs": now_ms + MAX_AGE_MS, "fieldCertified": False,
    }


def intake388(
    path: Path, packet: Intake388, *, owner: int, now_ms: int,
    original_key: str, reviewer_key: str, release_sha: str,
) -> dict[str, object]:
    _trust(original_key, reviewer_key, release_sha)
    pair, evidence = packet.pair, packet.evidence
    result = reconcile388(
        pair, now_ms=now_ms, original_key=original_key, reviewer_key=reviewer_key,
        release_sha=release_sha, original_host=True,
    )
    if not result["pairedSignaturesVerified"]:
        raise ValueError(str(result["status"]))
    a, b = pair.original, pair.independent
    digest = hashlib.sha256(evidence_bytes388(evidence)).hexdigest()
    if evidence.gate_id != a.gate_id or digest != a.evidence_sha256:
        raise ValueError("HOLD_EVIDENCE_DIGEST_MISMATCH")
    if (evidence.recovery != "not_applicable") != (a.gate_id == "encrypted-backup-restore"):
        raise ValueError("HOLD_RECOVERY_SCOPE_MISMATCH")
    with closing(_connect(path)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT gate,release,owner,issued,expires,original_key,reviewer_key,received "
            "FROM witness388 WHERE challenge=?", (a.challenge,),
        ).fetchone()
        if row is None:
            raise ValueError("HOLD_UNKNOWN_CHALLENGE")
        if row[7] is not None:
            raise ValueError("HOLD_REPLAY")
        if row[:3] != (a.gate_id, release_sha, owner) or row[5:7] != (original_key, reviewer_key):
            raise ValueError("HOLD_CHALLENGE_SCOPE_MISMATCH")
        if not row[3] <= a.observed_at_ms <= b.observed_at_ms <= now_ms <= row[4]:
            raise ValueError("HOLD_CHALLENGE_EXPIRED_OR_PREISSUE")
        db.execute(
            "UPDATE witness388 SET digest=?,evidence=?,pair=?,received=? WHERE challenge=?",
            (digest, evidence_bytes388(evidence).decode(), pair.model_dump_json(),
             now_ms, a.challenge),
        )
    return {
        **result, "status": "DURABLE_SIGNED_METADATA_OWNER_REVIEW_REQUIRED",
        "challengeIssuanceVerified": True, "durableReplayProtectionVerified": True,
        "evidencePersisted": True,
    }


def review388(
    path: Path, request: Review388, *, owner: int, now_ms: int,
    original_key: str, reviewer_key: str, release_sha: str,
) -> dict[str, object]:
    _trust(original_key, reviewer_key, release_sha)
    with closing(_connect(path)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT owner,release,original_key,reviewer_key,received,decision,evidence,pair,"
            "digest FROM witness388 WHERE challenge=?", (request.challenge,),
        ).fetchone()
        if row is None or row[:4] != (owner, release_sha, original_key, reviewer_key):
            raise ValueError("HOLD_REVIEW_SCOPE")
        if row[4] is None or row[4] > now_ms or row[5] is not None:
            raise ValueError("HOLD_REVIEW_NOT_PENDING")
        evidence = Evidence388.model_validate_json(row[6])
        packet = WitnessPair388.model_validate_json(row[7])
        if hashlib.sha256(evidence_bytes388(evidence)).hexdigest() != row[8]:
            raise ValueError("HOLD_STORED_EVIDENCE_MISMATCH")
        result = reconcile388(
            packet, now_ms=row[4], original_key=original_key, reviewer_key=reviewer_key,
            release_sha=release_sha, original_host=True,
        )
        if (
            not result["pairedSignaturesVerified"]
            or packet.original.challenge != request.challenge
            or packet.original.evidence_sha256 != row[8]
            or packet.original.gate_id != evidence.gate_id
        ):
            raise ValueError("HOLD_STORED_WITNESS_MISMATCH")
        if request.decision == "reviewed" and evidence.result != "observed":
            raise ValueError("HOLD_ISSUE_REQUIRES_FOLLOW_UP")
        db.execute(
            "UPDATE witness388 SET decision=?,reviewed=? WHERE challenge=?",
            (request.decision, now_ms, request.challenge),
        )
    return {
        "status": "SIGNED_METADATA_REVIEW_RECORDED", "decision": request.decision,
        "recoveryReviewRecorded": (
            request.decision == "reviewed" and evidence.recovery == "isolated_restore_reported"
        ),
        "independentRecoveryClosed": False, "fieldCertified": False,
    }


def snapshot388(path: Path, *, owner: int, release_sha: str) -> dict[str, object]:
    # Read-only: no implicit ledger creation by a GET.
    rows = []
    if path.is_file() and not path.is_symlink() and path.resolve() == path:
        with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as db:
            rows = db.execute(
                "SELECT challenge,gate,received,decision FROM witness388 "
                "WHERE owner=? AND release=? AND received IS NOT NULL "
                "ORDER BY received DESC LIMIT 100", (owner, release_sha),
            ).fetchall()
    return {
        "status": "PRIVATE_METADATA_REVIEW_FIELD_HOLD",
        "receipts": [
            {"challenge": a, "gateId": b, "receivedAtMs": c, "decision": d}
            for a, b, c, d in rows
        ],
        "fieldCertified": False, "independentRecoveryClosed": False,
    }
