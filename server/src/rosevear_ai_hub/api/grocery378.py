"""Build 378: private family grocery, pantry and pickup planning.

No third-party retailer calls, purchases, payment API, product scraping, or
automatic notifications. Only exact household-account role decisions matter.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import GroceryEvent378, GroceryItem378, User

router = APIRouter(prefix="/api/v1/groceries-378", tags=["household-grocery"])
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
Editor = Annotated[User, Depends(require_roles("owner", "administrator", "household_user"))]
Approver = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]
Unit = Literal["each", "pack", "kg", "g", "L", "mL"]
MAX_ITEMS = 300
MAX_EVENTS = 10000


def _clean_text(value: str, max_len: int) -> str:
    cleaned = " ".join(value.strip().split())
    if not cleaned or len(cleaned) > max_len or any(ord(char) < 32 for char in value):
        raise ValueError("Use a short nonempty printable value.")
    return cleaned


def _date_value(value: date | None) -> datetime | None:
    return datetime.combine(value, time.min, tzinfo=UTC) if value is not None else None


def _date_text(value: datetime | None) -> str | None:
    return value.date().isoformat() if value is not None else None


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


class ItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    unit: Unit = "each"
    wanted_qty: float = Field(default=1, ge=0, le=10000, allow_inf_nan=False)
    on_hand_qty: float = Field(default=0, ge=0, le=10000, allow_inf_nan=False)
    min_on_hand_qty: float = Field(default=0, ge=0, le=10000, allow_inf_nan=False)
    recurrence_days: int | None = Field(default=None, ge=1, le=365)
    expires_on: date | None = None
    pickup_on: date | None = None
    price_note: str = Field(default="", max_length=100)
    note: str = Field(default="", max_length=250)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean_text(value, 120)

    @field_validator("price_note", "note")
    @classmethod
    def clean_optional(cls, value: str) -> str:
        return _clean_text(value, 250) if value.strip() else ""


class ItemPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    unit: Unit | None = None
    wanted_qty: float | None = Field(default=None, ge=0, le=10000, allow_inf_nan=False)
    on_hand_qty: float | None = Field(default=None, ge=0, le=10000, allow_inf_nan=False)
    min_on_hand_qty: float | None = Field(default=None, ge=0, le=10000, allow_inf_nan=False)
    recurrence_days: int | None = Field(default=None, ge=1, le=365)
    expires_on: date | None = None
    pickup_on: date | None = None
    price_note: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=250)

    @field_validator("name")
    @classmethod
    def clean_patch_name(cls, value: str | None) -> str | None:
        return _clean_text(value, 120) if value is not None else None

    @field_validator("price_note", "note")
    @classmethod
    def clean_patch_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if any(ord(char) < 32 for char in value):
            raise ValueError("Notes must contain printable text only.")
        return " ".join(value.strip().split())

    @model_validator(mode="after")
    def check_fields(self) -> ItemPatch:
        changes = self.model_fields_set - {"expected_revision"}
        if not changes:
            raise ValueError("At least one field must change.")
        if any(
            getattr(self, key) is None
            for key in changes
            if key not in {"expires_on", "pickup_on", "recurrence_days"}
        ):
            raise ValueError("Required fields cannot be cleared.")
        return self


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    owner_confirmed: bool = False


class Receipt(Decision):
    received_qty: float = Field(gt=0, le=10000, allow_inf_nan=False)


class Merge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    target_id: int = Field(gt=0)
    duplicate_id: int = Field(gt=0)
    target_revision: int = Field(ge=1)
    duplicate_revision: int = Field(ge=1)
    owner_confirmed: bool = False

    @model_validator(mode="after")
    def distinct(self) -> Merge:
        if self.target_id == self.duplicate_id:
            raise ValueError("Select two different records.")
        return self


def _item(db: Session, id_: int, active: bool = True) -> GroceryItem378:
    item = db.get(GroceryItem378, id_)
    if item is None or (active and item.state == "archived"):
        raise HTTPException(status_code=404, detail="Active grocery item not found.")
    return item


def _match_revision(item: GroceryItem378, revision: int) -> None:
    if item.revision != revision:
        raise HTTPException(status_code=409, detail="Item changed. Refresh before saving.")


def _emit(
    db: Session,
    item: GroceryItem378,
    actor: User,
    action: str,
    related: int | None = None,
) -> None:
    db.add(
        GroceryEvent378(
            item_id=item.id,
            actor_user_id=actor.id,
            action=action,
            item_revision=item.revision,
            related_item_id=related,
            recorded_at=datetime.now(UTC),
        )
    )
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="grocery378." + action,
        object_type="household_grocery_item",
        object_id=str(item.id),
        action=action,
        arguments={"revision": item.revision, "related_item_id": related},
        result={
            "retailer_calls": 0,
            "orders": 0,
            "payments": 0,
            "messages_sent": 0,
        },
    )


def _public(item: GroceryItem378, today: date) -> dict:
    expires = _date_text(item.expires_on)
    last = item.last_picked_up_on.date() if item.last_picked_up_on else None
    recurrence_due = bool(
        item.recurrence_days and last and today >= last + timedelta(days=item.recurrence_days)
    )
    low_stock = item.on_hand_qty < item.min_on_hand_qty
    expiring = bool(
        expires
        and item.on_hand_qty > 0
        and date.fromisoformat(expires) <= today + timedelta(days=7)
    )
    return {
        "id": item.id,
        "name": item.name,
        "unit": item.unit,
        "wantedQty": item.wanted_qty,
        "onHandQty": item.on_hand_qty,
        "minOnHandQty": item.min_on_hand_qty,
        "recurrenceDays": item.recurrence_days,
        "lastPickedUpOn": _date_text(item.last_picked_up_on),
        "expiresOn": expires,
        "pickupOn": _date_text(item.pickup_on),
        "priceNote": item.price_note,
        "note": item.note,
        "state": item.state,
        "revision": item.revision,
        "approvedAt": _utc(item.approved_at).isoformat() if item.approved_at else None,
        "approvedByUserId": item.approved_by_user_id,
        "lowStock": low_stock,
        "expiresSoon": expiring,
        "recurrenceDue": recurrence_due,
        "pickupReady": item.state == "approved" and item.wanted_qty > 0,
        "manualInventoryOnly": True,
    }


@router.get("/board")
def board(actor: Viewer, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    items = db.scalars(
        select(GroceryItem378).order_by(GroceryItem378.id).limit(MAX_ITEMS + 1)
    ).all()
    truncated = len(items) > MAX_ITEMS
    active = [item for item in items[:MAX_ITEMS] if item.state != "archived"]
    today = datetime.now(UTC).date()
    normalized = [_public(item, today) for item in active]
    matches: dict[tuple[str, str], list[int]] = {}
    for item in active:
        matches.setdefault((item.canonical_name, item.unit), []).append(item.id)
    duplicate_groups = [ids for ids in matches.values() if len(ids) > 1]
    events = db.scalars(select(GroceryEvent378).order_by(GroceryEvent378.id.desc()).limit(60)).all()
    return {
        "schema": "rosevear.hub.grocery.v378",
        "source": "PRIVATE_LOCAL_HOUSEHOLD_ONLY",
        "role": actor.role,
        "items": normalized,
        "duplicateGroups": duplicate_groups,
        "history": [
            {
                "id": event.id,
                "itemId": event.item_id,
                "action": event.action,
                "revision": event.item_revision,
                "relatedItemId": event.related_item_id,
                "actorUserId": event.actor_user_id,
                "recordedAt": _utc(event.recorded_at).isoformat(),
            }
            for event in events
        ],
        "summary": {
            "active": len(active),
            "lowStock": sum(x["lowStock"] for x in normalized),
            "expiring": sum(x["expiresSoon"] for x in normalized),
            "recurringDue": sum(x["recurrenceDue"] for x in normalized),
            "approvedPickupLines": sum(x["pickupReady"] for x in normalized),
        },
        "truncated": truncated,
        "retailerConnected": False,
        "orderingEnabled": False,
        "paymentsEnabled": False,
        "externalMessagesEnabled": False,
        "householdApprovalRequired": True,
    }


@router.post("/items", status_code=201)
def create_item(payload: ItemCreate, actor: Editor, db: DB) -> dict:
    count = len(db.scalars(select(GroceryItem378.id).limit(MAX_ITEMS)).all())
    if count >= MAX_ITEMS:
        raise HTTPException(status_code=409, detail="Grocery capacity reached.")
    today = datetime.now(UTC)
    item = GroceryItem378(
        name=payload.name,
        canonical_name=payload.name.casefold(),
        unit=payload.unit,
        wanted_qty=round(payload.wanted_qty, 2),
        on_hand_qty=round(payload.on_hand_qty, 2),
        min_on_hand_qty=round(payload.min_on_hand_qty, 2),
        recurrence_days=payload.recurrence_days,
        expires_on=_date_value(payload.expires_on),
        pickup_on=_date_value(payload.pickup_on),
        price_note=payload.price_note.strip(),
        note=payload.note.strip(),
        state="draft",
        revision=1,
        created_by_user_id=actor.id,
        updated_by_user_id=actor.id,
        created_at=today,
        updated_at=today,
    )
    db.add(item)
    db.flush()
    _emit(db, item, actor, "created")
    db.commit()
    return _public(item, today.date())


@router.patch("/items/{item_id}")
def patch_item(
    payload: ItemPatch,
    actor: Editor,
    db: DB,
    item_id: int = Path(gt=0),
) -> dict:
    item = _item(db, item_id)
    _match_revision(item, payload.expected_revision)
    changes = payload.model_dump(exclude_unset=True, exclude={"expected_revision"})
    for field in ("name", "price_note", "note"):
        if field in changes:
            changes[field] = (
                _clean_text(changes[field], 120 if field == "name" else 250)
                if changes[field].strip()
                else ""
            )
    if not changes.get("name", item.name):
        raise HTTPException(status_code=422, detail="Name cannot be empty.")
    for field in ("expires_on", "pickup_on"):
        if field in changes:
            changes[field] = _date_value(changes[field])
    for field in ("wanted_qty", "on_hand_qty", "min_on_hand_qty"):
        if field in changes:
            changes[field] = round(changes[field], 2)
    for key, value in changes.items():
        setattr(item, key, value)
    if "name" in changes:
        item.canonical_name = item.name.casefold()
    item.state = "draft"
    item.approved_by_user_id = None
    item.approved_at = None
    item.revision += 1
    item.updated_by_user_id = actor.id
    item.updated_at = datetime.now(UTC)
    _emit(db, item, actor, "edited")
    db.commit()
    return _public(item, datetime.now(UTC).date())


@router.post("/items/{item_id}/approve")
def approve_item(
    payload: Decision,
    actor: Approver,
    db: DB,
    item_id: int = Path(gt=0),
) -> dict:
    item = _item(db, item_id)
    _match_revision(item, payload.expected_revision)
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Exact owner approval required.")
    if item.state != "draft" or item.wanted_qty <= 0:
        raise HTTPException(status_code=409, detail="Only draft pickup quantities can be approved.")
    item.state = "approved"
    item.approved_by_user_id = actor.id
    item.approved_at = datetime.now(UTC)
    item.updated_by_user_id = actor.id
    item.updated_at = datetime.now(UTC)
    item.revision += 1
    _emit(db, item, actor, "approved_for_pickup_only")
    db.commit()
    return _public(item, datetime.now(UTC).date())


@router.post("/items/{item_id}/receive")
def receive_item(
    payload: Receipt,
    actor: Editor,
    db: DB,
    item_id: int = Path(gt=0),
) -> dict:
    item = _item(db, item_id)
    _match_revision(item, payload.expected_revision)
    if not payload.owner_confirmed or item.state != "approved":
        raise HTTPException(status_code=409, detail="Approved, confirmed pickup required.")
    amount = round(payload.received_qty, 2)
    if amount <= 0 or amount > item.wanted_qty or amount + item.on_hand_qty > 10000:
        raise HTTPException(
            status_code=409, detail="Receipt exceeds approved quantity or storage limit."
        )
    item.on_hand_qty = round(item.on_hand_qty + amount, 2)
    item.wanted_qty = round(item.wanted_qty - amount, 2)
    item.state = "picked_up" if item.wanted_qty == 0 else "draft"
    item.last_picked_up_on = datetime.now(UTC)
    item.approved_by_user_id = None
    item.approved_at = None
    item.revision += 1
    item.updated_by_user_id = actor.id
    item.updated_at = datetime.now(UTC)
    _emit(db, item, actor, "received_manual" if item.state == "picked_up" else "partial_receipt")
    db.commit()
    return _public(item, datetime.now(UTC).date())


@router.post("/items/{item_id}/archive")
def archive_item(
    payload: Decision,
    actor: Approver,
    db: DB,
    item_id: int = Path(gt=0),
) -> dict:
    item = _item(db, item_id)
    _match_revision(item, payload.expected_revision)
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Explicit archive confirmation required.")
    item.state = "archived"
    item.approved_by_user_id = None
    item.approved_at = None
    item.revision += 1
    item.updated_by_user_id = actor.id
    item.updated_at = datetime.now(UTC)
    _emit(db, item, actor, "archived")
    db.commit()
    return {"state": "ARCHIVED", "itemId": item.id, "removedFromActiveBoard": True}


@router.post("/merge")
def merge_items(payload: Merge, actor: Approver, db: DB) -> dict:
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Exact duplicate-merge approval required.")
    target = _item(db, payload.target_id)
    duplicate = _item(db, payload.duplicate_id)
    _match_revision(target, payload.target_revision)
    _match_revision(duplicate, payload.duplicate_revision)
    if (target.canonical_name, target.unit) != (duplicate.canonical_name, duplicate.unit):
        raise HTTPException(
            status_code=409, detail="Merge requires exact normalized name and unit."
        )
    if (
        target.wanted_qty + duplicate.wanted_qty > 10000
        or target.on_hand_qty + duplicate.on_hand_qty > 10000
    ):
        raise HTTPException(status_code=409, detail="Merge exceeds quantity limits.")
    target.wanted_qty = round(target.wanted_qty + duplicate.wanted_qty, 2)
    target.on_hand_qty = round(target.on_hand_qty + duplicate.on_hand_qty, 2)
    target.min_on_hand_qty = max(target.min_on_hand_qty, duplicate.min_on_hand_qty)
    if target.expires_on is None or (
        duplicate.expires_on and duplicate.expires_on < target.expires_on
    ):
        target.expires_on = duplicate.expires_on
    if target.pickup_on is None:
        target.pickup_on = duplicate.pickup_on
    if target.recurrence_days is None:
        target.recurrence_days = duplicate.recurrence_days
    target.state = "draft"
    target.approved_at = None
    target.approved_by_user_id = None
    target.revision += 1
    target.updated_by_user_id = actor.id
    target.updated_at = datetime.now(UTC)
    duplicate.state = "archived"
    duplicate.approved_at = None
    duplicate.approved_by_user_id = None
    duplicate.revision += 1
    duplicate.updated_by_user_id = actor.id
    duplicate.updated_at = datetime.now(UTC)
    _emit(db, target, actor, "merged_into", duplicate.id)
    _emit(db, duplicate, actor, "merged_out", target.id)
    db.commit()
    return {
        "state": "MERGED_REVIEW_REQUIRED",
        "target": _public(target, datetime.now(UTC).date()),
        "archivedId": duplicate.id,
    }
