"""Synthetic signing proves components, never real source enrollment or a connection."""

import asyncio
import base64
import hashlib
from datetime import UTC, datetime
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.api.ql364_source_health import canonical
from rosevear_ai_hub.master_shell_telemetry304 import (
    COMMS_ACK,
    build_comms_incident_candidates304,
    review_protected_comms_ack304,
    sign_readonly_source_telemetry304,
)

SOURCE_SHA = "a" * 40
KEY_ID = "source-owner-test-304"
MS = 1794324000000


def sample():
    observed = (
        datetime.fromtimestamp(MS / 1000, UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )
    return {
        "schema": "rosevear.ai-hub.ree-durable-uptime.v1",
        "sourceId": "rosevear-ai-hub",
        "sourceRole": "SOURCE",
        "hostPolicy": "REE_ORIGINAL_WINDOWS_ONLY",
        "automationHostEnforced": True,
        "collectionState": "OBSERVING_REE_LOCAL",
        "historyDurability": "SQLITE_7_DAYS_BOUNDED",
        "observationScope": "LOOPBACK_TCP_NOT_END_TO_END_UPTIME",
        "connection": "HOLD",
        "remoteCommands": 0,
        "newWindowsScheduledTasks": 0,
        "sampleCount": 3,
        "lastSampleAtUtc": observed,
        "services": [
            dict(
                id=id_,
                check="LOOPBACK_TCP_ONLY",
                reachableSamples=3 if id_ == "hub_api" else 0,
                sampleCount=3,
                latestState="TCP_REACHABLE" if id_ == "hub_api" else "TCP_UNREACHABLE",
            )
            for id_ in ("hub_api", "hub_web", "caddy_proxy")
        ],
        "incidentCandidates": [dict(service="hub_web", condition="THREE_CONSECUTIVE_TCP_FAILURES")],
    }


def signer():
    secret = Ed25519PrivateKey.generate()
    pub = secret.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return secret, pub, hashlib.sha256(pub).hexdigest()


def sign(secret, payload):
    return base64.urlsafe_b64encode(secret.sign(canonical(payload))).decode().rstrip("=")


def test_default_off_and_replay_claim_required():
    operation = str(uuid4())
    rejected = asyncio.run(
        sign_readonly_source_telemetry304(
            sample(), source_sha=SOURCE_SHA, operation_id=operation, now_ms=MS + 1000
        )
    )
    assert rejected["connection"] == "HOLD" and not rejected["signedTelemetry"]


def test_synthetic_source_signed_metadata_remains_hold():
    secret, pub, sha = signer()
    operation = str(uuid4())

    def authorize_original(**_):
        return dict(
            state="INDEPENDENT_REE_SOURCE_AND_MASTER_OWNER_ONE_TEST_AUTHORIZED",
            sourceId="rosevear-ai-hub",
            sourceSha=SOURCE_SHA,
            operationId=operation,
            originalWindowsVerified=True,
            independentReviewerVerified=True,
            sourceOwnerVerified=True,
            masterOwnerVerified=True,
            ownerConsentVerified=True,
            revoked=False,
            sourceKeyId=KEY_ID,
            sourceSpkiSha256=sha,
            sourcePublicKeyDer=pub,
        )

    def sign_original(*, payload, **_):
        return dict(
            attested=True,
            keyId=KEY_ID,
            spkiSha256=sha,
            signature=base64.urlsafe_b64encode(secret.sign(payload)).decode().rstrip("="),
        )

    opts = dict(
        source_sha=SOURCE_SHA,
        operation_id=operation,
        authorize_original=authorize_original,
        sign_original=sign_original,
        now_ms=MS + 1000,
    )
    held = asyncio.run(
        sign_readonly_source_telemetry304(sample(), claim_operation=lambda **_: False, **opts)
    )
    assert held["state"] == "HOLD_DURABLE_OPERATION_REPLAY_CLAIM"
    signed = asyncio.run(
        sign_readonly_source_telemetry304(sample(), claim_operation=lambda **_: True, **opts)
    )
    assert signed["state"] == "SOURCE_SIGNED_METADATA_ONLY_TEST_HOLD"
    assert signed["signedTelemetry"] and signed["connection"] == "HOLD"
    assert signed["sentToMaster"] is False and signed["acceptedByComms"] is False
    assert "private" not in str(signed).lower()
    too_old = asyncio.run(
        sign_readonly_source_telemetry304(
            sample(), claim_operation=lambda **_: True, **{**opts, "now_ms": MS + 131000}
        )
    )
    assert too_old["state"] == "HOLD_LOCAL_TELEMETRY_STALE"


def test_offline_candidate_and_receiver_ack_signatures_never_activate_receiver():
    candidates = build_comms_incident_candidates304(sample(), source_sha=SOURCE_SHA)
    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate["alertsSent"] == 0 and candidate["connection"] == "HOLD"
    assert not build_comms_incident_candidates304(sample(), source_sha="unverified")
    secret, pub, sha = signer()
    key_id = "comms-receiver-test-304"
    payload = dict(
        schema=COMMS_ACK,
        sourceId="rosevear-ai-hub",
        sourceSha=SOURCE_SHA,
        destination="rosevear-comms-hub",
        caseDigestSha256=candidate["caseDigestSha256"],
        ackId=str(uuid4()),
        decision="RECEIVED_FOR_INDEPENDENT_REVIEW_ONLY",
        issuedAtUtc="2026-11-10T17:59:00.000Z",
        expiresAtUtc="2026-11-10T18:00:30.000Z",
        scope="NO_CUSTOMER_NOTIFICATIONS_OR_RECOVERY",
    )
    # Use an explicit time inside the signed ACK window.
    now = int(datetime.fromisoformat("2026-11-10T18:00:00+00:00").timestamp() * 1000)
    envelope = dict(
        schema=COMMS_ACK, payload=payload, keyId=key_id, signature=sign(secret, payload)
    )
    opts = dict(
        pinned_receiver_public_key_der=pub,
        expected_receiver_spki_sha256=sha,
        expected_receiver_key_id=key_id,
        now_ms=now,
    )
    reviewed = review_protected_comms_ack304(candidate, envelope, **opts)
    assert reviewed["state"] == "RECEIVER_SIGNATURE_COMPONENT_VALID_HOLD"
    assert reviewed["independentlyAccepted"] is False and reviewed["connection"] == "HOLD"
    assert review_protected_comms_ack304(
        candidate, envelope, prior_ack_ids=frozenset({payload["ackId"]}), **opts
    )["state"].startswith("HOLD_")
    assert (
        review_protected_comms_ack304({**candidate, "service": "hub_api"}, envelope, **opts)[
            "state"
        ]
        == "HOLD_CANDIDATE_PROVENANCE_UNVERIFIED"
    )
    assert (
        review_protected_comms_ack304(candidate, {**envelope, "signature": "X" * 86}, **opts)[
            "state"
        ]
        == "HOLD_RECEIVER_SIGNATURE_UNVERIFIED"
    )
