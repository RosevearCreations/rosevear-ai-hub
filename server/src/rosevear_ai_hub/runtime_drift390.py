"""Build 390: signed runtime observations, never remote command authority."""

from __future__ import annotations

import json
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from pydantic import BaseModel, ConfigDict, Field

MASTERS390 = ("rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub")
SCHEMA390 = "rosevear.hub.runtime-observation390.v1"
FRESH_MS = 600000
MAX_RECEIPTS = 10000
SHA40 = re.compile(r"[a-f0-9]{40}")
KEY64 = re.compile(r"[a-f0-9]{64}")


class Observation390(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    source: Literal["rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub"]
    target_sha: str = Field(pattern=r"^[a-f0-9]{40}$")
    runtime_sha: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at_ms: int = Field(ge=0, le=9007199254740991)
    sequence: int = Field(ge=1, le=9007199254740991)
    healthy: bool
    signature: str = Field(pattern=r"^[a-f0-9]{128}$")


def signing_bytes390(observation: Observation390) -> bytes:
    payload = {"schema": SCHEMA390, **observation.model_dump(exclude={"signature"})}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def validate_policy390(pins: dict[str, str], targets: dict[str, str]) -> None:
    if (
        set(pins) != set(MASTERS390)
        or set(targets) != set(MASTERS390)
        or any(not KEY64.fullmatch(value) for value in pins.values())
        or len(set(pins.values())) != len(MASTERS390)
        or any(not SHA40.fullmatch(value) for value in targets.values())
    ):
        raise ValueError("HOLD_MASTER_TRUST_NOT_CONFIGURED")


def verify390(observation: Observation390, pin: str, target: str) -> None:
    if observation.target_sha != target:
        raise ValueError("HOLD_UNAPPROVED_TARGET")
    try:
        Ed25519PublicKey.from_public_bytes(bytes.fromhex(pin)).verify(
            bytes.fromhex(observation.signature), signing_bytes390(observation)
        )
    except (InvalidSignature, ValueError):
        raise ValueError("HOLD_SIGNATURE_INVALID") from None


def safe_path390(path: Path) -> Path:
    if (
        not path.is_absolute()
        or path.suffix != ".sqlite3"
        or not path.parent.is_dir()
        or path.is_symlink()
        or path.resolve() != path
        or (path.exists() and not path.is_file())
    ):
        raise ValueError("HOLD_PRIVATE_LEDGER_PATH")
    return path


def intake390(
    path: Path,
    observation: Observation390,
    *,
    pins: dict[str, str],
    targets: dict[str, str],
    now_ms: int,
) -> None:
    validate_policy390(pins, targets)
    pin = pins[observation.source]
    verify390(observation, pin, targets[observation.source])
    if not 0 <= now_ms - observation.observed_at_ms <= FRESH_MS:
        raise ValueError("HOLD_STALE_OR_FUTURE_OBSERVATION")
    with closing(sqlite3.connect(safe_path390(path), timeout=5)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            """CREATE TABLE IF NOT EXISTS runtime390 (
                source TEXT NOT NULL, pin TEXT NOT NULL, sequence INTEGER NOT NULL,
                observed INTEGER NOT NULL, target TEXT NOT NULL, packet TEXT NOT NULL,
                PRIMARY KEY(source, pin, sequence))"""
        )
        prior = db.execute(
            "SELECT sequence,observed FROM runtime390 WHERE source=? AND pin=? "
            "ORDER BY sequence DESC LIMIT 1",
            (observation.source, pin),
        ).fetchone()
        if prior and (
            observation.sequence <= prior[0] or observation.observed_at_ms <= prior[1]
        ):
            raise ValueError("HOLD_REPLAY_OR_OUT_OF_ORDER")
        if db.execute("SELECT COUNT(*) FROM runtime390").fetchone()[0] >= MAX_RECEIPTS:
            raise ValueError("HOLD_LEDGER_CAPACITY_REVIEW")
        db.execute(
            "INSERT INTO runtime390 VALUES (?,?,?,?,?,?)",
            (
                observation.source,
                pin,
                observation.sequence,
                observation.observed_at_ms,
                observation.target_sha,
                observation.model_dump_json(),
            ),
        )


def disposition390(samples: list[Observation390], now_ms: int) -> str:
    if not samples:
        return "HOLD_NO_SIGNED_RUNTIME"
    last = samples[-1]
    if not 0 <= now_ms - last.observed_at_ms <= FRESH_MS:
        return "HOLD_STALE_RUNTIME"
    if last.runtime_sha != last.target_sha:
        return "OPEN_DEPLOYMENT_DRIFT"
    if not last.healthy:
        return "OPEN_REPORTED_UNHEALTHY"
    failures = [
        index
        for index, sample in enumerate(samples)
        if sample.runtime_sha != sample.target_sha or not sample.healthy
    ]
    if not failures:
        return "ALIGNED_SOURCE_REPORTED"
    recovery = samples[failures[-1] + 1 :]
    if (
        len(recovery) >= 2
        and 0 <= now_ms - recovery[-2].observed_at_ms <= FRESH_MS
        and recovery[-1].observed_at_ms - recovery[-2].observed_at_ms >= 30000
        and recovery[-1].sequence == recovery[-2].sequence + 1
    ):
        return "RECOVERY_SOURCE_REPORTED"
    return "HOLD_RECOVERY_CONFIRMATION"


def snapshot390(
    path: Path,
    *,
    pins: dict[str, str],
    targets: dict[str, str],
    now_ms: int,
    loaded_hub_sha: str | None,
) -> dict[str, object]:
    validate_policy390(pins, targets)
    path = safe_path390(path)
    groups: dict[str, list[Observation390]] = {source: [] for source in MASTERS390}
    if path.exists():
        with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=5)) as db:
            rows = db.execute(
                "SELECT source,pin,sequence,observed,target,packet FROM runtime390 "
                "ORDER BY source,sequence LIMIT ?",
                (MAX_RECEIPTS + 1,),
            ).fetchall()
        if len(rows) > MAX_RECEIPTS:
            raise ValueError("HOLD_LEDGER_CAPACITY_REVIEW")
        for source, pin, sequence, observed, target, raw in rows:
            if source not in groups:
                raise ValueError("HOLD_UNKNOWN_STORED_SOURCE")
            if pin != pins[source] or target != targets[source]:
                continue
            if not isinstance(raw, str) or len(raw) > 2048:
                raise ValueError("HOLD_INVALID_STORED_PACKET")
            sample = Observation390.model_validate_json(raw)
            verify390(sample, pin, target)
            if (sample.source, sample.sequence, sample.observed_at_ms) != (
                source,
                sequence,
                observed,
            ):
                raise ValueError("HOLD_STORED_RECEIPT_MISMATCH")
            if groups[source] and observed <= groups[source][-1].observed_at_ms:
                raise ValueError("HOLD_STORED_SEQUENCE_MISMATCH")
            groups[source].append(sample)
    sources = []
    for source, samples in groups.items():
        status = disposition390(samples, now_ms)
        if source == "rosevear-ai-hub" and loaded_hub_sha != targets[source]:
            status = "HOLD_LOCAL_LOADED_SHA_MISMATCH"
        sources.append(
            {
                "source": source,
                "targetSha": targets[source],
                "runtimeSha": samples[-1].runtime_sha if samples else None,
                "observedAtMs": samples[-1].observed_at_ms if samples else None,
                "status": status,
            }
        )
    return {
        "schema": SCHEMA390,
        "sources": sources,
        "independentThreeMasterAcceptance": False,
        "remoteRecoveryExecuted": False,
        "receiverActivationAuthorized": False,
    }
