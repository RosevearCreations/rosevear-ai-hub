"""QL-455 direct Devil n Dove and Rosie Dazzlers signed three-Master health routes."""

from copy import deepcopy

import pytest

from rosevear_ai_hub.business_master_contract346 import (
    BUSINESSES,
    MASTERS,
    SCHEMA,
    validate_business_master346,
)
from rosevear_ai_hub.cross_app_ledger346 import DurableSignedMailbox346
from rosevear_ai_hub.cross_app_security344 import ORDER
from test_master_shell_acceptance322 import signed, signer

NOW = 2_200_000


def case(source, destination):
    keys = {app: signer() for app in ORDER}
    pins = {app: key[1:] for app, key in keys.items()}
    outbound = source in BUSINESSES
    body = {
        "schema": SCHEMA,
        "source": source,
        "destination": destination,
        "messageId": "Ql455BusinessMessageIdA",
        "nonce": "Ql455BusinessNonceIdB",
        "correlationId": "Ql455BusinessCorrelationC",
        "eventType": (
            "business.health.readonly.v1"
            if outbound else "master.health.readonly.v1"
        ),
        "securityTier": "OPERATOR_SCOPED" if outbound else "MASTER_GOVERNANCE",
        "capability": (
            "business.health.readonly" if outbound else "master.health.readonly"
        ),
        "tenantId": None,
        "evidenceDigest": "a" * 64,
        "incidentStatus": "OPEN_HOLD",
        "connection": "HOLD",
        "createdAtMs": NOW - 1_000,
        "expiresAtMs": NOW + 30_000,
    }
    return keys, pins, body


@pytest.mark.parametrize("business", BUSINESSES)
@pytest.mark.parametrize("master", MASTERS)
@pytest.mark.parametrize("reverse", [False, True])
def test_both_businesses_have_direct_signed_three_master_readonly_route(
    tmp_path, business, master, reverse
):
    source, dest = (master, business) if reverse else (business, master)
    keys, pins, body = case(source, dest)
    envelope = signed(keys[source], body)
    decision = validate_business_master346(
        envelope, sender_pins=pins, now_ms=NOW
    )
    assert decision["accepted"] is True, decision
    assert decision["messageDelivered"] is False
    assert decision["activationAuthorized"] is False
    mailbox = DurableSignedMailbox346(tmp_path / "protected" / "health.db")
    mailbox.enroll()
    assert mailbox.stage_outbound(
        envelope, pins=pins, now_ms=NOW
    )["accepted"] is True
    accepted = mailbox.receive_inbound(
        envelope, local_app=dest, pins=pins, now_ms=NOW
    )
    assert accepted["accepted"] is True, accepted
    assert accepted["messageDelivered"] is False


@pytest.mark.parametrize("field,value", [
    ("destination", "iCamp"),
    ("tenantId", "NotAllowedTenant"),
    ("eventType", "booking.write"),
    ("capability", "receiver.activate"),
    ("connection", "CONNECTED"),
    ("incidentStatus", "CLOSED"),
    ("securityTier", "ORIGINAL_HOST_OWNER_CEREMONY"),
    ("expiresAtMs", NOW),
])
def test_validly_signed_malicious_business_event_is_denied(field, value):
    keys, pins, body = case("devilndove", "rosevear-ai-hub")
    body[field] = value
    result = validate_business_master346(
        signed(keys[body["source"]], body), sender_pins=pins, now_ms=NOW
    )
    assert result["accepted"] is False


def test_wrong_app_signature_drift_and_replay_denied(tmp_path):
    keys, pins, body = case("rosiedazzlers", "rosevear-comms-hub")
    envelope = signed(keys["ai-data-platform"], body)
    assert not validate_business_master346(
        envelope, sender_pins=pins, now_ms=NOW
    )["accepted"]
    envelope = signed(keys["rosiedazzlers"], body)
    mailbox = DurableSignedMailbox346(tmp_path / "ql455-brand.db")
    mailbox.enroll()
    assert mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    assert not mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    changed = deepcopy(body)
    changed["messageId"] = "Ql455OtherBusinessMessageId"
    assert not mailbox.stage_outbound(
        signed(keys["rosiedazzlers"], changed), pins=pins, now_ms=NOW
    )["accepted"]
