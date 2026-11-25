"""Build 389: exact staged package identity captured once on process import."""

import json
import os
import re
from pathlib import Path

from rosevear_ai_hub import __version__


def read_marker389(path: Path) -> str | None:
    try:
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 1024:
            return None
        value = json.loads(path.read_text(encoding="utf-8"))
        if (
            isinstance(value, dict)
            and set(value) == {"sha", "version"}
            and value["version"] == __version__
            and isinstance(value["sha"], str)
            and re.fullmatch(r"[a-f0-9]{40}", value["sha"])
        ):
            return value["sha"]
    except (OSError, ValueError):
        pass
    return None


# Deliberately never reread from a changed checkout during a running process.
LOADED_SHA389 = read_marker389(Path(__file__).with_name("_release_identity389.json"))


def loaded_identity389() -> dict[str, object]:
    return {
        "schema": "rosevear.hub.runtime-identity389.v1",
        "sha": LOADED_SHA389,
        "version": __version__,
        "pid": os.getpid(),
        "scope": "loaded_package_marker_not_external_attestation",
    }
