"""QL-455 direct, authenticated business-to-Master health metadata contract.

Only brand/three-Master readonly health observations or challenge requests
are admitted. Never transports customer records, orders, payments, commands,
tenant data or physical receiver authority.
"""

from typing import Any

from rosevear_ai_hub.cross_app_security344 import ORDER
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _native

SCHEMA = "rosevear.cross-app.business-master-health346.v1"
MASTERS = ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
BUSINESSES = ("devilndove", "rosiedazzlers")
FIELDS = {
    "schema",
    "source",
    "destination",
    "messageId",
    "nonce",
    "correlationId",
    "eventType",
    "securityTier",
    "capability",
    "tenantId",
    "evidenceDigest",
    "incidentStatus",
    "connection",
    "createdAtMs",
    "expiresAtMs",
}


def validate_business_master346(
    envelope: Any, *, sender_pins: dict[str, tuple[bytes, str]], now_ms: int
) -> dict[str, Any]:
    denied = {
        "accepted": False,
        "messageDelivered": False,
        "connection": "HOLD",
        "connectivityVerified": False,
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
    }
    if not (
        isinstance(envelope, dict)
        and isinstance(envelope.get("payload"), dict)
        and isinstance(sender_pins, dict)
        and set(sender_pins) == set(ORDER)
        and all(
            isinstance(pin, tuple) and len(pin) == 2 and _public_ed25519(*pin)
            for pin in sender_pins.values()
        )
        and len({pin[0] for pin in sender_pins.values()}) == len(ORDER)
        and len({pin[1] for pin in sender_pins.values()}) == len(ORDER)
        and type(now_ms) is int
        and now_ms >= 0
    ):
        return {**denied, "state": "HOLD_QL455_UNENROLLED_BUSINESS_SIGNERS"}
    raw = envelope["payload"]
    sender = raw.get("source")
    if sender not in (*MASTERS, *BUSINESSES):
        return {**denied, "state": "HOLD_QL455_UNKNOWN_BUSINESS_SOURCE"}
    body = _native(envelope, FIELDS, SCHEMA, *sender_pins[sender])
    if body is None:
        return {**denied, "state": "HOLD_QL455_BAD_SIGNED_BRAND_ENVELOPE"}
    is_business = sender in BUSINESSES
    allowed_receiver = body["destination"] in (MASTERS if is_business else BUSINESSES)
    role = "OPERATOR_SCOPED" if is_business else "MASTER_GOVERNANCE"
    event = "business.health.readonly.v1" if is_business else "master.health.readonly.v1"
    capability = "business.health.readonly" if is_business else "master.health.readonly"
    if not (
        allowed_receiver
        and body["eventType"] == event
        and body["securityTier"] == role
        and body["capability"] == capability
        and body["tenantId"] is None
        and body["incidentStatus"] == "OPEN_HOLD"
        and body["connection"] == "HOLD"
        and all(
            type(body.get(k)) is str
            and 12 <= len(body[k]) <= 128
            and body[k].isascii()
            and all(ch.isalnum() or ch in "_-" for ch in body[k])
            for k in ("messageId", "nonce", "correlationId")
        )
        and len({body["messageId"], body["nonce"], body["correlationId"]}) == 3
        and type(body["evidenceDigest"]) is str
        and len(body["evidenceDigest"]) == 64
        and all(ch in "0123456789abcdef" for ch in body["evidenceDigest"])
        and type(body["createdAtMs"]) is int
        and type(body["expiresAtMs"]) is int
        and 0 <= now_ms - body["createdAtMs"] <= 60_000
        and body["createdAtMs"] < body["expiresAtMs"] <= body["createdAtMs"] + 60_000
        and now_ms < body["expiresAtMs"]
    ):
        return {**denied, "state": "HOLD_QL455_BRAND_ROUTE_SCOPE_OR_EXPIRY"}
    return {
        **denied,
        "accepted": True,
        "state": "QL455_SIGNED_BRAND_MASTER_READONLY_CONTRACT",
        "source": sender,
        "destination": body["destination"],
        "evidenceDigest": body["evidenceDigest"],
    }
