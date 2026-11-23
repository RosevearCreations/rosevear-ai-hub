"""Build 382: non-destructive encrypted copy custody and source dependency inventory.

Operator-initiated only. Decrypts a COPY solely into Build050's disposable
scratch directory; never restores live data or claims off-machine proof.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tomllib
from datetime import UTC, datetime, timedelta
from pathlib import Path

from rosevear_ai_hub.backup import BackupError
from rosevear_ai_hub.disaster_recovery import (
    DrillError,
    _sha256_stream,
    _write_evidence,
    drill_archive,
)


class CustodyError(Exception):
    """A rejected copy or unsafe/incomplete restore rehearsal."""


def _archive_file(path: Path) -> Path:
    if path.is_symlink() or not path.is_file() or path.suffix != ".hubbackup":
        raise CustodyError("Provide an existing non-symlink .hubbackup archive.")
    return path.resolve(strict=True)


def verify_copied_archive382(
    source_archive: Path,
    copied_archive: Path,
    passphrase_file: Path,
    work_dir: Path,
    evidence: Path | None = None,
    *,
    now: datetime | None = None,
) -> dict[str, object]:
    """Verify byte identity, then ACTUALLY restore/decrypt only the separate copy."""
    origin = _archive_file(source_archive)
    copy = _archive_file(copied_archive)
    if origin.samefile(copy):
        raise CustodyError("Original and recovery copy must be different files.")
    if origin.parent == copy.parent:
        raise CustodyError("Recovery copy must be stored outside the original directory.")
    if work_dir.is_symlink() or not work_dir.is_dir():
        raise CustodyError("An existing, non-symlink scratch directory is required.")
    scratch = work_dir.resolve(strict=True)
    if scratch in {origin.parent, copy.parent} or scratch == origin or scratch == copy:
        raise CustodyError("Scratch must not be the source or copy storage directory.")
    if evidence is not None:
        if evidence.is_symlink() or evidence.exists() or not evidence.parent.is_dir():
            raise CustodyError("Evidence must be a new file in an existing directory.")
        if evidence.resolve() in {origin, copy}:
            raise CustodyError("Evidence must not overwrite a protected archive.")
    if passphrase_file.is_symlink() or not passphrase_file.is_file():
        raise CustodyError("A protected local passphrase file is required.")
    # Verify copy identity BEFORE decrypting, then reconfirm after the drill.
    if origin.stat().st_size != copy.stat().st_size:
        raise CustodyError("Encrypted copy size differs from the source archive.")
    origin_hash = _sha256_stream(origin)
    if origin_hash != _sha256_stream(copy):
        raise CustodyError("Encrypted copy SHA-256 mismatch.")
    verified = drill_archive(copy, passphrase_file, scratch, evidence=None)
    if verified.get("status") != "pass" or verified.get("drill_type") != "operator_archive":
        raise CustodyError("Actual encrypted archive drill did not pass.")
    if verified.get("archive_sha256") != origin_hash:
        raise CustodyError("Decrypted archive does not match the original digest.")
    if _sha256_stream(origin) != origin_hash or _sha256_stream(copy) != origin_hash:
        raise CustodyError("Source/copy changed during verification.")
    now = now or datetime.now(UTC)
    if now.tzinfo is None:
        raise CustodyError("Timezone-aware verification clock required.")
    age = now - datetime.fromtimestamp(copy.stat().st_mtime, UTC)
    if age < -timedelta(minutes=5):
        freshness = "FUTURE_FILE_TIME_REVIEW"
    elif age > timedelta(days=7):
        freshness = "OLD_BACKUP_REVIEW"
    else:
        freshness = "WITHIN_SEVEN_DAYS"
    result: dict[str, object] = {
        "schema": "rosevear.hub.restore-custody382.v1",
        "status": "copy_decrypted_and_restored_in_isolated_scratch",
        "checkedAtUtc": now.isoformat(),
        "encryptedSha256": origin_hash,
        "copyIdenticalToSource": True,
        "distinctFilePaths": True,
        "differentPhysicalMachineVerified": False,
        "offMachineCopyIndependentlyWitnessed": False,
        "restoreOfExistingCopyTested": True,
        "sqliteIntegrity": verified["sqlite_integrity"],
        "verifiedFiles": verified["verified_files"],
        "verifiedPlaintextBytes": verified["verified_plaintext_bytes"],
        "backupFreshness": freshness,
        "retentionPolicyDays": 180,
        "retentionDeletionPerformed": False,
        "liveHubChanged": False,
        "secretsIncluded": False,
        "source": "LOCAL_OPERATOR_REHEARSAL_NOT_SIGNED_REMOTE_WITNESS",
        "fieldAcceptance": "HOLD",
    }
    _write_evidence(evidence, result)
    return result


def dependency_manifest382(repository_root: Path) -> dict[str, object]:
    """Produce a deterministic source-declared inventory, NOT a CVE/security scan."""
    root = repository_root.resolve(strict=True)
    project_path = root / "pyproject.toml"
    web_path = root / "apps" / "web" / "package.json"
    desktop_path = root / "apps" / "desktop" / "package.json"
    for path in (project_path, web_path, desktop_path):
        if path.is_symlink() or not path.is_file():
            raise CustodyError("Required declared dependency manifest is missing/linked.")
    with project_path.open("rb") as stream:
        py = tomllib.load(stream)
    web = json.loads(web_path.read_text(encoding="utf-8"))
    desktop = json.loads(desktop_path.read_text(encoding="utf-8"))
    sections = {
        "python.runtime": py.get("project", {}).get("dependencies", []),
        "python.dev": py.get("project", {}).get("optional-dependencies", {}).get("dev", []),
        "web.runtime": web.get("dependencies", {}),
        "web.dev": web.get("devDependencies", {}),
        "desktop.runtime": desktop.get("dependencies", {}),
        "desktop.dev": desktop.get("devDependencies", {}),
    }
    return {
        "schema": "rosevear.hub.dependency-manifest382.v1",
        "scope": "SOURCE_DECLARATIONS_NOT_RESOLVED_SBOM",
        "sourceFilesSha256": {
            str(path.relative_to(root)).replace(os.sep, "/"): _sha256_stream(path)
            for path in (project_path, web_path, desktop_path)
        },
        "declaredDependencies": sections,
        "vulnerabilityScanPerformed": False,
        "transitiveDependenciesAudited": False,
        "licenseComplianceCertified": False,
        "productionSecurityGreen": False,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build382: private read-only custody")
    commands = parser.add_subparsers(dest="command", required=True)
    verify = commands.add_parser("verify-copy")
    verify.add_argument("--source-archive", type=Path, required=True)
    verify.add_argument("--copy-archive", type=Path, required=True)
    verify.add_argument("--passphrase-file", type=Path, required=True)
    verify.add_argument("--work-dir", type=Path, required=True)
    verify.add_argument("--evidence", type=Path)
    manifest = commands.add_parser("dependency-manifest")
    manifest.add_argument("--repo-root", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "verify-copy":
            result = verify_copied_archive382(
                args.source_archive,
                args.copy_archive,
                args.passphrase_file,
                args.work_dir,
                args.evidence,
            )
        else:
            result = dependency_manifest382(args.repo_root)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (BackupError, CustodyError, DrillError, OSError, ValueError, KeyError) as exc:
        print(f"Build382 HOLD_{type(exc).__name__.upper()}: no acceptance published.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
