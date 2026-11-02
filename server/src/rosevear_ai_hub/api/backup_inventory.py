"""Build 224: bounded, read-only backup directory metadata for owner recovery review."""

from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/backup-inventory", tags=["backup-inventory"])
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]


def _mtime(path: Path) -> str | None:
    try:
        return datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat()
    except OSError:
        return None


def collect_backup_inventory(root: Path) -> dict:
    """List only expected names and coarse timestamps. Never read archives, keys or reports."""
    home = root / "logs" / "private-recovery"
    state = "not_found"
    archives: list[Path] = []
    reports: list[Path] = []
    if (root / "logs").is_symlink() or home.is_symlink():
        state = "unsafe_symlink"
    elif home.is_dir():
        state = "present"
        try:
            for index, item in enumerate(home.iterdir()):
                if index >= 1000:
                    break
                if item.is_symlink() or not item.is_file():
                    continue
                if item.name.startswith("hub-") and item.name.endswith(".hubbackup"):
                    archives.append(item)
                elif item.name.startswith("hub-") and item.name.endswith("-verified.json"):
                    reports.append(item)
        except OSError:
            state = "unavailable"
            archives, reports = [], []
    return {
        "sampled_at_utc": datetime.now(UTC).isoformat(),
        "source": "local_private_recovery_directory_names_only",
        "expected_directory": "logs/private-recovery (relative to installed Hub root)",
        "directory_state": state,
        "archive_count": len(archives) if state == "present" else None,
        "latest_archive_modified_utc": max(
            filter(None, (_mtime(x) for x in archives)), default=None
        ),
        "evidence_file_count": len(reports) if state == "present" else None,
        "latest_evidence_modified_utc": max(
            filter(None, (_mtime(x) for x in reports)), default=None
        ),
        "archive_integrity": "not_checked",
        "last_verified_restore": None,
        "off_machine_copy": "not_verified",
        "retention_policy": "not_configured_by_this_workbench",
        "automatic_backup_or_restore": False,
        "included_source_families": [
            "SQLite online database snapshot",
            "data/knowledge",
            "data/go2rtc",
        ],
        "excluded": [".env", "private root keys", "operating-system credentials"],
    }


@router.get("")
def backup_inventory(_owner: Owner) -> dict:
    return collect_backup_inventory(Path.cwd())
