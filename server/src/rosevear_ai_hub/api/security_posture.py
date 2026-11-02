"""Build 225: owner-only passive access/network configuration review."""

from datetime import UTC, datetime
from ipaddress import ip_address
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import AuditEvent, HubSession, User

router = APIRouter(prefix="/api/v1/system/security-posture", tags=["security-posture"])


def _loopback(host: str) -> bool:
    if host.lower() == "localhost":
        return True
    try:
        return ip_address(host).is_loopback
    except ValueError:
        return False


@router.get("")
def security_posture(
    _owner: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> dict:
    """Review local configuration and aggregate database metadata; no network probes."""
    settings = get_settings()
    roles = dict(db.execute(select(User.role, func.count()).group_by(User.role)).all())
    enabled = dict(
        db.execute(
            select(User.role, func.count()).where(User.enabled.is_(True)).group_by(User.role)
        ).all()
    )
    now = datetime.now(UTC)
    active_sessions = int(
        db.scalar(
            select(func.count(HubSession.id)).where(
                HubSession.revoked_at.is_(None), HubSession.expires_at > now
            )
        )
        or 0
    )
    audit_count = int(db.scalar(select(func.count(AuditEvent.id))) or 0)
    last_audit = db.scalar(select(func.max(AuditEvent.created_at)))
    loopback = _loopback(settings.app_host)
    # Return categories, never hostnames, ports, origins, IPs or credential values.
    return {
        "sampled_at_utc": now.isoformat(),
        "role_counts": {
            role: {"total": int(roles.get(role, 0)), "enabled": int(enabled.get(role, 0))}
            for role in ("owner", "administrator", "household_user", "read_only")
        },
        "active_session_count": active_sessions,
        "audit_event_count": audit_count,
        "last_audit_event_utc": last_audit.isoformat() if last_audit else None,
        "api_bind_scope": "loopback" if loopback else "non_loopback_review_required",
        "cookie_secure_configured": settings.auth_cookie_secure,
        "cors_origin_count": len(settings.cors_allowed_origins),
        "cors_wildcard_configured": "*" in settings.cors_allowed_origins,
        "remote_web_enabled": settings.remote_web_enabled,
        "session_max_hours": settings.auth_session_hours,
        "reverse_proxy_tls": "not_inspected",
        "tailscale_acl": "not_inspected",
        "firewall": "not_inspected",
        "secret_values_read": False,
        "network_probes_performed": False,
        "findings": [
            *(
                ["API binds beyond loopback; confirm firewall and intended reverse proxy exposure."]
                if not loopback
                else []
            ),
            *(
                ["CORS wildcard is configured; review credentialed browser origins."]
                if "*" in settings.cors_allowed_origins
                else []
            ),
            *(
                ["No enabled owner account found; verify recovery administration."]
                if enabled.get("owner", 0) == 0
                else []
            ),
            *(
                [
                    "Secure cookie setting is off; verify HTTPS proxy and WebView boundaries."
                ]
                if not settings.auth_cookie_secure
                else []
            ),
            "Independently review Caddy TLS, Tailscale ACLs and Windows Firewall.",
        ],
    }
