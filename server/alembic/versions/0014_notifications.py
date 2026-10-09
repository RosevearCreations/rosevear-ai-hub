"""Add local notification inbox for Build 030.

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("audience", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=255), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_notifications_created_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(op.f("ix_notifications_audience"), "notifications", ["audience"], unique=False)
    op.create_index(
        op.f("ix_notifications_created_at"),
        "notifications",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_created_by_user_id"),
        "notifications",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_severity"),
        "notifications",
        ["severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_source_type"),
        "notifications",
        ["source_type"],
        unique=False,
    )

    op.create_table(
        "notification_receipts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notification_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["notification_id"],
            ["notifications.id"],
            name=op.f("fk_notification_receipts_notification_id_notifications"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notification_receipts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notification_receipts")),
        sa.UniqueConstraint(
            "notification_id",
            "user_id",
            name="uq_notification_receipts_notification_user",
        ),
    )
    op.create_index(
        op.f("ix_notification_receipts_notification_id"),
        "notification_receipts",
        ["notification_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notification_receipts_user_id"),
        "notification_receipts",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_notification_receipts_user_id"),
        table_name="notification_receipts",
    )
    op.drop_index(
        op.f("ix_notification_receipts_notification_id"),
        table_name="notification_receipts",
    )
    op.drop_table("notification_receipts")
    op.drop_index(op.f("ix_notifications_source_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_severity"), table_name="notifications")
    op.drop_index(
        op.f("ix_notifications_created_by_user_id"),
        table_name="notifications",
    )
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_audience"), table_name="notifications")
    op.drop_table("notifications")
