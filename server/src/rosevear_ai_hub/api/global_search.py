"""Build 222: bounded owner-only search over local, already-persisted records."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    Camera,
    DeviceRegistryAnnotation,
    MaintenanceAction,
    User,
    WorkshopEquipment,
)

router = APIRouter(prefix="/api/v1/global-search", tags=["global-search"])
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]


def _matching(text: str, query: str) -> bool:
    return query.casefold() in text.casefold()


@router.get("")
def global_search(
    _owner: Owner,
    db: DB,
    q: Annotated[str, Query(min_length=2, max_length=100)],
) -> dict:
    """No network discovery, credentials, streams, device operations or telemetry."""
    needle = q.strip()
    if len(needle) < 2:
        return {"query": needle, "results": [], "scope": "owner_local_saved_records"}
    results: list[dict[str, str]] = []

    def add(kind: str, title: str, detail: str, section: str, source: str) -> None:
        if len(results) < 60 and _matching(f"{title} {detail}", needle):
            results.append(
                {
                    "kind": kind,
                    "title": title,
                    "detail": detail,
                    "section": section,
                    "source": source,
                }
            )

    for item in db.scalars(
        select(DeviceRegistryAnnotation).order_by(DeviceRegistryAnnotation.id).limit(250)
    ):
        # Source identifiers may encode sensitive device addresses; omit them from output.
        add(
            "device",
            item.alias or "Reviewed device",
            item.room_label or "Room not assigned",
            "Devices",
            "Saved Hub device annotation",
        )
    for item in db.scalars(select(Camera).order_by(Camera.id).limit(250)):
        # No host, URI, credentials, stream references or UUID in search results.
        add(
            "camera",
            item.display_name,
            "Local camera inventory record",
            "Cameras",
            "Saved Hub camera registry",
        )
    for item in db.scalars(select(WorkshopEquipment).order_by(WorkshopEquipment.id).limit(250)):
        add("equipment", item.name, item.equipment_type, "Workshop", "Saved Hub equipment registry")
    for item in db.scalars(select(MaintenanceAction).order_by(MaintenanceAction.id).limit(250)):
        add(
            "maintenance",
            item.title,
            item.status,
            "Workshop" if item.source_kind.startswith("workshop") else "System",
            "Saved Hub maintenance action",
        )
    return {"query": needle, "results": results, "scope": "owner_local_saved_records"}
