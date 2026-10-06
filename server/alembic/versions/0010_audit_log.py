"""Enhance audit events for Build 019 filtering and traceability.

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-06
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _result_status(result: Any) -> str:
    if isinstance(result, dict):
        ok = result.get("ok")
        if ok is True:
            return "success"
        if ok is False:
            return "failure"
        value = result.get("status") or result.get("outcome")
        if isinstance(value, str) and value:
            return value[:32]
    return "unknown"


def upgrade() -> None:
    with op.batch_alter_table("audit_events") as batch:
        batch.add_column(sa.Column("tool_key", sa.String(length=160), nullable=True))
        batch.add_column(sa.Column("risk_level", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("confirmation_id", sa.String(length=36), nullable=True))
        batch.add_column(sa.Column("result_status", sa.String(length=32), nullable=True))
        batch.create_index("ix_audit_events_tool_key", ["tool_key"], unique=False)
        batch.create_index(
            "ix_audit_events_confirmation_id",
            ["confirmation_id"],
            unique=False,
        )
        batch.create_index(
            "ix_audit_events_result_status",
            ["result_status"],
            unique=False,
        )

    bind = op.get_bind()
    metadata = sa.MetaData()
    audit_events = sa.Table("audit_events", metadata, autoload_with=bind)

    rows = bind.execute(
        sa.select(
            audit_events.c.id,
            audit_events.c.object_type,
            audit_events.c.object_id,
            audit_events.c.sanitized_arguments,
            audit_events.c.result,
        )
    ).mappings()

    for row in rows:
        arguments = row["sanitized_arguments"]
        result = row["result"]

        tool_key = None
        if row["object_type"] == "tool" and row["object_id"]:
            tool_key = row["object_id"]
        elif isinstance(arguments, dict) and isinstance(arguments.get("tool_key"), str):
            tool_key = arguments["tool_key"]

        risk_level = None
        if isinstance(result, dict) and isinstance(result.get("risk_level"), int):
            risk_level = result["risk_level"]

        confirmation_id = None
        if row["object_type"] == "confirmation" and row["object_id"]:
            confirmation_id = row["object_id"]
        elif isinstance(arguments, dict) and isinstance(arguments.get("confirmation_id"), str):
            confirmation_id = arguments["confirmation_id"]

        bind.execute(
            audit_events.update()
            .where(audit_events.c.id == row["id"])
            .values(
                tool_key=tool_key,
                risk_level=risk_level,
                confirmation_id=confirmation_id,
                result_status=_result_status(result),
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("audit_events") as batch:
        batch.drop_index("ix_audit_events_result_status")
        batch.drop_index("ix_audit_events_confirmation_id")
        batch.drop_index("ix_audit_events_tool_key")
        batch.drop_column("result_status")
        batch.drop_column("confirmation_id")
        batch.drop_column("risk_level")
        batch.drop_column("tool_key")
