"""QL-442: re-open exact protected QL-441 signed ON witness, no runtime inference.

Only original-host protected private journal plus independently pinned signed
predecessor evidence is eligible. A browser-supplied status alone is not proof.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_decision332 import ProtectedWitnessJournal332
from rosevear_ai_hub.master_shell_observation332 import (
    ACTION,
    CUSTODY,
    GO,
    NO_GO,
    OWNER_ACTION,
    OWNER_GO,
    OWNER_NO_GO,
    ROLES,
    verify332,
)
from rosevear_ai_hub.master_shell_prior332 import prior_signed_issuance332


def verify_prior_witness333(
    monitor: Any,
    *,
    prior440: dict[str, Any],
    result441: dict[str, Any],
    request441: dict[str, Any],
    journal441: ProtectedWitnessJournal332,
    pins441: dict[str, tuple[bytes, str]],
    approvals441: dict[str, Any],
    signed441: dict[str, Any],
    masters441: dict[str, Any],
    final441: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    if not (
        isinstance(result441, dict)
        and result441.get("accepted") is True
        and result441.get("state") == CUSTODY
        and result441.get("connection") == "HOLD"
        and result441.get("activationAuthorized") is False
        and isinstance(request441, dict)
        and request441.get("action") == ACTION
        and isinstance(journal441, ProtectedWitnessJournal332)
        and isinstance(pins441, dict)
        and set(pins441) == set(ROLES)
        and len({v[0] for v in pins441.values()}) == len(pins441)
        and len({v[1] for v in pins441.values()}) == len(pins441)
        and isinstance(approvals441, dict)
        and set(approvals441) == {"sourceOwner", "masterOwner"}
        and isinstance(signed441, dict)
        and set(signed441) == {"consumption", "hostOn", "receiverOn"}
        and isinstance(masters441, dict)
        and set(masters441) == set(MASTERS)
        and isinstance(final441, dict)
        and set(final441) == {"finalSourceOwner", "finalMasterOwner"}
    ):
        return None
    previous = prior_signed_issuance332(monitor, **prior440)
    if not previous:
        return None
    previous_digest, link = previous
    incident = link["incident"]
    req_digest = _digest(request441)
    pending = journal441.read(monitor, incident, "PENDING")
    decision = journal441.read(monitor, incident, "DECISION")
    start, expires = request441.get("leaseIssuedAtMs"), request441.get("leaseExpiresAtMs")
    challenge, nonce, lease = (
        request441.get("challengeId"),
        request441.get("challengeNonce"),
        request441.get("leaseId"),
    )
    if not (
        pending
        and decision
        and pending["requestDigest"] == req_digest
        and pending["evidenceDigest"] == previous_digest
        and decision["requestDigest"] == req_digest
        and pending["receiptDigest"] == result441.get("pendingReceiptDigest")
        and decision["receiptDigest"] == result441.get("decisionReceiptDigest")
        and result441.get("originalIncidentId") == incident
        and result441.get("challengeId") == challenge
        and result441.get("leaseId") == lease
        and result441.get("leaseExpiresAtMs") == expires
        and request441.get("originalIncidentId") == incident
        and request441.get("ceremonyId") == link["ceremony"]
        and request441.get("episodeId") == link["episode"]
        and request441.get("ql440IssuerDigest") == link["issuerDigest"]
        and request441.get("ql440PendingReceiptDigest") == link["pending"]["receiptDigest"]
        and request441.get("ql440IssuedReceiptDigest") == link["issued"]["receiptDigest"]
        and type(start) is int
        and type(expires) is int
        and 0 < expires - start <= 120_000
        and isinstance(challenge, str)
        and isinstance(nonce, str)
        and isinstance(lease, str)
        and len({challenge, nonce, lease, link["challengeNonce"]}) == 4
    ):
        return None
    initial = []
    for role in ("sourceOwner", "masterOwner"):
        body = verify332(role, approvals441[role], pins441)
        if not (
            body
            and body.get("requestDigest") == req_digest
            and body.get("challengeId") == challenge
            and body.get("challengeNonce") == nonce
            and body.get("leaseId") == lease
            and body.get("ql440IssuerDigest") == link["issuerDigest"]
            and body.get("action") == OWNER_ACTION
            and isinstance(body.get("ownerId"), str)
            and body["ownerId"]
        ):
            return None
        initial.append(body)
    if initial[0]["ownerId"] == initial[1]["ownerId"]:
        return None
    initial_digest = _digest(initial)
    consumption = verify332("consumption", signed441["consumption"], pins441)
    host = verify332("hostOn", signed441["hostOn"], pins441)
    receiver = verify332("receiverOn", signed441["receiverOn"], pins441)
    if not (consumption and host and receiver):
        return None
    if not (
        consumption.get("requestDigest") == req_digest
        and consumption.get("hostMachineId") == "DESKTOP-AE894KC"
        and consumption.get("challengeId") == challenge
        and consumption.get("challengeNonce") == nonce
        and consumption.get("leaseId") == lease
        and consumption.get("ql440IssuerDigest") == link["issuerDigest"]
        and consumption.get("initialOwnersDigest") == initial_digest
        and consumption.get("watchdogArmed") is True
        and type(consumption.get("sequence")) is int
        and consumption["sequence"] > 0
        and type(consumption.get("observedAtMs")) is int
        and start <= consumption["observedAtMs"] < expires
        and host.get("requestDigest") == req_digest
        and host.get("hostMachineId") == "DESKTOP-AE894KC"
        and host.get("challengeId") == challenge
        and host.get("challengeNonce") == nonce
        and host.get("leaseId") == lease
        and host.get("consumptionDigest") == _digest(consumption)
        and host.get("watchdogArmed") is True
        and host.get("receiverState") == "ON"
        and type(host.get("sequence")) is int
        and host["sequence"] >= consumption["sequence"]
        and type(host.get("observedAtMs")) is int
        and consumption["observedAtMs"] <= host["observedAtMs"] < expires
        and receiver.get("requestDigest") == req_digest
        and receiver.get("challengeId") == challenge
        and receiver.get("challengeNonce") == nonce
        and receiver.get("leaseId") == lease
        and receiver.get("hostOnDigest") == _digest(host)
        and receiver.get("receiverState") == "ON"
        and type(receiver.get("sequence")) is int
        and receiver["sequence"] >= host["sequence"]
        and type(receiver.get("observedAtMs")) is int
        and host["observedAtMs"] <= receiver["observedAtMs"] < expires
    ):
        return None
    reports = []
    for master in MASTERS:
        body = verify332(master, masters441[master], pins441)
        if not (
            body
            and body.get("masterId") == master
            and body.get("requestDigest") == req_digest
            and body.get("challengeId") == challenge
            and body.get("challengeNonce") == nonce
            and body.get("leaseId") == lease
            and body.get("independentOnDigest") == _digest(receiver)
            and body.get("decision") in (GO, NO_GO)
        ):
            return None
        reports.append(body)
    verdict = NO_GO if any(r["decision"] == NO_GO for r in reports) else GO
    if result441.get("decision") != verdict or result441.get("mastersDigest") != _digest(reports):
        return None
    final_owners = []
    for role, owner in (("finalSourceOwner", initial[0]), ("finalMasterOwner", initial[1])):
        body = verify332(role, final441[role], pins441)
        if not (
            body
            and body.get("ownerId") == owner["ownerId"]
            and body.get("requestDigest") == req_digest
            and body.get("challengeId") == challenge
            and body.get("challengeNonce") == nonce
            and body.get("leaseId") == lease
            and body.get("initialOwnersDigest") == initial_digest
            and body.get("independentOnDigest") == _digest(receiver)
            and body.get("mastersDigest") == _digest(reports)
            and body.get("action") == (OWNER_NO_GO if verdict == NO_GO else OWNER_GO)
        ):
            return None
        final_owners.append(body)
    evidence = _digest(
        {
            "issuer": link["issuer"]["payload"],
            "sourceOwners": initial,
            "consumption": consumption,
            "originalHostOn": host,
            "independentOn": receiver,
            "masterDecisions": reports,
            "finalOwners": final_owners,
            "prior": previous_digest,
            "decision": verdict,
        }
    )
    if decision["evidenceDigest"] != evidence or result441.get("independentOnDigest") != _digest(
        receiver
    ):
        return None
    return (
        _digest(
            {
                "predecessor": previous_digest,
                "pending": pending,
                "decision": decision,
                "signedEvidence": evidence,
            }
        ),
        {
            "incident": incident,
            "challengeId": challenge,
            "leaseId": lease,
            "leaseExpiresAtMs": expires,
            "independentOnDigest": _digest(receiver),
            "decisionReceiptDigest": decision["receiptDigest"],
            "ownerIds": [v["ownerId"] for v in initial],
            "requestDigest": req_digest,
            "independentOnAtMs": receiver["observedAtMs"],
            "independentOnSequence": receiver["sequence"],
        },
    )
