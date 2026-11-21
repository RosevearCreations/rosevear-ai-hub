"""Build 040: fail-closed business write authorization boundary.

This module deliberately does not provide a remote transport. A downstream
write can only be introduced after its exact provider contract is reviewed.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


class BusinessWriteDenied(PermissionError):
    """No upstream request may occur when this guard rejects a command."""


@dataclass(frozen=True)
class ApprovedBusinessWrite:
    connector_key: str
    operation: str
    arguments_hash: str
    confirmation_id: str


# No write contract is enabled until its upstream route, authentication,
# authorization, idempotency and test evidence have been reviewed.
ENABLED_WRITE_OPERATIONS: frozenset[tuple[str, str]] = frozenset()


def authorize_business_write(
    *,
    connector_key: str,
    operation: str,
    arguments_hash: str,
    confirmation: Mapping[str, Any] | None,
    actor_role: str,
) -> ApprovedBusinessWrite:
    """Validate an explicit, matching, consumed approval before dispatch.

    This is defense-in-depth, not a substitute for the confirmation store's
    atomic single-use consumption; callers must consume approval in a
    transaction BEFORE invoking any future remote writer.
    """
    if actor_role not in {"owner", "administrator"}:
        raise BusinessWriteDenied("Business writes require an owner or administrator.")
    if (connector_key, operation) not in ENABLED_WRITE_OPERATIONS:
        raise BusinessWriteDenied("Business write operation is not enabled.")
    if not confirmation or confirmation.get("status") != "consumed":
        raise BusinessWriteDenied("A consumed, single-use confirmation is required.")
    if confirmation.get("tool_key") != f"business.{connector_key}.{operation}":
        raise BusinessWriteDenied("Confirmation is for a different operation.")
    if not arguments_hash or confirmation.get("arguments_hash") != arguments_hash:
        raise BusinessWriteDenied("Confirmation does not match exact arguments.")
    if not confirmation.get("id") or not confirmation.get("consumed_at"):
        raise BusinessWriteDenied("Confirmation has no consumption evidence.")
    return ApprovedBusinessWrite(
        connector_key=connector_key,
        operation=operation,
        arguments_hash=arguments_hash,
        confirmation_id=str(confirmation["id"]),
    )
