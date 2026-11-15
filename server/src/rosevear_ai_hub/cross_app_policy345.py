"""QL-454 six-tier deny-by-default seven-application access policy.

Only issuer-signed principal assertions and trusted server-resolved resource
metadata may be evaluated. This source library is not a transport, credential
issuer, authorization endpoint or physical original-host ceremony.
"""

from typing import Any

from rosevear_ai_hub.cross_app_security344 import ORDER, TIERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native

SCHEMA = "rosevear.cross-app.principal-assertion345.v1"
VOTE_SCHEMA = "rosevear.cross-app.master-policy-vote345.v1"
MAX_ASSERTION_AGE_MS = 60_000
MAX_VOTE_AGE_MS = 30_000
MASTERS = ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
ROLE_BY_TIER = {
    "USER_SCOPED": "end_user",
    "TENANT_SCOPED": "tenant_staff",
    "OPERATOR_SCOPED": "company_operator",
    "MASTER_GOVERNANCE": "master_governor",
}
ACTIONS = {
    "PUBLIC_READ": ("read",),
    "USER_SCOPED": ("read", "write"),
    "TENANT_SCOPED": ("read", "write"),
    "OPERATOR_SCOPED": ("read", "write"),
    "MASTER_GOVERNANCE": ("read",),
    "ORIGINAL_HOST_OWNER_CEREMONY": (),
}
# Abstract policy classes; app APIs must map these to trusted DB/storage rows
# and enforce database RLS before integrating this source-only evaluator.
RESOURCE_MATRIX = {
    "ai-data-platform": {
        "public_status": "PUBLIC_READ",
        "user_profile": "USER_SCOPED",
        "tenant_metrics": "TENANT_SCOPED",
        "operations_audit": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
    "rosevear-ai-hub": {
        "public_status": "PUBLIC_READ",
        "user_profile": "USER_SCOPED",
        "local_workspace": "TENANT_SCOPED",
        "operations_audit": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
        "original_host_receiver": "ORIGINAL_HOST_OWNER_CEREMONY",
    },
    "rosevear-comms-hub": {
        "public_status": "PUBLIC_READ",
        "user_profile": "USER_SCOPED",
        "brand_inbox": "TENANT_SCOPED",
        "operator_task": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
    "iCamp": {
        "camp_public_site": "PUBLIC_READ",
        "camper_profile": "USER_SCOPED",
        "camp_reservation": "TENANT_SCOPED",
        "camp_operator_ledger": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
    "YW": {
        "yard_public_service": "PUBLIC_READ",
        "worker_profile": "USER_SCOPED",
        "yard_job": "TENANT_SCOPED",
        "yard_payroll": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
    "devilndove": {
        "store_public_product": "PUBLIC_READ",
        "customer_profile": "USER_SCOPED",
        "store_order": "TENANT_SCOPED",
        "store_financial_ledger": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
    "rosiedazzlers": {
        "detail_public_package": "PUBLIC_READ",
        "customer_profile": "USER_SCOPED",
        "detail_booking": "TENANT_SCOPED",
        "detail_financial_ledger": "OPERATOR_SCOPED",
        "master_handoff": "MASTER_GOVERNANCE",
    },
}
ASSERTION_FIELDS = {
    "schema",
    "issuer",
    "audience",
    "subjectId",
    "role",
    "tier",
    "tenantId",
    "companyId",
    "sessionId",
    "scopes",
    "issuedAtMs",
    "expiresAtMs",
}
RESOURCE_FIELDS = {
    "app",
    "kind",
    "resourceId",
    "ownerId",
    "tenantId",
    "companyId",
    "classification",
}
VOTE_FIELDS = {
    "schema",
    "masterId",
    "assertionDigest",
    "resourceDigest",
    "policyDigest",
    "decision",
    "incidentStatus",
    "connection",
    "activationAuthorized",
    "closureAuthorized",
    "issuedAtMs",
    "expiresAtMs",
}
POLICY_DIGEST = _digest(
    {
        "schema": SCHEMA,
        "voteSchema": VOTE_SCHEMA,
        "order": ORDER,
        "tiers": TIERS,
        "resources": RESOURCE_MATRIX,
        "roles": ROLE_BY_TIER,
        "actions": ACTIONS,
    }
)


def _name(value: Any) -> bool:
    return (
        type(value) is str
        and 3 <= len(value) <= 96
        and value.isascii()
        and all(c.isalnum() or c in "_.-" for c in value)
    )


def deny345(reason: str) -> dict[str, Any]:
    return {
        "allowed": False,
        "policyVersion": 345,
        "policyDigest": POLICY_DIGEST,
        "reason": reason,
        "connection": "HOLD",
        "messageDelivered": False,
        "crossAppConnectivityVerified": False,
        "incidentStatus": "OPEN",
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
    }


def _valid_pins(pins: Any) -> bool:
    return (
        isinstance(pins, dict)
        and set(pins) == set(ORDER)
        and all(isinstance(p, tuple) and len(p) == 2 and _public_ed25519(*p) for p in pins.values())
        and len({p[0] for p in pins.values()}) == len(ORDER)
        and len({p[1] for p in pins.values()}) == len(ORDER)
    )


def _age(start: Any, expires: Any, now_ms: int, max_age: int) -> bool:
    return (
        type(start) is int
        and type(expires) is int
        and 0 <= now_ms - start <= max_age
        and start < expires <= start + max_age
        and now_ms < expires
    )


def _resource_ok(resource: Any) -> bool:
    if not isinstance(resource, dict) or set(resource) != RESOURCE_FIELDS:
        return False
    app = resource["app"]
    kind = resource["kind"]
    if not (
        type(app) is str
        and app in RESOURCE_MATRIX
        and type(kind) is str
        and kind in RESOURCE_MATRIX[app]
        and _name(resource["resourceId"])
        and resource["classification"] == RESOURCE_MATRIX[app][kind]
    ):
        return False
    tier = resource["classification"]
    scoped_fields = {
        "PUBLIC_READ": (),
        "USER_SCOPED": ("ownerId",),
        "TENANT_SCOPED": ("tenantId",),
        "OPERATOR_SCOPED": ("companyId",),
        "MASTER_GOVERNANCE": (),
        "ORIGINAL_HOST_OWNER_CEREMONY": (),
    }[tier]
    return all(
        _name(resource[k]) if k in scoped_fields else resource[k] is None
        for k in ("ownerId", "tenantId", "companyId")
    )


def evaluate_policy345(
    *,
    principal: Any,
    resource: Any,
    action: str,
    audience: str,
    now_ms: int,
    trusted_issuer_pins: dict[str, tuple[bytes, str]] | None = None,
    master_votes: dict[str, Any] | None = None,
    previously_seen_sessions: set[str] | None = None,
) -> dict[str, Any]:
    """Pure decision; caller must use app-trusted DB resource metadata, not user input.

    Pinned public keys must come from protected trust configuration, never from
    request bodies. T5 is unconditionally denied even with genuine Master votes.
    """
    if not (
        type(now_ms) is int
        and now_ms >= 0
        and type(audience) is str
        and audience in RESOURCE_MATRIX
        and type(action) is str
        and action in {"read", "write"}
        and _resource_ok(resource)
        and resource["app"] == audience
        and (
            previously_seen_sessions is None
            or (
                isinstance(previously_seen_sessions, set)
                and all(type(x) is str for x in previously_seen_sessions)
            )
        )
    ):
        return deny345("DENY_QL454_INVALID_AUDIENCE_OR_SERVER_RESOURCE")
    tier = resource["classification"]
    if tier == "ORIGINAL_HOST_OWNER_CEREMONY":
        return deny345("DENY_QL454_T5_CANNOT_BE_GRANTED_VIA_ANY_APP")
    if action not in ACTIONS[tier]:
        return deny345("DENY_QL454_ACTION_NOT_PERMITTED")
    # Invalid signed credentials cannot silently downgrade to anonymous.
    if principal is None:
        if tier != "PUBLIC_READ":
            return deny345("DENY_QL454_ANONYMOUS_PROTECTED_RESOURCE")
        return {
            **deny345("QL454_PUBLIC_READ_ONLY"),
            "allowed": True,
            "tier": tier,
            "resourceKind": resource["kind"],
            "requiresRuntimeResourceLookup": True,
        }
    if not (
        isinstance(principal, dict)
        and isinstance(principal.get("payload"), dict)
        and _valid_pins(trusted_issuer_pins)
    ):
        return deny345("DENY_QL454_UNTRUSTED_OR_UNSIGNED_PRINCIPAL")
    assertion = principal["payload"]
    issuer = assertion.get("issuer")
    if type(issuer) is not str or issuer not in ORDER:
        return deny345("DENY_QL454_UNKNOWN_ISSUER")
    assertion = _native(principal, ASSERTION_FIELDS, SCHEMA, *trusted_issuer_pins[issuer])
    if assertion is None:
        return deny345("DENY_QL454_SIGNATURE_SCHEMA_OR_ISSUER_INVALID")
    expected_issuer = "ai-data-platform" if tier == "MASTER_GOVERNANCE" else audience
    if not (
        assertion["issuer"] == expected_issuer
        and assertion["audience"] == audience
        and assertion["tier"] == tier
        and assertion["role"] == ROLE_BY_TIER.get(tier)
        and _name(assertion["subjectId"])
        and _name(assertion["sessionId"])
        and _age(
            assertion["issuedAtMs"],
            assertion["expiresAtMs"],
            now_ms,
            MAX_ASSERTION_AGE_MS,
        )
        and isinstance(assertion["scopes"], list)
        and assertion["scopes"] == [f"{resource['kind']}:{action}"]
        and (
            previously_seen_sessions is None
            or assertion["sessionId"] not in previously_seen_sessions
        )
    ):
        return deny345("DENY_QL454_AUDIENCE_TIER_ROLE_SCOPE_OR_EXPIRY")
    if tier == "USER_SCOPED":
        if not (
            resource["ownerId"] == assertion["subjectId"]
            and assertion["tenantId"] is None
            and assertion["companyId"] is None
        ):
            return deny345("DENY_QL454_USER_OWNERSHIP_MISMATCH")
    elif tier == "TENANT_SCOPED":
        if not (
            _name(assertion["tenantId"])
            and assertion["tenantId"] == resource["tenantId"]
            and assertion["companyId"] is None
        ):
            return deny345("DENY_QL454_CROSS_TENANT")
    elif tier == "OPERATOR_SCOPED":
        if not (
            _name(assertion["companyId"])
            and assertion["companyId"] == resource["companyId"]
            and assertion["tenantId"] is None
        ):
            return deny345("DENY_QL454_COMPANY_OPERATOR_MISMATCH")
    elif tier == "MASTER_GOVERNANCE":
        if assertion["tenantId"] is not None or assertion["companyId"] is not None:
            return deny345("DENY_QL454_MASTER_TENANT_IMPERSONATION")
        if not (isinstance(master_votes, dict) and set(master_votes) == set(MASTERS)):
            return deny345("DENY_QL454_MISSING_THREE_MASTER_QUORUM")
        assertion_digest = _digest(assertion)
        resource_digest = _digest(resource)
        for master in MASTERS:
            envelope = master_votes[master]
            vote = (
                _native(envelope, VOTE_FIELDS, VOTE_SCHEMA, *trusted_issuer_pins[master])
                if isinstance(envelope, dict)
                else None
            )
            if not (
                vote is not None
                and vote["masterId"] == master
                and vote["assertionDigest"] == assertion_digest
                and vote["resourceDigest"] == resource_digest
                and vote["policyDigest"] == POLICY_DIGEST
                and vote["decision"] == "READONLY_HOLD"
                and vote["incidentStatus"] == "OPEN_HOLD"
                and vote["connection"] == "HOLD"
                and vote["activationAuthorized"] is False
                and vote["closureAuthorized"] is False
                and _age(
                    vote["issuedAtMs"],
                    vote["expiresAtMs"],
                    now_ms,
                    MAX_VOTE_AGE_MS,
                )
            ):
                return deny345("DENY_QL454_MASTER_QUORUM_SIGNATURE_OR_DRIFT")
    else:
        return deny345("DENY_QL454_UNSUPPORTED_TIER")
    return {
        **deny345("QL454_SIGNED_SCOPE_PERMITTED_HISTORICAL_NO_TRANSPORT"),
        "allowed": True,
        "tier": tier,
        "resourceKind": resource["kind"],
        "subjectId": assertion["subjectId"],
        "audience": audience,
        "requiresRuntimeResourceLookup": True,
        "requiresDurableSessionReplayJournal": True,
    }
