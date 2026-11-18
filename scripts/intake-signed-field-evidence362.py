"""QL-471 offline manual intake of signed claims; never installs or activates a worker.

Default is read-only. --append writes a private local hash-chained history report,
not raw evidence or credentials. Use trusted signer pins from an independent channel.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from rosevear_ai_hub.signed_intake362 import (
    append_claim,
    dashboard,
    empty_ledger,
    validate_pins,
    verify_claim,
    verify_ledger,
)


def bounded(path: Path, limit: int) -> bytes:
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= limit:
        raise ValueError("HOLD_QL471_FILE_MISSING_OR_UNSAFE")
    return path.read_bytes()


def private_destination(path: Path) -> None:
    repo = Path(__file__).resolve().parents[1]
    target = path.resolve(strict=False)
    if repo == target or repo in target.parents:
        raise ValueError("HOLD_QL471_PRIVATE_LEDGER_OUTSIDE_REPO_REQUIRED")
    if not path.parent.is_dir() or path.parent.is_symlink() or path.is_symlink():
        raise ValueError("HOLD_QL471_UNSAFE_LEDGER_DESTINATION")


def evaluate(
    package: Path,
    pins_file: Path,
    source_commit: str,
    ledger_path: Path | None,
    *,
    append: bool,
) -> dict:
    if append and ledger_path is None:
        raise ValueError("HOLD_QL471_LEDGER_REQUIRED_FOR_APPEND")
    if not package.is_dir() or package.is_symlink():
        raise ValueError("HOLD_QL471_PACKAGE_MISSING")
    pins = validate_pins(json.loads(bounded(pins_file, 4096)))
    item = verify_claim(
        bounded(package / "receipt.json", 8192),
        bounded(package / "signature.b64", 256),
        bounded(package / "evidence.bin", 131072),
        bounded(package / "signer.pub.pem", 4096),
        pins,
        source_commit,
    )
    if ledger_path is None:
        return {
            "status": "VERIFIED_SIGNED_CLAIM_NOT_PHYSICAL_PROOF",
            "drillId": item["drillId"],
            "scope": item["scope"],
            "sourceCommit": source_commit,
            "writePerformed": False,
            "physicalUnattendedProductionGreen": False,
            "threeMasterWorkerProductionGreen": False,
        }
    private_destination(ledger_path)
    lock = ledger_path.with_suffix(ledger_path.suffix + ".lock")
    fd = None
    temp_path = None
    try:
        if append:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        existing = json.loads(bounded(ledger_path, 262144)) if ledger_path.exists() else empty_ledger(
            source_commit
        )
        ledger = verify_ledger(existing, source_commit)
        result = append_claim(ledger, item)
        if append:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=ledger_path.parent, delete=False,
                prefix=".ql471-", suffix=".json"
            ) as file:
                temp_path = Path(file.name)
                os.chmod(temp_path, 0o600)
                json.dump(result, file, sort_keys=True, separators=(",", ":"))
                file.write("\n")
                file.flush()
                os.fsync(file.fileno())
            os.replace(temp_path, ledger_path)
            temp_path = None
        summary = dashboard(result, source_commit)
        return {
            "status": "SIGNED_CLAIM_RECORDED_NOT_PHYSICAL_PROOF" if append
            else "VERIFIED_SIGNED_CLAIM_NOT_PHYSICAL_PROOF",
            "drillId": item["drillId"],
            "scope": item["scope"],
            "sourceCommit": source_commit,
            "writePerformed": append,
            "historyCount": summary["historyCount"] if append else len(ledger["events"]),
            "ledgerHeadSha256": summary["latestChainHash"] if append else None,
            "physicalUnattendedProductionGreen": False,
            "threeMasterWorkerProductionGreen": False,
        }
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
        if fd is not None:
            os.close(fd)
            lock.unlink(missing_ok=True)


def main() -> None:
    p = argparse.ArgumentParser(description="QL-471 offline signed field claims intake (no activation)")
    p.add_argument("--package-dir", type=Path, required=True)
    p.add_argument("--trusted-pins-json", type=Path, required=True)
    p.add_argument("--expected-commit", required=True)
    p.add_argument("--ledger", type=Path)
    p.add_argument("--append", action="store_true")
    a = p.parse_args()
    try:
        print(json.dumps(evaluate(
            a.package_dir, a.trusted_pins_json, a.expected_commit, a.ledger,
            append=a.append,
        ), sort_keys=True))
    except (ValueError, TypeError, OSError, UnicodeError) as error:
        code = str(error)
        if not code.startswith("HOLD_"):
            code = "HOLD_QL471_INTAKE_FAILED"
        p.exit(2, code + "\n")


if __name__ == "__main__":
    main()
