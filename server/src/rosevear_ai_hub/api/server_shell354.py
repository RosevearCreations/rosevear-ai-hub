"""QL-463: read-only owner evidence of enrolled boot, peer sinks and rotation.

This endpoint never performs network probes, imports audit records, signs keys,
starts/stops services or authorizes a receiver.
"""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import (
    _read_key353,
    _read_protected353,
    local_acceptance_snapshot353,
)
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_acceptance354 import (
    acceptance_summary354,
    crosscheck_peer_outbox354,
    verify_certificate_rotation_plan354,
    verify_enrolled_reboot354,
    verify_witness_enrollment354,
)
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_source_audit354 import MasterSourceAuditLedger354
from rosevear_ai_hub.master_transport352 import MasterDeliveryLedger352
from rosevear_ai_hub.models import User
from rosevear_ai_hub.service_identity347 import _digest

router = APIRouter(prefix="/api/v1/system/server-shell-354", tags=["server-shell354"])


def _hold354(now_ms: int) -> dict[str, Any]:
    witness = verify_witness_enrollment354(
        signed_enrollment=None,
        owner_public=b"",
        owner_pin="",
        witness_public=b"",
        reviewer_public=b"",
        manifest_digest="",
        now_ms=now_ms,
        machine_name="",
    )
    reboot = verify_enrolled_reboot354(
        enrollment_result=witness,
        ceremony_result={},
    )
    audit = {
        "state": "HOLD_NO_VERIFIED_DURABLE_SOURCE_AUDIT",
        "integrity": "HOLD",
        "corroboratedCount": 0,
        "independentHumanReadVerified": False,
        "latestMessageId": None,
    }
    return acceptance_summary354(
        witness=witness,
        reboot=reboot,
        sink_results=[],
        rotation={
            "state": "HOLD_NO_OWNER_SIGNED_CERTIFICATE_ROTATION_PLAN",
            "ownerSignedPlanVerified": False,
            "candidateTlsHandshakeVerified": False,
            "certificateActivated": False,
            "automaticKeyRotationAuthorized": False,
            "physicalReceiverAuthorized": False,
        },
        audit=audit,
    )


def local_acceptance_snapshot354(*, now_ms: int, machine_name: str) -> dict[str, Any]:
    hold = _hold354(now_ms)
    if os.name != "nt" or machine_name.upper() != ORIGINAL_HOST:
        return hold
    manifest_path = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    owner_path = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    owner_pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    if not (manifest_path and owner_path and owner_pin):
        return hold
    enrollment = load_local_manifest349(
        Path(manifest_path),
        Path(owner_path),
        owner_pin,
        now_ms,
        machine_name,
    )
    if enrollment.get("accepted") is not True:
        return hold
    manifest_sha = _digest(enrollment["payload"])
    owner = _read_key353(owner_path)
    witness_key = _read_key353(os.environ.get("ROSEVEAR_QL461_WITNESS_PUB_PATH"))
    reviewer_key = _read_key353(os.environ.get("ROSEVEAR_QL462_REVIEWER_PUB_PATH"))
    if owner is None or witness_key is None or reviewer_key is None:
        return hold
    witness = verify_witness_enrollment354(
        signed_enrollment=_read_protected353(os.environ.get("ROSEVEAR_QL463_WITNESS_ENROLL_PATH")),
        owner_public=owner,
        owner_pin=owner_pin,
        witness_public=witness_key,
        reviewer_public=reviewer_key,
        manifest_digest=manifest_sha,
        now_ms=now_ms,
        machine_name=machine_name,
    )
    older = local_acceptance_snapshot353(
        now_ms=now_ms,
        machine_name=machine_name,
    )
    reboot = verify_enrolled_reboot354(
        enrollment_result=witness,
        ceremony_result=older["rebootCeremony"],
    )
    registry_path = os.environ.get("ROSEVEAR_QL461_MASTER_REGISTRY_PATH")
    registry = (
        load_master_registry352(
            path=Path(registry_path),
            owner_public=owner,
            owner_pin=owner_pin,
            enrollment=enrollment,
            now_ms=now_ms,
            machine_name=machine_name,
        )
        if registry_path
        else None
    )
    outbox_path = os.environ.get("ROSEVEAR_QL461_OUTBOX_DB")
    sinks = []
    if registry is not None and outbox_path and witness["ownerPinnedEnrollmentVerified"] is True:
        for app_id, variable in (
            ("ai-data-platform", "ROSEVEAR_QL463_AIDP_SINK_PACKAGE_PATH"),
            ("rosevear-comms-hub", "ROSEVEAR_QL463_COMMS_SINK_PACKAGE_PATH"),
        ):
            matches = [x for x in enrollment["payload"]["peers"] if x["id"] == app_id]
            package = _read_protected353(
                os.environ.get(variable),
                max_bytes=16_384,
            )
            if len(matches) == 1 and crosscheck_peer_outbox354(
                outbox_path=Path(outbox_path),
                package=package,
                manifest_digest=manifest_sha,
                peer=matches[0],
                registry=registry,
                now_ms=now_ms,
            ):
                sinks.append(
                    {
                        "peer": app_id,
                        "signedPeerSinkReceiptVerified": True,
                    }
                )
    rotation = hold["certificateRotation"]
    rotation_package = _read_protected353(
        os.environ.get("ROSEVEAR_QL463_CERT_PLAN_PATH"),
    )
    if (
        type(rotation_package) is dict
        and type(rotation_package.get("payload")) is dict
        and registry is not None
    ):
        peer_id = rotation_package["payload"].get("peer")
        matching_peers = [x for x in enrollment["payload"]["peers"] if x["id"] == peer_id]
        if len(matching_peers) == 1:
            rotation = verify_certificate_rotation_plan354(
                signed_plan=rotation_package,
                owner_public=owner,
                owner_pin=owner_pin,
                manifest_digest=manifest_sha,
                peer=matching_peers[0],
                now_ms=now_ms,
            )
            # A signed plan is not proof of a live TLS connection or activation.
            rotation.pop("candidateTlsLeafPin", None)
    audit = hold["commsAudit"]
    audit_db = os.environ.get("ROSEVEAR_QL463_SOURCE_AUDIT_DB")
    if registry is not None and outbox_path and audit_db:
        audit = MasterSourceAuditLedger354(Path(audit_db)).summary(
            manifest_sha=manifest_sha,
            registry=registry,
            outbox=MasterDeliveryLedger352(Path(outbox_path)),
            now_ms=now_ms,
        )
    return acceptance_summary354(
        witness=witness,
        reboot=reboot,
        sink_results=sinks,
        rotation=rotation,
        audit=audit,
    )


@router.get("")
def get_server_shell354(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_acceptance_snapshot354(
        now_ms=int(time.time() * 1000),
        machine_name=platform.node(),
    )
