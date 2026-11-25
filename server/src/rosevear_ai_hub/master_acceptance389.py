"""Challenge-bound three-Master receipt verification; no remote control."""

import json
import re
import secrets
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from pydantic import BaseModel, ConfigDict, Field

MASTERS = ("rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub")
TTL = 900000
SHA = re.compile(r"[a-f0-9]{40}")
KEY = re.compile(r"[a-f0-9]{64}")
SCHEMA = "rosevear.hub.master-acceptance389.v1"


class Receipt389(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    source: Literal["rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub"]
    challenge: str = Field(pattern=r"^[a-f0-9]{64}$")
    releases: dict[str, str] = Field(min_length=3, max_length=3)
    observed_at_ms: int = Field(ge=0, le=9007199254740991)
    signature: str = Field(pattern=r"^[a-f0-9]{128}$")


class Packet389(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    receipts: list[Receipt389] = Field(min_length=3, max_length=3)


def signing_bytes389(receipt: Receipt389) -> bytes:
    payload = {"schema": SCHEMA, **receipt.model_dump(exclude={"signature"})}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()


def policy389(pins, targets, loaded):
    if (
        set(pins) != set(MASTERS)
        or set(targets) != set(MASTERS)
        or any(not KEY.fullmatch(v) for v in pins.values())
        or len(set(pins.values())) != 3
        or any(not SHA.fullmatch(v) for v in targets.values())
        or loaded != targets["rosevear-ai-hub"]
    ):
        raise ValueError("HOLD_RELEASE_OR_TRUST_POLICY")


def connect389(path: Path):
    if (
        not path.is_absolute()
        or path.suffix != ".sqlite3"
        or path.resolve() != path
        or not path.parent.is_dir()
        or path.is_symlink()
        or (path.exists() and not path.is_file())
    ):
        raise ValueError("HOLD_PRIVATE_LEDGER_PATH")
    return sqlite3.connect(path, timeout=5)


def _scope(pins, targets):
    return json.dumps([pins, targets], sort_keys=True, separators=(",", ":"))


def issue389(path, *, pins, targets, loaded, owner, now):
    policy389(pins, targets, loaded)
    challenge = secrets.token_hex(32)
    with closing(connect389(path)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            """CREATE TABLE IF NOT EXISTS master389 (
            challenge TEXT PRIMARY KEY, owner INTEGER NOT NULL,
            scope TEXT NOT NULL, issued INTEGER NOT NULL,
            received INTEGER, packet TEXT)"""
        )
        if db.execute("SELECT COUNT(*) FROM master389").fetchone()[0] >= 10000:
            raise ValueError("HOLD_LEDGER_CAPACITY")
        db.execute(
            "INSERT INTO master389 VALUES (?,?,?,?,NULL,NULL)",
            (challenge, owner, _scope(pins, targets), now),
        )
    return {"challenge": challenge, "releases": targets, "expiresAtMs": now + TTL}


def verify389(packet, *, pins, targets, challenge, issued, now):
    if {r.source for r in packet.receipts} != set(MASTERS):
        raise ValueError("HOLD_SOURCE_SET")
    for receipt in packet.receipts:
        if (
            receipt.challenge != challenge
            or receipt.releases != targets
            or not issued <= receipt.observed_at_ms <= now
            or now - issued > TTL
        ):
            raise ValueError("HOLD_RECEIPT_SCOPE_OR_TIME")
        try:
            Ed25519PublicKey.from_public_bytes(bytes.fromhex(pins[receipt.source])).verify(
                bytes.fromhex(receipt.signature), signing_bytes389(receipt)
            )
        except (InvalidSignature, ValueError):
            raise ValueError("HOLD_SIGNATURE_INVALID") from None


def intake389(path, packet, *, pins, targets, loaded, owner, now):
    policy389(pins, targets, loaded)
    challenge = packet.receipts[0].challenge
    with closing(connect389(path)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT owner,scope,issued,received FROM master389 WHERE challenge=?",
            (challenge,),
        ).fetchone()
        if not row or row[:2] != (owner, _scope(pins, targets)) or row[3] is not None:
            raise ValueError("HOLD_CHALLENGE_OR_REPLAY")
        verify389(packet, pins=pins, targets=targets, challenge=challenge, issued=row[2], now=now)
        db.execute(
            "UPDATE master389 SET received=?,packet=? WHERE challenge=?",
            (now, packet.model_dump_json(), challenge),
        )


def read389(path, *, pins, targets, loaded, owner, now):
    policy389(pins, targets, loaded)
    if not path.exists():
        return False
    if path.is_symlink() or path.resolve() != path or not path.is_file():
        raise ValueError("HOLD_PRIVATE_LEDGER_PATH")
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=5)) as db:
        row = db.execute(
            "SELECT challenge,issued,received,packet FROM master389 "
            "WHERE owner=? AND scope=? AND received IS NOT NULL "
            "ORDER BY received DESC LIMIT 1",
            (owner, _scope(pins, targets)),
        ).fetchone()
    if not row or not 0 <= now - row[2] <= TTL:
        return False
    packet = Packet389.model_validate_json(row[3])
    verify389(
        packet, pins=pins, targets=targets, challenge=row[0], issued=row[1], now=now
    )
    return True
