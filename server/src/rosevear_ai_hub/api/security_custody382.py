"""Build 382 — owner-only zero-trust session containment and bounded security custody.

No credential value, raw session token, TLS key or private network address is
returned. This module never updates a certificate, MFA, router or backup.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import (
    SESSION_COOKIE_NAME,
    _token_hash,
    require_roles,
    verify_password,
)
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import HubSession, User

router = APIRouter(prefix="/api/v1/system/security-custody-382", tags=["security382"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
CookieToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)]


class RevokeOtherSessions382(BaseModel):
    model_config = ConfigDict(extra="forbid")

    password: str = Field(min_length=12, max_length=256)
    confirmation: Literal["REVOKE_MY_OTHER_SESSIONS"]


def _other_sessions(db: Session, owner: User, token_hash: str, now: datetime) -> int:
    return int(
        db.scalar(
            select(func.count(HubSession.id)).where(
                HubSession.user_id == owner.id,
                HubSession.token_hash != token_hash,
                HubSession.revoked_at.is_(None),
                HubSession.expires_at > now,
            )
        )
        or 0
    )


@router.get("/posture")
def security_custody_posture382(
    owner: Owner,
    db: DB,
    response: Response,
    session_token: CookieToken = None,
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(UTC)
    token_hash = _token_hash(session_token) if session_token else ""
    settings = get_settings()
    return {
        "schema": "rosevear.hub.security-custody382.v1",
        "source": "LOCAL_AUTH_METADATA_ONLY",
        "checkedAtUtc": now.isoformat(),
        "activeOtherOwnerSessions": _other_sessions(db, owner, token_hash, now),
        "otherAccountsUnaffected": True,
        "currentSessionPreservedOnRevocation": True,
        "sessionMaxHours": settings.auth_session_hours,
        "cookieSecureConfigured": settings.auth_cookie_secure,
        "mfaEnforced": False,
        "mfaEnrollmentAvailable": False,
        "vaultCredentialIntakeEnabled": False,
        "tlsCertificateActuallyVerified": False,
        "secretKeyRotationActuallyVerified": False,
        "offMachineIndependentRestoreVerified": False,
        "retentionAutoPruneEnabled": False,
        "backupRetentionTargetDays": 180,
        "auditRetentionTargetDays": 180,
        "sbom": "LOCAL_REPRODUCIBLE_SOURCE_MANIFEST_REVIEW_REQUIRED",
        "verifiedLocalOperations": [
            "Argon2 password verification",
            "SHA-256 session token hashes",
            "server-side owner RBAC",
            "audited owner-only explicit revocation of other owner sessions",
            "existing Build047/050 encrypted backup restore rehearsal",
        ],
        "fieldAcceptance": "HOLD",
        "secretValuesRead": False,
        "externalRequests": 0,
        "firewallChanges": 0,
        "tlsKeyChanges": 0,
        "backupDeletions": 0,
    }


@router.post("/revoke-other-sessions")
def revoke_owner_other_sessions382(
    payload: RevokeOtherSessions382,
    owner: Owner,
    db: DB,
    response: Response,
    session_token: CookieToken = None,
) -> dict:
    """Fresh owner password and exact typed consent; preserve current session."""
    response.headers["Cache-Control"] = "no-store"
    if not session_token:
        raise HTTPException(status_code=401, detail="Authenticated owner session required.")
    if not verify_password(owner.password_hash, payload.password):
        raise HTTPException(status_code=403, detail="Owner reauthentication failed.")
    now = datetime.now(UTC)
    current_hash = _token_hash(session_token)
    current = db.scalar(
        select(HubSession.id).where(
            HubSession.user_id == owner.id,
            HubSession.token_hash == current_hash,
            HubSession.revoked_at.is_(None),
            HubSession.expires_at > now,
        )
    )
    if current is None:
        raise HTTPException(status_code=401, detail="Current owner session is not active.")

    before = _other_sessions(db, owner, current_hash, now)
    db.execute(
        update(HubSession)
        .where(
            HubSession.user_id == owner.id,
            HubSession.token_hash != current_hash,
            HubSession.revoked_at.is_(None),
            HubSession.expires_at > now,
        )
        .values(revoked_at=now)
    )
    record_audit_event(
        db,
        actor_user_id=owner.id,
        event_type="auth.session.contained382",
        object_type="authentication",
        object_id=str(owner.id),
        action="revoke_other_owner_sessions",
        result={
            "ok": True,
            "revoked_count": before,
            "current_session_preserved": True,
            "other_accounts_unaffected": True,
        },
    )
    db.commit()
    return {
        "schema": "rosevear.hub.security-custody382.session-containment.v1",
        "revokedCount": before,
        "currentSessionPreserved": True,
        "otherAccountsUnaffected": True,
        "credentialValuesStored": False,
        "auditMetadataOnly": True,
        "completedAtUtc": now.isoformat(),
    }
