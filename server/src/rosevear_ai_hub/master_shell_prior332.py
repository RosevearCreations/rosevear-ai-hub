"""QL-441 verifies exact signed QL-440 protected PENDING/ISSUED predecessor.

A caller-supplied QL-440 code result or local ISSUED file is not enough.
This replays the QL-431–439 protected chain, independently signed QL-440
issuer/host/receiver/Master/owner receipts and durable exact receipt digests.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_issuance331 import (
    ISSUED,
    MASTER_DECISION,
    OWNER_DECISION,
    ISSUER_DECISION,
    ROLES,
    ProtectedIssuanceJournal331,
    _prior439,
    verify440,
)


def prior_signed_issuance332(
    monitor: Any,
    *,
    input438: dict[str, Any],
    readiness439: dict[str, Any],
    request439: dict[str, Any],
    journal439: Any,
    signed439: dict[str, Any],
    keys439: dict[str, tuple[bytes, str]],
    issued440: dict[str, Any],
    request440: dict[str, Any],
    journal440: ProtectedIssuanceJournal331,
    signed440: dict[str, Any],
    keys440: dict[str, tuple[bytes, str]],
) -> tuple[str, dict[str, Any]] | None:
    if not (
        isinstance(issued440, dict)
        and issued440.get("accepted") is True
        and issued440.get("state") == ISSUED
        and issued440.get("ceremonyAuthorizationIssued") is True
        and issued440.get("connection") == "HOLD"
        and issued440.get("activationAuthorized") is False
        and isinstance(request440, dict)
        and isinstance(journal440, ProtectedIssuanceJournal331)
        and isinstance(signed440, dict)
        and set(signed440) == set(ROLES)
        and isinstance(keys440, dict)
        and set(keys440) == set(ROLES)
        and len({k[0] for k in keys440.values()}) == len(keys440)
        and all(
            isinstance(k, tuple)
            and len(k) == 2
            and isinstance(k[0], bytes)
            and isinstance(k[1], str)
            and _public_ed25519(*k)
            for k in keys440.values()
        )
    ):
        return None

    predecessor = _prior439(
        monitor, input438, readiness439, request439, journal439, signed439, keys439
    )
    if not predecessor:
        return None
    prior_digest, link = predecessor
    incident = link["incident"]
    pending = journal440.read(monitor, incident, "PENDING")
    issued = journal440.read(monitor, incident, "ISSUED")
    request_digest = _digest(request440)
    if not (
        pending
        and issued
        and pending["requestDigest"] == request_digest
        and pending["evidenceDigest"] == prior_digest
        and issued["requestDigest"] == request_digest
        and pending["receiptDigest"] == issued440.get("pendingReceiptDigest")
        and issued["receiptDigest"] == issued440.get("issuedReceiptDigest")
        and request440.get("originalIncidentId") == incident
        and request440.get("ceremonyId") == link["ceremony"]
        and request440.get("episodeId") == link["episode"]
        and issued440.get("originalIncidentId") == incident
        and issued440.get("ceremonyId") == link["ceremony"]
        and issued440.get("episodeId") == link["episode"]
        and issued440.get("challengeNonce") == request440.get("challengeNonce")
    ):
        return None
    verified = {}
    for role in ROLES:
        verified[role] = verify440(role, signed440[role], keys440)
        if verified[role] is None:
            return None

    host, receiver = verified["host"], verified["receiver"]
    if not (
        host.get("requestDigest") == request_digest
        and host.get("hostMachineId") == "DESKTOP-AE894KC"
        and host.get("receiverState") == "OFF"
        and host.get("failClosedShutdownArmed") is True
        and host.get("challengeNonce") == request440.get("challengeNonce")
        and receiver.get("requestDigest") == request_digest
        and receiver.get("challengeNonce") == request440.get("challengeNonce")
        and receiver.get("hostOffDigest") == _digest(host)
        and receiver.get("receiverState") == "OFF"
        and type(host.get("offSequence")) is int
        and type(receiver.get("offSequence")) is int
        and receiver["offSequence"] >= host["offSequence"] > 0
    ):
        return None
    masters = [verified[m] for m in MASTERS]
    if not all(
        v.get("masterId") == master
        and v.get("requestDigest") == request_digest
        and v.get("challengeNonce") == request440.get("challengeNonce")
        and v.get("independentOffDigest") == _digest(receiver)
        and v.get("decision") == MASTER_DECISION
        for master, v in zip(MASTERS, masters)
    ):
        return None
    masters_digest = _digest(masters)
    owners = [verified["owner"], verified["ownerReviewer"]]
    if not (
        owners[0].get("ownerId")
        and owners[1].get("ownerId")
        and owners[0]["ownerId"] != owners[1]["ownerId"]
        and all(
            v.get("requestDigest") == request_digest
            and v.get("challengeNonce") == request440.get("challengeNonce")
            and v.get("independentOffDigest") == _digest(receiver)
            and v.get("mastersDigest") == masters_digest
            and v.get("decision") == OWNER_DECISION
            for v in owners
        )
    ):
        return None
    issuer = verified["issuer"]
    if not (
        issuer.get("requestDigest") == request_digest
        and issuer.get("hostMachineId") == "DESKTOP-AE894KC"
        and issuer.get("challengeNonce") == request440.get("challengeNonce")
        and issuer.get("independentOffDigest") == _digest(receiver)
        and issuer.get("mastersDigest") == masters_digest
        and issuer.get("ownersDigest") == _digest(owners)
        and issuer.get("action") == ISSUER_DECISION
        and issued440.get("independentOffDigest") == _digest(receiver)
        and issued440.get("issuerDigest") == _digest(issuer)
    ):
        return None
    evidence = _digest(
        {
            "host": host,
            "receiver": receiver,
            "masters": masters,
            "owners": owners,
            "issuer": issuer,
            "prior": prior_digest,
        }
    )
    if issued["evidenceDigest"] != evidence:
        return None
    return (
        _digest(
            {
                "prior": prior_digest,
                "pending": pending,
                "issued": issued,
                "signed": evidence,
            }
        ),
        {
            "incident": incident,
            "ceremony": link["ceremony"],
            "episode": link["episode"],
            "challengeNonce": request440["challengeNonce"],
            "issuerDigest": _digest(issuer),
            "independentOffDigest": _digest(receiver),
            "mastersDigest": masters_digest,
            "ownersDigest": _digest(owners),
            "pending": pending,
            "issued": issued,
            "issuer": signed440["issuer"],
        },
    )
