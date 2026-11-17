"""QL-461: owner-only signed witness, Master delivery and operator ACK status.

Read-only GET. Never install tasks, start services, publish events, run commands,
or infer receiver OFF from missing telemetry.
"""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_transport352 import MasterDeliveryLedger352
from rosevear_ai_hub.models import User
from rosevear_ai_hub.original_host_witness352 import local_signed_witness_status352
from rosevear_ai_hub.service_identity347 import _digest

router = APIRouter(prefix="/api/v1/system/server-shell-352", tags=["server-shell352"])


def local_master_custody_status352(*, now_ms: int, machine_name: str) -> dict[str, Any]:
    hold = {
        "schema": "rosevear.hub.master-custody-status352.v1",
        "sourceBuild": 352,
        "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST,
        "signedOriginalHostEnrollment": False,
        "installationWitness": {
            "verified": False,
            "status": "HOLD_NO_FRESH_INDEPENDENTLY_PINNED_HOST_RECEIPT",
            "bootMs": None, "taskState": "UNVERIFIED",
            "taskAutostartProven": False,
            "independentThirdPartyWitness": False,
            "receiverActivationAuthorized": False,
        },
        "masterTransport": {
            "stage": "HOLD", "queued": 0, "transportAcked": 0,
            "operatorAcked": 0, "latest": [],
            "operatorAckMeansHumanVerified": False,
        },
        "liveMasterPeerHealthVerified": False,
        "endToEndOperatorDeliveryVerified": False,
        "physicalReceiverCurrentlyOff": False,
        "receiverActivationAuthorized": False,
        "originalIncidentStatus": "OPEN",
        "webMutationAvailable": False,
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
    }
    if (
        os.name != "nt" or machine_name.upper() != ORIGINAL_HOST
        or type(now_ms) is not int
    ):
        return hold
    config = {
        k: os.environ.get(k) for k in (
            "ROSEVEAR_QL458_MANIFEST_PATH", "ROSEVEAR_QL458_OWNER_KEY_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PIN", "ROSEVEAR_QL461_MASTER_REGISTRY_PATH",
            "ROSEVEAR_QL461_OUTBOX_DB",
        )
    }
    enrollment = load_local_manifest349(
        Path(config["ROSEVEAR_QL458_MANIFEST_PATH"])
        if config["ROSEVEAR_QL458_MANIFEST_PATH"] else None,
        Path(config["ROSEVEAR_QL458_OWNER_KEY_PATH"])
        if config["ROSEVEAR_QL458_OWNER_KEY_PATH"] else None,
        config["ROSEVEAR_QL458_OWNER_KEY_PIN"], now_ms, machine_name,
    )
    if not enrollment["accepted"]:
        return hold
    witness = local_signed_witness_status352(enrollment=enrollment, now_ms=now_ms)
    registry = None
    if (
        config["ROSEVEAR_QL461_MASTER_REGISTRY_PATH"]
        and config["ROSEVEAR_QL458_OWNER_KEY_PATH"]
        and config["ROSEVEAR_QL458_OWNER_KEY_PIN"]
    ):
        try:
            key_path = Path(config["ROSEVEAR_QL458_OWNER_KEY_PATH"])
            if key_path.is_file() and not key_path.is_symlink():
                key = key_path.read_bytes()
                registry = load_master_registry352(
                    path=Path(config["ROSEVEAR_QL461_MASTER_REGISTRY_PATH"]),
                    owner_public=key, owner_pin=config["ROSEVEAR_QL458_OWNER_KEY_PIN"],
                    enrollment=enrollment, now_ms=now_ms,
                    machine_name=machine_name,
                )
        except OSError:
            registry = None
    ledger_path = config["ROSEVEAR_QL461_OUTBOX_DB"]
    outbox = (
        MasterDeliveryLedger352(Path(ledger_path)).status(
            manifest_sha=_digest(enrollment["payload"]),
            now_ms=now_ms, registry=registry,
        )
        if ledger_path else hold["masterTransport"]
    )
    return {
        **hold,
        "signedOriginalHostEnrollment": True,
        "installationWitness": witness,
        "masterTransport": outbox,
        "endToEndOperatorDeliveryVerified": False,
    }


@router.get("")
def get_server_shell352(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_master_custody_status352(
        now_ms=int(time.time() * 1000), machine_name=platform.node(),
    )
