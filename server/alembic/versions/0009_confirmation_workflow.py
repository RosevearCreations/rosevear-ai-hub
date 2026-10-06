"""Add persistent confirmation workflow.

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "confirmation_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("decided_by_user_id", sa.Integer(), nullable=True),
        sa.Column("tool_id", sa.Integer(), nullable=False),
        sa.Column("tool_key", sa.String(length=160), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False),
        sa.Column("arguments_json", sa.JSON(), nullable=False),
        sa.Column("arguments_hash", sa.String(length=64), nullable=False),
        sa.Column("preview_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["requested_by_user_id"],
            ["users.id"],
            name=op.f("fk_confirmation_requests_requested_by_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["decided_by_user_id"],
            ["users.id"],
            name=op.f("fk_confirmation_requests_decided_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["tool_id"],
            ["tools.id"],
            name=op.f("fk_confirmation_requests_tool_id_tools"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_confirmation_requests")),
    )
    op.create_index(
        op.f("ix_confirmation_requests_requested_by_user_id"),
        "confirmation_requests",
        ["requested_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_confirmation_requests_tool_id"),
        "confirmation_requests",
        ["tool_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_confirmation_requests_tool_key"),
        "confirmation_requests",
        ["tool_key"],
        unique=False,
    )
    op.create_index(
        op.f("ix_confirmation_requests_status"),
        "confirmation_requests",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_confirmation_requests_expires_at"),
        "confirmation_requests",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_confirmation_requests_expires_at"), table_name="confirmation_requests")
    op.drop_index(op.f("ix_confirmation_requests_status"), table_name="confirmation_requests")
    op.drop_index(op.f("ix_confirmation_requests_tool_key"), table_name="confirmation_requests")
    op.drop_index(op.f("ix_confirmation_requests_tool_id"), table_name="confirmation_requests")
    op.drop_index(
        op.f("ix_confirmation_requests_requested_by_user_id"),
        table_name="confirmation_requests",
    )
    op.drop_table("confirmation_requests")
