"""Build 371: compare already-verified workshop receipts, without probing hardware.

A signed Windows PnP registry report is evidence of Windows enumeration, not
physical identity, active print progress, camera pixels, or host enrollment.
"""

from __future__ import annotations

import json
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User, WorkshopGatewayReceipt370

router = APIRouter(prefix="/api/v1/workshop-enrollment-371", tags=["workshop-enrollment"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
USB_KINDS = {"usb_interface", "camera_interface"}


def reconcile371(db: Session, now_ms: int) -> dict[str, object]:
    records = list(
        db.scalars(
            select(WorkshopGatewayReceipt370).order_by(WorkshopGatewayReceipt370.id.desc()).limit(2)
        ).all()
    )
    if not records:
        return {
            "state": "HOLD_NO_SIGNED_RECEIPT",
            "collectorId": None,
            "sourceFresh": False,
            "lastObservedAtMs": None,
            "receivedCount": 0,
            "devices": [],
            "gates": {
                "signedReceipt": False,
                "repeatReceipt": False,
                "usbRegistryObserved": False,
                "physicalDeviceConfirmed": False,
                "cameraFeedVerified": False,
                "remoteMasterAck": False,
            },
        }
    current = records[0]
    previous = None
    if len(records) > 1 and records[1].collector_id == current.collector_id:
        previous = records[1]
    current_payload = json.loads(current.payload_json)
    earlier_payload = json.loads(previous.payload_json) if previous else {"devices": []}
    current_items = {
        (item["kind"], item["device_id"]): item
        for item in current_payload["devices"]
        if item["kind"] in USB_KINDS
    }
    earlier_items = {
        (item["kind"], item["device_id"]): item
        for item in earlier_payload["devices"]
        if item["kind"] in USB_KINDS
    }
    fresh = (
        now_ms >= current.observed_at_ms
        and now_ms - current.observed_at_ms <= 300_000
        and now_ms <= current.expires_at_ms
    )
    rows: list[dict[str, object]] = []
    for key in sorted(set(current_items) | set(earlier_items)):
        latest = current_items.get(key)
        older = earlier_items.get(key)
        if not fresh:
            transition = "unverified_stale"
        elif latest is None:
            transition = "absent_from_latest_registry"
        elif older is None:
            transition = "first_observed"
        elif latest.get("port_name") != older.get("port_name"):
            transition = "com_port_changed"
        else:
            transition = "observed_in_both"
        entry = latest or older
        assert entry is not None
        rows.append(
            {
                "kind": entry["kind"],
                "deviceId": entry["device_id"],
                "label": entry["label"],
                "currentPort": latest.get("port_name") if latest else None,
                "previousPort": older.get("port_name") if older else None,
                "transition": transition,
                "evidence": "windows_pnp_registry",
                "physicallyVerified": False,
            }
        )
    if not fresh:
        state = "HOLD_STALE_SOURCE"
    elif previous is None:
        state = "HOLD_NEEDS_SECOND_RECEIPT"
    elif not current_items:
        state = "HOLD_NO_USB_PNP_OBSERVATION"
    else:
        state = "SOURCE_REGISTRY_RECONCILED"
    return {
        "state": state,
        "collectorId": current.collector_id,
        "sourceFresh": fresh,
        "lastObservedAtMs": current.observed_at_ms,
        "receivedCount": len(records),
        "devices": rows,
        "gates": {
            "signedReceipt": True,
            "repeatReceipt": previous is not None,
            "usbRegistryObserved": bool(current_items),
            "physicalDeviceConfirmed": False,
            "cameraFeedVerified": False,
            "remoteMasterAck": False,
        },
    }


@router.get("/reconciliation")
def get_reconciliation371(_owner: Owner, db: DB, response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store"
    return reconcile371(db, int(time.time() * 1000))
