"""QL-462: owner-only original-host acceptance ceremony and live-pilot evidence.

No user-supplied host target, device control, remote action, task mutation,
unattested installation or inferred service health.
"""

from __future__ import annotations

import json
import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_acceptance353 import (
    key_rotation_readiness353,
    verify_comms_audit_link353,
    verify_reboot_ceremony353,
)
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_transport352 import MasterDeliveryLedger352
from rosevear_ai_hub.models import User
from rosevear_ai_hub.service_identity347 import _digest

router = APIRouter(prefix="/api/v1/system/server-shell-353", tags=["server-shell353"])


def _read_protected353(value: str | None, *, max_bytes: int = 8192) -> Any:
    if not value:
        return None
    try:
        path = Path(value)
        if not path.is_file() or path.is_symlink() or not 0 < path.stat().st_size <= max_bytes:
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError, TypeError):
        return None


def _read_key353(value: str | None) -> bytes | None:
    if not value:
        return None
    try:
        path = Path(value)
        if not path.is_file() or path.is_symlink() or path.stat().st_size != 32:
            return None
        return path.read_bytes()
    except OSError:
        return None


def local_acceptance_snapshot353(*, now_ms: int, machine_name: str) -> dict[str, Any]:
    hold = {
        "schema": "rosevear.hub.owner-acceptance353.v1",
        "sourceBuild": 353,
        "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST,
        "signedOriginalHostEnrollment": False,
        "rebootCeremony": {
            "state": "HOLD_NO_VALID_INDEPENDENT_REBOOT_CORROBORATION",
            "signedSequenceVerified": False,
            "independentReviewerAssertionVerified": False,
            "automaticStartupIndependentlyProven": False,
            "continuous24HourOperationVerified": False,
            "physicalReceiverAuthorized": False,
            "bootCount": 0,
        },
        "pilot": {
            "state": "HOLD_NO_VERIFIED_MASTER_MTLS_PILOT",
            "aiDataPlatform": "UNVERIFIED",
            "commsHub": "UNVERIFIED",
            "livePeerCurrentlyConnected": False,
            "deliveryReceiptsOnly": True,
        },
        "operatorAudit": {
            "state": "HOLD_NO_VERIFIED_COMMS_SOURCE_AUDIT_LINK",
            "commsSignedAuditLinked": False,
            "humanReadIndependentlyWitnessed": False,
            "messageId": None,
        },
        "keyRotation": key_rotation_readiness353(None, now_ms),
        "receiverActivationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "incidentStatus": "OPEN",
        "webMutationAvailable": False,
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
    }
    if os.name != "nt" or machine_name.upper() != ORIGINAL_HOST or type(now_ms) is not int:
        return hold
    manifest = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    owner_key_path = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    owner_pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    enrollment = load_local_manifest349(
        Path(manifest) if manifest else None,
        Path(owner_key_path) if owner_key_path else None,
        owner_pin,
        now_ms,
        machine_name,
    )
    if not enrollment["accepted"]:
        return hold
    manifest_sha = _digest(enrollment["payload"])
    owner_key = _read_key353(owner_key_path)
    registry_file = os.environ.get("ROSEVEAR_QL461_MASTER_REGISTRY_PATH")
    registry = (
        load_master_registry352(
            path=Path(registry_file),
            owner_public=owner_key,
            owner_pin=owner_pin,
            enrollment=enrollment,
            now_ms=now_ms,
            machine_name=machine_name,
        )
        if registry_file and owner_key is not None
        else None
    )
    witness_public = _read_key353(os.environ.get("ROSEVEAR_QL461_WITNESS_PUB_PATH"))
    reviewer_public = _read_key353(os.environ.get("ROSEVEAR_QL462_REVIEWER_PUB_PATH"))
    if witness_public is not None and reviewer_public is not None:
        reboot = verify_reboot_ceremony353(
            signed_ceremony=_read_protected353(
                os.environ.get("ROSEVEAR_QL462_CEREMONY_PATH")
            ),
            before_receipt=_read_protected353(
                os.environ.get("ROSEVEAR_QL462_PREBOOT_RECEIPT_PATH")
            ),
            after_receipt=_read_protected353(
                os.environ.get("ROSEVEAR_QL461_RECEIPT_PATH")
            ),
            host_witness_public=witness_public,
            host_witness_pin=os.environ.get("ROSEVEAR_QL461_WITNESS_PUB_PIN", ""),
            independent_reviewer_public=reviewer_public,
            independent_reviewer_pin=os.environ.get("ROSEVEAR_QL462_REVIEWER_PUB_PIN", ""),
            owner_pin=owner_pin,
            manifest_digest=manifest_sha,
            now_ms=now_ms,
        )
    else:
        reboot = hold["rebootCeremony"]
    key_status = key_rotation_readiness353(registry, now_ms)
    outbox_path = os.environ.get("ROSEVEAR_QL461_OUTBOX_DB")
    status = (
        MasterDeliveryLedger352(Path(outbox_path)).status(
            manifest_sha=manifest_sha,
            now_ms=now_ms,
            registry=registry,
        )
        if outbox_path else {"stage": "HOLD", "latest": []}
    )
    pilots = [
        x for x in status["latest"]
        if x["eventType"] == "master.health"
        and x["stage"] in ("TRANSPORT_ACKED", "OPERATOR_ACKED")
    ]
    data_status = "SIGNED_PEER_ACK_STORED" if any(
        x["audience"] == "ai-data-platform" for x in pilots
    ) else "UNVERIFIED"
    comms_status = "SIGNED_PEER_ACK_STORED" if any(
        x["audience"] == "rosevear-comms-hub" for x in pilots
    ) else "UNVERIFIED"
    pilot = {
        **hold["pilot"],
        "state": (
            "BOTH_PEER_SIGNED_ACKS_STORED_NOT_LIVE_CONNECTED"
            if data_status != "UNVERIFIED" and comms_status != "UNVERIFIED"
            else "PARTIAL_PILOT_SIGNED_ACKS_STORED"
            if pilots else hold["pilot"]["state"]
        ),
        "aiDataPlatform": data_status,
        "commsHub": comms_status,
    }
    signed_package = _read_protected353(
        os.environ.get("ROSEVEAR_QL462_COMMS_AUDIT_PACKAGE_PATH"),
        max_bytes=16_384,
    )
    allowed_owner = os.environ.get("ROSEVEAR_QL462_OWNER_AUDIT_ID")
    audit = hold["operatorAudit"]
    if (
        registry is not None
        and type(signed_package) is dict
        and set(signed_package) == {"event", "operatorAck", "signedAudit"}
        and type(allowed_owner) is str
        and 12 <= len(allowed_owner) <= 128
        and all(ch.isalnum() or ch in "-_" for ch in allowed_owner)
    ):
        candidate = verify_comms_audit_link353(
            event_payload=signed_package["event"],
            operator_ack=signed_package["operatorAck"],
            signed_audit=signed_package["signedAudit"],
            registry=registry,
            now_ms=now_ms,
            permitted_owner_audit_ids=frozenset((allowed_owner,)),
        )
        if candidate["commsSignedAuditLinked"] and any(
            x["messageId"] == candidate["messageId"]
            and x["stage"] == "OPERATOR_ACKED"
            for x in status["latest"]
        ):
            audit = candidate
    return {
        **hold,
        "signedOriginalHostEnrollment": True,
        "rebootCeremony": reboot,
        "pilot": pilot,
        "operatorAudit": audit,
        "keyRotation": key_status,
    }


@router.get("")
def get_server_shell353(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_acceptance_snapshot353(
        now_ms=int(time.time() * 1000),
        machine_name=platform.node(),
    )
