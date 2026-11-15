"""QL-455 verified Ed25519 inbox, outbox, ACK, replay, retry/expiry tests.

All signers in this test are synthetic. No network or original-host operation.
"""

from copy import deepcopy

import pytest

from rosevear_ai_hub.cross_app_ledger346 import (
    ACK_SCHEMA,
    DurableSignedMailbox346,
)
from rosevear_ai_hub.cross_app_security344 import MESSAGE, ORDER, SCHEMA
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from test_master_shell_acceptance322 import signed, signer

NOW = 2_200_000


def fixture(tmp_path, source="ai-data-platform"):
    keys = {app: signer() for app in ORDER}
    pins = {app: key[1:] for app, key in keys.items()}
    destination = ORDER[ORDER.index(source) + 1]
    body = {
        "schema": SCHEMA,
        "messageId": "MessageUniqueQl455CaseA",
        "nonce": "NonceUniqueQl455CaseA",
        "correlationId": "CorrelationQl455CaseA",
        "source": source,
        "destination": destination,
        "eventType": MESSAGE,
        "securityTier": "MASTER_GOVERNANCE",
        "capability": "governance.readonly",
        "tenantId": None,
        "evidenceDigest": "a" * 64,
        "incidentStatus": "OPEN_HOLD",
        "connection": "HOLD",
        "createdAtMs": NOW - 1_000,
        "expiresAtMs": NOW + 50_000,
    }
    mailbox = DurableSignedMailbox346(tmp_path / "private" / "ql455.db")
    mailbox.enroll()
    return mailbox, keys, pins, body


def ack_for(keys, body, *, attempt=1, recipient=None):
    sender = recipient or body["destination"]
    payload = {
        "schema": ACK_SCHEMA,
        "messageId": body["messageId"],
        "source": sender,
        "destination": body["source"],
        "originalDigest": _digest(signed(keys[body["source"]], body)),
        "evidenceDigest": body["evidenceDigest"],
        "attempt": attempt,
        "status": "PERSISTED",
        "issuedAtMs": NOW + 1_000,
        "expiresAtMs": NOW + 25_000,
    }
    return signed(keys[sender], payload)


def test_durable_outbox_persist_claim_and_signed_ack(tmp_path):
    mailbox, keys, pins, body = fixture(tmp_path)
    envelope = signed(keys[body["source"]], body)
    staged = mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)
    assert staged["accepted"] is True
    assert staged["messageDelivered"] is False
    assert mailbox.counts()["counts"] == {"OUT_PENDING": 1}
    lease = mailbox.claim_due(now_ms=NOW)
    assert lease["accepted"] is True
    assert lease["attempt"] == 1
    assert lease["signedEnvelope"] == envelope
    assert lease["messageDelivered"] is False
    received = mailbox.receive_inbound(
        envelope,
        local_app=body["destination"],
        pins=pins,
        now_ms=NOW + 1_000,
    )
    assert received["accepted"] is True
    assert received["messageDelivered"] is False
    accepted = mailbox.accept_signed_ack(ack_for(keys, body), pins=pins, now_ms=NOW + 2_000)
    assert accepted["accepted"] is True
    assert accepted["historicalAckVerified"] is True
    assert accepted["messageDelivered"] is False
    assert accepted["physicalReceiverCurrentlyOff"] is False
    assert accepted["activationAuthorized"] is False
    assert mailbox.counts()["counts"] == {"IN_RECEIVED": 1, "OUT_ACKED": 1}
    assert (
        mailbox.accept_signed_ack(ack_for(keys, body), pins=pins, now_ms=NOW + 2_000)["accepted"]
        is False
    )
    reopened = DurableSignedMailbox346(mailbox.path)
    assert reopened.counts()["counts"] == {"IN_RECEIVED": 1, "OUT_ACKED": 1}
    assert reopened.claim_due(now_ms=NOW + 2_000)["accepted"] is False


def test_idempotent_inbox_and_durable_outbox_replay(tmp_path):
    mailbox, keys, pins, body = fixture(tmp_path)
    envelope = signed(keys[body["source"]], body)
    assert mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    assert not mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    first = mailbox.receive_inbound(envelope, local_app=body["destination"], pins=pins, now_ms=NOW)
    second = mailbox.receive_inbound(envelope, local_app=body["destination"], pins=pins, now_ms=NOW)
    assert first["accepted"] is True and first["idempotent"] is False
    assert second["accepted"] is True and second["idempotent"] is True
    changed = deepcopy(body)
    changed["evidenceDigest"] = "b" * 64
    conflict = mailbox.receive_inbound(
        signed(keys[body["source"]], changed),
        local_app=body["destination"],
        pins=pins,
        now_ms=NOW,
    )
    assert conflict["accepted"] is False


def test_fail_closed_lease_crash_recovery_and_dead_letters(tmp_path):
    mailbox, keys, pins, body = fixture(tmp_path)
    envelope = signed(keys[body["source"]], body)
    assert mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    assert mailbox.claim_due(now_ms=NOW)["accepted"]
    assert not mailbox.claim_due(now_ms=NOW)["accepted"]
    assert mailbox.recover_expired(now_ms=NOW + 19_999)["recovered"] == 0
    recovery = mailbox.recover_expired(now_ms=NOW + 20_000)
    assert recovery["accepted"] is True
    assert recovery["recovered"] == 1
    assert mailbox.claim_due(now_ms=NOW + 20_001)["accepted"] is False
    second = mailbox.claim_due(now_ms=NOW + 23_000)
    assert second["accepted"] is True
    assert second["attempt"] == 2
    assert not mailbox.accept_signed_ack(
        ack_for(keys, body, attempt=1),
        pins=pins,
        now_ms=NOW + 24_000,
    )["accepted"]
    assert mailbox.recover_expired(now_ms=NOW + 43_000)["recovered"] == 1
    # Delayed outgoing metadata expires at 50 seconds and must never be leased.
    assert not mailbox.claim_due(now_ms=NOW + 60_000)["accepted"]
    assert mailbox.counts()["counts"] == {"OUT_DEAD": 1}


@pytest.mark.parametrize("bad", ("wrong_route", "tamper", "wrong_signer", "expired"))
def test_inbound_invalid_signed_messages_fail_closed(tmp_path, bad):
    mailbox, keys, pins, body = fixture(tmp_path)
    envelope = signed(keys[body["source"]], body)
    local_app = body["destination"]
    now_ms = NOW
    if bad == "wrong_route":
        local_app = "rosiedazzlers"
    elif bad == "tamper":
        envelope["payload"]["incidentStatus"] = "CLOSED"
    elif bad == "wrong_signer":
        envelope = signed(keys[body["destination"]], body)
    else:
        now_ms = NOW + 60_000
    result = mailbox.receive_inbound(envelope, local_app=local_app, pins=pins, now_ms=now_ms)
    assert result["accepted"] is False
    assert not mailbox.counts()["counts"]


def test_ack_forgery_expiry_and_foreign_reference_denied(tmp_path):
    mailbox, keys, pins, body = fixture(tmp_path)
    envelope = signed(keys[body["source"]], body)
    assert mailbox.stage_outbound(envelope, pins=pins, now_ms=NOW)["accepted"]
    assert mailbox.claim_due(now_ms=NOW)["accepted"]
    incorrect = ack_for(keys, body, recipient="rosiedazzlers")
    assert mailbox.accept_signed_ack(incorrect, pins=pins, now_ms=NOW + 2_000)["accepted"] is False
    foreign = deepcopy(body)
    foreign["messageId"] = "NotTheOriginalMessageId"
    assert not mailbox.accept_signed_ack(ack_for(keys, foreign), pins=pins, now_ms=NOW + 2_000)[
        "accepted"
    ]
    assert not mailbox.accept_signed_ack(ack_for(keys, body), pins=pins, now_ms=NOW + 27_000)[
        "accepted"
    ]
    assert mailbox.counts()["counts"] == {"OUT_LEASED": 1}


def test_missing_enrollment_and_expired_outbox_never_transmit(tmp_path):
    mailbox, keys, pins, body = fixture(tmp_path)
    blank = DurableSignedMailbox346(tmp_path / "absent.db")
    assert blank.counts()["ledgerEnrolled"] is False
    assert not blank.stage_outbound(signed(keys[body["source"]], body), pins=pins, now_ms=NOW)[
        "accepted"
    ]
    assert mailbox.stage_outbound(signed(keys[body["source"]], body), pins=pins, now_ms=NOW)[
        "accepted"
    ]
    assert not mailbox.claim_due(now_ms=NOW + 55_000)["accepted"]
    assert mailbox.counts()["counts"] == {"OUT_DEAD": 1}


@pytest.mark.parametrize("source", ORDER[:-1])
def test_every_adjacent_seven_app_hop_is_scoped_and_no_remote_send(tmp_path, source):
    mailbox, keys, pins, body = fixture(tmp_path, source=source)
    result = mailbox.stage_outbound(signed(keys[source], body), pins=pins, now_ms=NOW)
    assert result["accepted"] is True, result
    assert result["messageDelivered"] is False
