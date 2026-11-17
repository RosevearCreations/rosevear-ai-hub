"""QL-460: owner-only local evidence and authenticated Home Assistant status.

Never claims installed watchdog, independent reboot acceptance, or physical OFF.
No browser service controls, event uploads, alarm acknowledgments, or actuators.
"""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.master_bus351 import BootWitness351, MasterEventBus351
from rosevear_ai_hub.master_runtime350 import installed_shell_snapshot350
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.models import User
from rosevear_ai_hub.service_identity347 import _digest

router = APIRouter(prefix="/api/v1/system/server-shell-351", tags=["server-shell351"])


def _read_local_evidence351(*, now_ms: int, host: str) -> dict[str, Any]:
    hold = {
        "boot": {
            "observation": "HOLD_NO_FRESH_ORIGINAL_HOST_BOOT_WITNESS",
            "distinctBoots": 0,
            "rebootPersistenceVerified": False,
            "taskAutostartVerified": False,
            "supervisorInstalledVerified": False,
        },
        "bus": {"integrity": "HOLD", "events": [], "issues": []},
    }
    if os.name != "nt" or host.upper() != ORIGINAL_HOST:
        return hold
    manifest = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    key = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    signed = load_local_manifest349(
        Path(manifest) if manifest else None,
        Path(key) if key else None,
        pin,
        now_ms,
        host,
    )
    if not signed["accepted"]:
        return hold
    digest = _digest(signed["payload"])
    event_path = os.environ.get("ROSEVEAR_QL460_EVENT_DB")
    boot_path = os.environ.get("ROSEVEAR_QL460_BOOT_DB")
    return {
        "boot": (
            BootWitness351(Path(boot_path)).summary(manifest_sha=digest, now_ms=now_ms)
            if boot_path
            else hold["boot"]
        ),
        "bus": (
            MasterEventBus351(Path(event_path)).recent(manifest_sha=digest, now_ms=now_ms)
            if event_path
            else hold["bus"]
        ),
    }


def _home_url_allowed351(value: str | None) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" or (
        parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")
    )


async def home_readonly_status351(
    runtime: HomeAssistantRuntime,
    *,
    original_host_verified: bool,
) -> dict[str, Any]:
    """Live authenticated GET /api only, no devices or safety control actions."""
    hold = {
        "state": "UNVERIFIED",
        "proof": "NO_AUTHENTICATED_READONLY_API_RESPONSE",
        "checkedAtMs": None,
        "physicalDeviceControlAuthorized": False,
        "entityInventoryExposed": False,
    }
    if not (
        original_host_verified
        and runtime.client is not None
        and _home_url_allowed351(runtime.base_url)
    ):
        return hold
    try:
        reply = await runtime.client.health()
    except (HomeAssistantError, OSError, ValueError, TimeoutError):
        return {**hold, "state": "UNAVAILABLE"}
    if not isinstance(reply, str) or not reply.strip():
        return hold
    return {
        **hold,
        "state": "AVAILABLE",
        "proof": "AUTHENTICATED_READONLY_HOME_ASSISTANT_API_RESPONSE",
        "checkedAtMs": int(time.time() * 1000),
    }


@router.get("")
async def get_server_shell351(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
    runtime: Annotated[HomeAssistantRuntime, Depends(get_home_assistant_runtime)],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    host = platform.node()
    now_ms = int(time.time() * 1000)
    existing = installed_shell_snapshot350()
    evidence = _read_local_evidence351(now_ms=now_ms, host=host)
    desired_states = {item["id"]: item["desiredEnabled"] for item in existing["modules"]}
    actionable_issues = [
        item
        for item in evidence["bus"]["issues"]
        if not (
            item["source"] in desired_states
            and desired_states[item["source"]] is False
            and item["state"] == "STOPPED"
        )
    ]
    home = await home_readonly_status351(
        runtime,
        original_host_verified=(
            existing["signedManifestVerified"] is True and existing["originalHostVerified"] is True
        ),
    )
    return {
        "schema": "rosevear.hub.unified-operator-readiness351.v1",
        "sourceBuild": 351,
        "serverShell": "ai-data-platform",
        "modules": existing["modules"],
        "applications": existing["applications"],
        "bootWitness": evidence["boot"],
        "eventBus": evidence["bus"],
        "homeAutomation": home,
        "issues": actionable_issues,
        "issueAlertDeliveryVerified": False,
        "installationVerified": False,
        "rebootAcceptanceVerified": False,
        "physicalReceiverCurrentlyOff": False,
        "receiverActivationAuthorized": False,
        "incidentStatus": "OPEN",
        "webMutationAvailable": False,
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
    }
