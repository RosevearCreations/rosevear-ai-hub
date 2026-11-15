"""Build 344: signed, least-privilege seven-app handoff envelope contract.

This validates metadata ONLY; it never delivers an event, grants a role, or
asserts physical OFF, live CONNECTED, a tenant permission, or incident closure.
Durable replay protection and authenticated transport are separate later gates.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native

ORDER = (
    "ai-data-platform",
    "rosevear-ai-hub",
    "rosevear-comms-hub",
    "iCamp",
    "YW",
    "devilndove",
    "rosiedazzlers",
)
TIERS = (
    "PUBLIC_READ",
    "USER_SCOPED",
    "TENANT_SCOPED",
    "OPERATOR_SCOPED",
    "MASTER_GOVERNANCE",
    "ORIGINAL_HOST_OWNER_CEREMONY",
)
# Only a read-only governance message may cross the seven-hop chain in this
# release. No remote writes, PII payload, owner command or secret forwarding.
MESSAGE = "governance.open_hold.handoff.v1"
SCHEMA = "rosevear.cross-app.handoff344.v1"
MAX_AGE_MS = 60_000
FIELDS = {
    "schema",
    "messageId",
    "nonce",
    "correlationId",
    "source",
    "destination",
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
CONTRACT_DIGEST = _digest({
    "order": ORDER, "tiers": TIERS, "message": MESSAGE, "schema": SCHEMA
})


def hold_handoff344(reason: str) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": reason,
        "messageDelivered": False,
        "connection": "HOLD",
        "connectivityVerified": False,
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
    }


def validate_handoff344(
    envelope: Any,
    *,
    sender_pins: dict[str, tuple[bytes, str]],
    now_ms: int,
    previously_seen_ids: set[str] | None = None,
) -> dict[str, Any]:
    """Validate exact signed source->next hop with no network or write effects."""
    if not (
        isinstance(envelope, dict)
        and isinstance(envelope.get("payload"), dict)
        and isinstance(sender_pins, dict)
        and set(sender_pins) == set(ORDER)
        and all(
            isinstance(pin, tuple)
            and len(pin) == 2
            and _public_ed25519(*pin)
            for pin in sender_pins.values()
        )
        and len({pin[0] for pin in sender_pins.values()}) == len(ORDER)
        and len({pin[1] for pin in sender_pins.values()}) == len(ORDER)
        and type(now_ms) is int
        and now_ms >= 0
        and (previously_seen_ids is None or isinstance(previously_seen_ids, set))
    ):
        return hold_handoff344("HOLD_QL453_SENDER_TRUST_NOT_ENROLLED")
    payload = envelope["payload"]
    source = payload.get("source")
    if source not in ORDER:
        return hold_handoff344("HOLD_QL453_UNKNOWN_SENDER")
    body = _native(envelope, FIELDS, SCHEMA, *sender_pins[source])
    if not body:
        return hold_handoff344("HOLD_QL453_SIGNATURE_OR_SCHEMA_MISMATCH")
    index = ORDER.index(source)
    if not (
        index < len(ORDER) - 1
        and body.get("destination") == ORDER[index + 1]
        and body.get("eventType") == MESSAGE
        and body.get("securityTier") == "MASTER_GOVERNANCE"
        and body.get("capability") == "governance.readonly"
        and body.get("tenantId") is None
        and body.get("incidentStatus") == "OPEN_HOLD"
        and body.get("connection") == "HOLD"
        and all(
            isinstance(body.get(k), str)
            and 12 <= len(body[k]) <= 128
            and body[k].isascii()
            and all(char.isalnum() or char in "_-" for char in body[k])
            for k in ("messageId", "nonce", "correlationId")
        )
        and len({body["messageId"], body["nonce"], body["correlationId"]}) == 3
        and isinstance(body.get("evidenceDigest"), str)
        and len(body["evidenceDigest"]) == 64
        and all(c in "0123456789abcdef" for c in body["evidenceDigest"])
        and type(body.get("createdAtMs")) is int
        and type(body.get("expiresAtMs")) is int
        and 0 <= now_ms - body["createdAtMs"] <= MAX_AGE_MS
        and body["createdAtMs"] < body["expiresAtMs"] <= body["createdAtMs"] + MAX_AGE_MS
        and now_ms < body["expiresAtMs"]
    ):
        return hold_handoff344("HOLD_QL453_ROUTE_SCOPE_OR_EXPIRY")
    if previously_seen_ids is not None and body["messageId"] in previously_seen_ids:
        return hold_handoff344("HOLD_QL453_REPLAYED_MESSAGE")
    return {
        **hold_handoff344("QL453_SIGNED_ENVELOPE_VALIDATED_NO_TRANSPORT"),
        "accepted": True,
        "source": source,
        "destination": body["destination"],
        "contractDigest": CONTRACT_DIGEST,
        "evidenceDigest": body["evidenceDigest"],
        "messageId": body["messageId"],
        "requiresDurableReplayLedger": True,
        "messageDelivered": False,
    }
