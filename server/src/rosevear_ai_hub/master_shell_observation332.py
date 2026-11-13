"""QL-441 separately witnessed bounded ON observation: signed review, never ON control.

This accepts only independently supplied Ed25519 evidence from an original-host
supervised procedure. Synthetic CI fixtures are NOT evidence of physical ON/OFF.
The module contains NO receiver actuator, connection, restart or key enrollment.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision332 import (
    ProtectedWitnessJournal332,
    hold_decision332,
)
from rosevear_ai_hub.master_shell_issuance331 import verify440
from rosevear_ai_hub.master_shell_prior332 import prior_signed_issuance332

ACTION = "BOUNDED_ISOLATED_ON_OBSERVATION_ONLY_NO_CONNECT"
OWNER_ACTION = "AUTHORIZE_BOUNDED_ISOLATED_ON_OBSERVATION_ONLY_NO_CONNECT"
GO = "GO_WITNESS_ACCEPTANCE_ONLY_NO_CONNECT"
NO_GO = "NO_GO_SHUTDOWN_REQUIRED"
OWNER_GO = "DUAL_OWNER_GO_ACCEPT_WITNESSED_ON_AND_REQUIRE_SHUTDOWN"
OWNER_NO_GO = "DUAL_OWNER_NO_GO_REQUIRE_IMMEDIATE_SHUTDOWN"
CUSTODY = "DURABLE_QL441_SIGNED_BOUNDED_ON_WITNESS_DECISION_CUSTODY_HOLD"
ROLES = (
    "sourceOwner",
    "masterOwner",
    "consumption",
    "hostOn",
    "receiverOn",
    "finalSourceOwner",
    "finalMasterOwner",
    *MASTERS,
)


def verify332(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if (
        role not in pins
        or not isinstance(envelope, dict)
        or not isinstance(envelope.get("payload"), dict)
    ):
        return None
    body = envelope["payload"]
    schema = f"rosevear.ai-hub.ql441.{role}.v1"
    return body if _native(envelope, set(body), schema, *pins[role]) == body else None


def review_witnessed_on332(
    monitor: Any,
    predecessor440: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedWitnessJournal332,
    pins: dict[str, tuple[bytes, str]],
    *,
    source_owner: dict[str, Any],
    master_owner: dict[str, Any],
    read_issuer: Any,
    read_consumption: Any,
    read_host_on: Any,
    read_independent_on: Any,
    master_reports: dict[str, Any],
    final_owner_signatures: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Supervised signed *review*; no physical receiver command is possible."""

    def fail(reason: str) -> dict[str, Any]:
        return hold_decision332(reason)

    if not (
        _on_ree(monitor)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and final_now_ms >= now_ms
        and isinstance(predecessor440, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedWitnessJournal332)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(
            isinstance(k, tuple)
            and len(k) == 2
            and isinstance(k[0], bytes)
            and isinstance(k[1], str)
            and _public_ed25519(*k)
            for k in pins.values()
        )
        and len({v[0] for v in pins.values()}) == len(pins)
        and len({v[1] for v in pins.values()}) == len(pins)
        and all(
            callable(fn)
            for fn in (read_issuer, read_consumption, read_host_on, read_independent_on)
        )
    ):
        return fail("HOLD_QL441_SOURCE_HOST_OR_DISTINCT_PINNED_SIGNERS_INVALID")
    try:
        previous = prior_signed_issuance332(monitor, **predecessor440)
    except (KeyError, TypeError, ValueError, OSError):
        previous = None
    if not previous:
        return fail("HOLD_QL441_EXACT_PROTECTED_QL431_TO_440_ISSUANCE_REQUIRED")
    previous_digest, linked = previous
    start = request.get("leaseIssuedAtMs")
    expires = request.get("leaseExpiresAtMs")
    challenge = request.get("challengeId")
    nonce = request.get("challengeNonce")
    lease_id = request.get("leaseId")
    if not (
        all(isinstance(x, str) and len(x) >= 12 for x in (challenge, nonce, lease_id))
        and len({challenge, nonce, lease_id, linked["challengeNonce"]}) == 4
        and request.get("action") == ACTION
        and request.get("originalIncidentId") == linked["incident"]
        and request.get("ceremonyId") == linked["ceremony"]
        and request.get("episodeId") == linked["episode"]
        and request.get("ql440PendingReceiptDigest") == linked["pending"]["receiptDigest"]
        and request.get("ql440IssuedReceiptDigest") == linked["issued"]["receiptDigest"]
        and request.get("ql440IssuerDigest") == linked["issuerDigest"]
        and request.get("ql440IndependentOffDigest") == linked["independentOffDigest"]
        and type(start) is int
        and type(expires) is int
        and 0 < expires - start <= 120_000
        and start <= now_ms < expires
        and final_now_ms < expires
    ):
        return fail("HOLD_QL441_FRESH_CHALLENGE_OR_BOUNDED_LEASE_INVALID")
    digest = _digest(request)
    initial = {}
    for role, envelope in (("sourceOwner", source_owner), ("masterOwner", master_owner)):
        body = verify332(role, envelope, pins)
        if not (
            body
            and isinstance(body.get("ownerId"), str)
            and bool(body["ownerId"])
            and body.get("requestDigest") == digest
            and body.get("challengeId") == challenge
            and body.get("challengeNonce") == nonce
            and body.get("leaseId") == lease_id
            and body.get("ql440IssuerDigest") == linked["issuerDigest"]
            and body.get("action") == OWNER_ACTION
        ):
            return fail("HOLD_QL441_TWO_SIGNED_OWNER_APPROVALS_INVALID")
        initial[role] = body
    if initial["sourceOwner"]["ownerId"] == initial["masterOwner"]["ownerId"]:
        return fail("HOLD_QL441_OWNER_IDENTITIES_NOT_DISTINCT")
    initial_digest = _digest([initial["sourceOwner"], initial["masterOwner"]])

    incident = linked["incident"]
    pending = journal.claim(monitor, incident, "PENDING", digest, previous_digest)
    if not pending:
        return fail("HOLD_QL441_ONE_USE_PENDING_UNDURABLE_OR_REPLAY")
    try:
        # An original signed issuance envelope is retrieved independently after PENDING.
        issuer_envelope = read_issuer(request=request, issuerDigest=linked["issuerDigest"])
        issuer = verify440("issuer", issuer_envelope, predecessor440["keys440"])
        if not (
            issuer
            and _digest(issuer) == linked["issuerDigest"]
            and issuer_envelope == linked["issuer"]
        ):
            return fail("HOLD_QL441_ORIGINAL_QL440_SIGNED_ISSUER_READBACK_INVALID")

        consumption_envelope = read_consumption(
            request=request, issuerDigest=linked["issuerDigest"], ownersDigest=initial_digest
        )
        consumption = verify332("consumption", consumption_envelope, pins)
        if not (
            consumption
            and consumption.get("requestDigest") == digest
            and consumption.get("hostMachineId") == "DESKTOP-AE894KC"
            and consumption.get("challengeId") == challenge
            and consumption.get("challengeNonce") == nonce
            and consumption.get("leaseId") == lease_id
            and consumption.get("ql440IssuerDigest") == linked["issuerDigest"]
            and consumption.get("initialOwnersDigest") == initial_digest
            and consumption.get("watchdogArmed") is True
            and type(consumption.get("sequence")) is int
            and consumption["sequence"] > 0
            and type(consumption.get("observedAtMs")) is int
            and start <= consumption["observedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL441_ORIGINAL_HOST_SIGNED_CONSUMPTION_INVALID")

        host_envelope = read_host_on(request=request, consumptionDigest=_digest(consumption))
        host = verify332("hostOn", host_envelope, pins)
        if not (
            host
            and host.get("requestDigest") == digest
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("challengeId") == challenge
            and host.get("challengeNonce") == nonce
            and host.get("leaseId") == lease_id
            and host.get("consumptionDigest") == _digest(consumption)
            and host.get("receiverState") == "ON"
            and host.get("watchdogArmed") is True
            and type(host.get("sequence")) is int
            and host["sequence"] >= consumption["sequence"]
            and type(host.get("observedAtMs")) is int
            and consumption["observedAtMs"] <= host["observedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL441_ORIGINAL_HOST_SIGNED_ON_OBSERVATION_INVALID")

        receiver_envelope = read_independent_on(request=request, hostOnDigest=_digest(host))
        receiver = verify332("receiverOn", receiver_envelope, pins)
        if not (
            receiver
            and receiver.get("requestDigest") == digest
            and receiver.get("challengeId") == challenge
            and receiver.get("challengeNonce") == nonce
            and receiver.get("leaseId") == lease_id
            and receiver.get("hostOnDigest") == _digest(host)
            and receiver.get("receiverState") == "ON"
            and type(receiver.get("sequence")) is int
            and receiver["sequence"] >= host["sequence"]
            and type(receiver.get("observedAtMs")) is int
            and host["observedAtMs"] <= receiver["observedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL441_SEPARATELY_PINNED_SIGNED_ON_WITNESS_INVALID")

        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL441_THREE_DISTINCT_MASTER_DECISIONS_REQUIRED")
        reports = []
        for master in MASTERS:
            body = verify332(master, master_reports[master], pins)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == digest
                and body.get("challengeId") == challenge
                and body.get("challengeNonce") == nonce
                and body.get("leaseId") == lease_id
                and body.get("independentOnDigest") == _digest(receiver)
                and body.get("decision") in (GO, NO_GO)
            ):
                return fail("HOLD_QL441_THREE_MASTER_GO_NO_GO_SIGNATURES_INVALID")
            reports.append(body)
        disposition = NO_GO if any(v["decision"] == NO_GO for v in reports) else GO
        master_digest = _digest(reports)
        expected_owner = OWNER_NO_GO if disposition == NO_GO else OWNER_GO
        if not isinstance(final_owner_signatures, dict) or set(final_owner_signatures) != {
            "finalSourceOwner",
            "finalMasterOwner",
        }:
            return fail("HOLD_QL441_FINAL_DUAL_OWNER_DECISION_REQUIRED")
        final_owners = []
        for role, first in (
            ("finalSourceOwner", "sourceOwner"),
            ("finalMasterOwner", "masterOwner"),
        ):
            body = verify332(role, final_owner_signatures[role], pins)
            if not (
                body
                and body.get("ownerId") == initial[first]["ownerId"]
                and body.get("requestDigest") == digest
                and body.get("challengeId") == challenge
                and body.get("challengeNonce") == nonce
                and body.get("leaseId") == lease_id
                and body.get("initialOwnersDigest") == initial_digest
                and body.get("independentOnDigest") == _digest(receiver)
                and body.get("mastersDigest") == master_digest
                and body.get("action") == expected_owner
            ):
                return fail("HOLD_QL441_FINAL_OWNER_GO_NO_GO_SIGNATURES_INVALID")
            final_owners.append(body)

        # Reopen every protected predecessor receipt and the pending record before DECISION.
        renewed = prior_signed_issuance332(monitor, **predecessor440)
        if not renewed or renewed[0] != previous_digest:
            return fail("HOLD_QL441_PROTECTED_QL431_TO_440_CUSTODY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL441_PRIVATE_PENDING_TAMPERED")
        if not (now_ms <= final_now_ms < expires):
            return fail("HOLD_QL441_LEASE_EXPIRED_BEFORE_DECISION")
        evidence = _digest(
            {
                "issuer": issuer,
                "sourceOwners": [initial["sourceOwner"], initial["masterOwner"]],
                "consumption": consumption,
                "originalHostOn": host,
                "independentOn": receiver,
                "masterDecisions": reports,
                "finalOwners": final_owners,
                "prior": previous_digest,
                "decision": disposition,
            }
        )
        final_receipt = journal.claim(monitor, incident, "DECISION", digest, evidence)
        if not final_receipt:
            return fail("HOLD_QL441_DECISION_DURABILITY_OR_READBACK_INVALID")
        return {
            **hold_decision332(CUSTODY),
            "accepted": True,
            "state": CUSTODY,
            "decision": disposition,
            "originalIncidentId": incident,
            "challengeId": challenge,
            "leaseId": lease_id,
            "leaseExpiresAtMs": expires,
            "pendingReceiptDigest": pending["receiptDigest"],
            "decisionReceiptDigest": final_receipt["receiptDigest"],
            "independentOnDigest": _digest(receiver),
            "mastersDigest": master_digest,
            "nextAction": "SEPARATELY_SIGNED_ISOLATED_SHUTDOWN_AND_FRESH_OFF_REQUIRED",
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL441_MISSING_OR_MALFORMED_SIGNED_WITNESS_EVIDENCE")
