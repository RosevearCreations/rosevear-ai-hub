"""QL-438 one-use fail-closed interruption and replay tests.

These tests exercise the protected attempt boundary, not live Windows or
Ed25519 acceptance. A successful signed end-to-end path remains required.
"""

from rosevear_ai_hub import master_shell_acceptance328 as q437
from rosevear_ai_hub import master_shell_acceptance329 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST
from test_master_shell_acceptance322 import signer


class OriginalHost:
    pass


def _case(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    monkeypatch.setattr(q437, "_on_ree", lambda monitor: True)
    incident = "incident-ql438-original"
    digest = _digest({"source": "ql437", "incident": incident})
    prior = {
        "accepted": True,
        "state": "DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY",
        "leaseExceptionOpen": True,
        "incidentClosureAuthorized": False,
        "connection": "HOLD",
        "activationAuthorized": False,
        "leaseDisposition": LATE_HOST,
        "originalIncidentId": incident,
        "nextCeremonyId": "next-ceremony-ql438",
        "finalReceiptDigest": digest,
        "externalAnchorDigest": digest,
        "independentAnchorReadbackDigest": digest,
    }
    predecessor = q.ProtectedClosureJournal328(tmp_path / "ql437-prior.db")
    assert predecessor.claim_once(OriginalHost(), incident, "PENDING", digest, digest)
    final = predecessor.claim_once(OriginalHost(), incident, "FINAL", digest, digest)
    assert final
    prior["finalReceiptDigest"] = final["receiptDigest"]
    request = {
        "originalIncidentId": incident,
        "remediationNonce": "fresh-remediation-nonce-ql438",
        "remediationId": "remediation-ql438",
        "ql437FinalReceiptDigest": prior["finalReceiptDigest"],
        "ql437AnchorDigest": digest,
        "ql437ReaderDigest": digest,
        "leaseDisposition": LATE_HOST,
        "rootCause": q.REMEDIES[LATE_HOST][0],
        "remedy": q.REMEDIES[LATE_HOST][1],
        "sourceRevision": "a" * 40,
        "controllerRevision": "b" * 40,
    }
    roles = (
        "host",
        "receiver",
        "remediationReviewer",
        "anchor",
        "reader",
        "owner",
        "ownerReviewer",
        *q.MASTERS,
    )
    keys = {role: signer()[1:] for role in roles}
    journal = q.ProtectedCorrectiveJournal329(tmp_path / "private-corrective.db")
    return prior, request, keys, journal, predecessor


def _run(prior, request, keys, journal, predecessor, host):
    def unavailable(**kwargs):
        raise AssertionError("unexpected external evidence call")

    return q.review_corrective_closure329(
        OriginalHost(),
        prior,
        request,
        journal,
        keys,
        ql437_journal=predecessor,
        read_host=host,
        read_off=unavailable,
        read_reviewer=unavailable,
        read_anchor=unavailable,
        read_reader=unavailable,
        master_reports={},
        owner_signatures={},
    )


def test_pending_precedes_external_adapter_and_interrupted_attempt_is_consumed(
    monkeypatch, tmp_path
):
    prior, request, keys, journal, predecessor = _case(monkeypatch, tmp_path)
    observations = []

    def interrupted_host(**kwargs):
        receipt = journal.read(OriginalHost(), prior["originalIncidentId"], "PENDING")
        observations.append(receipt)
        raise OSError("simulated original-host adapter interruption")

    result = _run(prior, request, keys, journal, predecessor, interrupted_host)
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["receiver"] == q.UNKNOWN_OFF
    assert len(observations) == 1
    assert observations[0]["requestDigest"] == _digest(request)
    assert journal.read(OriginalHost(), prior["originalIncidentId"], "CLOSED") is None

    called = []

    def forbidden_replay(**kwargs):
        called.append(True)
        raise AssertionError("replay reached original-host adapter")

    replay = _run(prior, request, keys, journal, predecessor, forbidden_replay)
    assert replay["accepted"] is False
    assert replay["state"] == "HOLD_QL438_ONE_USE_PENDING_FAILED_OR_REPLAY"
    assert called == []


def test_changed_request_cannot_reuse_consumed_incident(monkeypatch, tmp_path):
    prior, request, keys, journal, predecessor = _case(monkeypatch, tmp_path)
    assert (
        _run(
            prior,
            request,
            keys,
            journal,
            predecessor,
            lambda **kwargs: (_ for _ in ()).throw(OSError("interrupt")),
        )["accepted"]
        is False
    )
    changed = dict(request, remediationNonce="different-remediation-nonce-ql438")
    result = _run(
        prior,
        changed,
        keys,
        journal,
        predecessor,
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("replay")),
    )
    assert result["state"] == "HOLD_QL438_ONE_USE_PENDING_FAILED_OR_REPLAY"
    assert result["connection"] == "HOLD"


def test_wrong_remedy_rejected_before_pending(monkeypatch, tmp_path):
    prior, request, keys, journal, predecessor = _case(monkeypatch, tmp_path)
    request["remedy"] = "ACTIVATE_RECEIVER"
    result = _run(
        prior,
        request,
        keys,
        journal,
        predecessor,
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("unsafe adapter call")),
    )
    assert result["accepted"] is False
    assert result["activationAuthorized"] is False
    assert not journal.path.exists()


def test_recycled_signer_public_key_pin_rejected_before_pending(monkeypatch, tmp_path):
    prior, request, keys, journal, predecessor = _case(monkeypatch, tmp_path)
    keys["receiver"] = (keys["host"][0], "receiver")
    result = _run(
        prior,
        request,
        keys,
        journal,
        predecessor,
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("unsafe signer reached")),
    )
    assert result["state"] == "HOLD_QL438_INVALID_BOUND_REQUEST_OR_SIGNER_PINS"
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert not journal.path.exists()
