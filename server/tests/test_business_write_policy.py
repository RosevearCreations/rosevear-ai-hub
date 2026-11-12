"""Fail-closed coverage for the Build 040 write authorization boundary."""
import pytest

from rosevear_ai_hub.business_write_policy import (
    ENABLED_WRITE_OPERATIONS,
    BusinessWriteDenied,
    authorize_business_write,
)


def _authorize(**overrides):
    request = dict(
        connector_key="yardworkers",
        operation="jobs.update_status",
        arguments_hash="a" * 64,
        confirmation={
            "id": "approval-1",
            "tool_key": "business.yardworkers.jobs.update_status",
            "arguments_hash": "a" * 64,
            "status": "consumed",
            "consumed_at": "2026-10-10T12:00:00Z",
        },
        actor_role="owner",
    )
    request.update(overrides)
    return authorize_business_write(**request)


def test_no_business_writes_are_enabled_without_review():
    assert not ENABLED_WRITE_OPERATIONS
    with pytest.raises(BusinessWriteDenied, match="not enabled"):
        _authorize()


@pytest.mark.parametrize("role", ["household_user", "read_only", "anonymous"])
def test_non_administrators_cannot_write(role):
    with pytest.raises(BusinessWriteDenied, match="owner or administrator"):
        _authorize(actor_role=role)


def test_unknown_target_cannot_write():
    with pytest.raises(BusinessWriteDenied):
        _authorize(connector_key="unregistered")


def test_explicit_confirmation_alone_does_not_override_disabled_contract():
    with pytest.raises(BusinessWriteDenied, match="not enabled"):
        _authorize(confirmation={"status": "consumed"})
