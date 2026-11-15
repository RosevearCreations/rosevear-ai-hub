"""QL-454 signed seven-app authorization and scope-isolation negative tests."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import cross_app_policy345 as p
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from test_master_shell_acceptance322 import signed, signer

NOW = 2_200_000
FIELDS = ("ownerId", "tenantId", "companyId")
IDENTITIES = {
    "ownerId": "personAlice001",
    "tenantId": "TenantAlpha001",
    "companyId": "CompanyAlpha001",
}


def keys_and_pins():
    keys = {app: signer() for app in p.ORDER}
    pins = {app: pair[1:] for app, pair in keys.items()}
    return keys, pins


def resource(app, tier):
    kind = next(k for k, value in p.RESOURCE_MATRIX[app].items() if value == tier)
    metadata = {
        "app": app, "kind": kind, "resourceId": "row00001",
        "ownerId": None, "tenantId": None, "companyId": None,
        "classification": tier,
    }
    if tier == "USER_SCOPED":
        metadata["ownerId"] = IDENTITIES["ownerId"]
    if tier == "TENANT_SCOPED":
        metadata["tenantId"] = IDENTITIES["tenantId"]
    if tier == "OPERATOR_SCOPED":
        metadata["companyId"] = IDENTITIES["companyId"]
    return metadata


def assertion(app, tier, action, metadata):
    issuer = "ai-data-platform" if tier == "MASTER_GOVERNANCE" else app
    return {
        "schema": p.SCHEMA,
        "issuer": issuer,
        "audience": app,
        "subjectId": IDENTITIES["ownerId"],
        "role": p.ROLE_BY_TIER[tier],
        "tier": tier,
        "tenantId": metadata["tenantId"],
        "companyId": metadata["companyId"],
        "sessionId": "Session00000001",
        "scopes": [f"{metadata['kind']}:{action}"],
        "issuedAtMs": NOW - 10_000,
        "expiresAtMs": NOW + 20_000,
    }


def request(app, tier, action="read"):
    keys, pins = keys_and_pins()
    meta = resource(app, tier)
    principal = signed(keys[assertion(app, tier, action, meta)["issuer"]],
                       assertion(app, tier, action, meta))
    return {
        "principal": principal, "resource": meta, "action": action,
        "audience": app, "now_ms": NOW, "trusted_issuer_pins": pins,
    }, keys


def votes_for(arguments, keys):
    assertion_data = arguments["principal"]["payload"]
    metadata = arguments["resource"]
    result = {}
    for master in p.MASTERS:
        vote = {
            "schema": p.VOTE_SCHEMA,
            "masterId": master,
            "assertionDigest": _digest(assertion_data),
            "resourceDigest": _digest(metadata),
            "policyDigest": p.POLICY_DIGEST,
            "decision": "READONLY_HOLD",
            "incidentStatus": "OPEN_HOLD",
            "connection": "HOLD",
            "activationAuthorized": False,
            "closureAuthorized": False,
            "issuedAtMs": NOW - 5_000,
            "expiresAtMs": NOW + 10_000,
        }
        result[master] = signed(keys[master], vote)
    return result


@pytest.mark.parametrize("app", p.ORDER)
def test_anonymous_only_reads_public_server_resource(app):
    meta = resource(app, "PUBLIC_READ")
    args = {"principal": None, "resource": meta, "audience": app, "now_ms": NOW}
    yes = p.evaluate_policy345(action="read", **args)
    assert yes["allowed"] is True
    assert yes["activationAuthorized"] is False
    assert yes["crossAppConnectivityVerified"] is False
    assert p.evaluate_policy345(action="write", **args)["allowed"] is False
    for tier in ("USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED",
                 "MASTER_GOVERNANCE"):
        args["resource"] = resource(app, tier)
        assert p.evaluate_policy345(action="read", **args)["allowed"] is False


@pytest.mark.parametrize("app", p.ORDER)
@pytest.mark.parametrize("tier", ("USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED"))
@pytest.mark.parametrize("action", ("read", "write"))
def test_independent_scoped_signed_assertions_each_app(app, tier, action):
    args, _keys = request(app, tier, action)
    outcome = p.evaluate_policy345(**args)
    assert outcome["allowed"] is True, outcome
    assert outcome["tier"] == tier
    assert outcome["messageDelivered"] is False
    assert outcome["activationAuthorized"] is False
    assert outcome["closureAuthorized"] is False
    assert outcome["physicalReceiverCurrentlyOff"] is False
    assert outcome["requiresRuntimeResourceLookup"] is True
    assert outcome["requiresDurableSessionReplayJournal"] is True


@pytest.mark.parametrize("tier,field", [
    ("USER_SCOPED", "ownerId"), ("TENANT_SCOPED", "tenantId"),
    ("OPERATOR_SCOPED", "companyId"),
])
def test_cross_user_tenant_company_is_denied_even_with_valid_signature(tier, field):
    args, _keys = request("iCamp", tier)
    args["resource"][field] = "OtherIdentity0001"
    outcome = p.evaluate_policy345(**args)
    assert outcome["allowed"] is False
    assert outcome["connection"] == "HOLD"


@pytest.mark.parametrize("tier", ("USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED"))
def test_higher_role_never_implicitly_inherits_lower_scope(tier):
    args, keys = request("rosiedazzlers", tier)
    changed = deepcopy(args["principal"]["payload"])
    changed["role"] = "company_operator"
    args["principal"] = signed(keys[changed["issuer"]], changed)
    expected = tier == "OPERATOR_SCOPED"
    assert p.evaluate_policy345(**args)["allowed"] is expected


def test_wrong_app_audience_and_validly_signed_scope_escalation():
    args, keys = request("iCamp", "TENANT_SCOPED")
    args["audience"] = "YW"
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("iCamp", "TENANT_SCOPED")
    changed = deepcopy(args["principal"]["payload"])
    changed["scopes"] = ["camp_reservation:write", "master_handoff:read"]
    args["principal"] = signed(keys[changed["issuer"]], changed)
    assert p.evaluate_policy345(**args)["allowed"] is False


def test_expiration_tamper_replay_duplicate_pins_and_invalid_credentials():
    args, keys = request("devilndove", "USER_SCOPED")
    args["now_ms"] = NOW + 30_000
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("devilndove", "USER_SCOPED")
    args["previously_seen_sessions"] = {"Session00000001"}
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("devilndove", "USER_SCOPED")
    args["principal"]["payload"]["role"] = "company_operator"
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("devilndove", "USER_SCOPED")
    args["trusted_issuer_pins"]["YW"] = args["trusted_issuer_pins"]["iCamp"]
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("devilndove", "USER_SCOPED")
    args["principal"] = {"payload": args["principal"]["payload"]}
    assert p.evaluate_policy345(**args)["allowed"] is False


@pytest.mark.parametrize("app", p.ORDER)
def test_three_independent_master_votes_only_permit_readonly_handoff(app):
    args, keys = request(app, "MASTER_GOVERNANCE")
    assert p.evaluate_policy345(**args)["allowed"] is False
    args["master_votes"] = votes_for(args, keys)
    outcome = p.evaluate_policy345(**args)
    assert outcome["allowed"] is True, outcome
    assert outcome["activationAuthorized"] is False
    assert outcome["closureAuthorized"] is False
    assert outcome["physicalReceiverCurrentlyOff"] is False
    assert outcome["crossAppConnectivityVerified"] is False
    args["action"] = "write"
    assert p.evaluate_policy345(**args)["allowed"] is False


def test_wrong_master_veto_attestation_revocation_and_expiry_block():
    args, keys = request("rosevear-comms-hub", "MASTER_GOVERNANCE")
    args["master_votes"] = votes_for(args, keys)
    del args["master_votes"]["rosevear-ai-hub"]
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("rosevear-comms-hub", "MASTER_GOVERNANCE")
    args["master_votes"] = votes_for(args, keys)
    changed = deepcopy(args["master_votes"]["rosevear-ai-hub"]["payload"])
    changed["connection"] = "CONNECTED"
    args["master_votes"]["rosevear-ai-hub"] = signed(keys["rosevear-ai-hub"], changed)
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, keys = request("rosevear-comms-hub", "MASTER_GOVERNANCE")
    args["master_votes"] = votes_for(args, keys)
    changed = deepcopy(args["master_votes"]["ai-data-platform"]["payload"])
    changed["expiresAtMs"] = NOW
    args["master_votes"]["ai-data-platform"] = signed(keys["ai-data-platform"], changed)
    assert p.evaluate_policy345(**args)["allowed"] is False


def test_t5_denied_even_to_signed_owner_or_full_master_quorum():
    args, keys = request("rosevear-ai-hub", "MASTER_GOVERNANCE")
    args["master_votes"] = votes_for(args, keys)
    args["resource"] = resource("rosevear-ai-hub", "ORIGINAL_HOST_OWNER_CEREMONY")
    assert p.evaluate_policy345(**args)["allowed"] is False
    assert "T5" in p.evaluate_policy345(**args)["reason"]
    args["principal"] = None
    assert p.evaluate_policy345(**args)["allowed"] is False


def test_server_resource_metadata_cannot_be_client_self_declaration():
    args, _keys = request("YW", "TENANT_SCOPED")
    args["resource"]["unknownExtraField"] = "client-override"
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, _keys = request("YW", "TENANT_SCOPED")
    args["resource"]["classification"] = "PUBLIC_READ"
    assert p.evaluate_policy345(**args)["allowed"] is False
    args, _keys = request("YW", "TENANT_SCOPED")
    args["resource"]["tenantId"] = None
    assert p.evaluate_policy345(**args)["allowed"] is False
