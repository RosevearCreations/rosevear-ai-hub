"""Build 375 camera event source custody and privacy-safe reliability receipts.

Revision ID: 0036
Revises: 0035
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0036"
down_revision: str | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "camera_event_bindings375",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "camera_id", sa.Integer(),
            sa.ForeignKey("cameras.id", ondelete="RESTRICT"),
            unique=True, nullable=False,
        ),
        sa.Column("frigate_name", sa.String(96), nullable=False, unique=True),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "reviewed_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "camera_reliability_captures375",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("frigate_state", sa.String(64), nullable=False),
        sa.Column("transport_online", sa.Boolean(), nullable=False),
        sa.Column("event_read_available", sa.Boolean(), nullable=False),
        sa.Column("registered_count", sa.Integer(), nullable=False),
        sa.Column("event_count", sa.Integer(), nullable=False),
        sa.Column("invalid_events", sa.Integer(), nullable=False),
        sa.Column("metadata_digest", sa.String(64), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("camera_reliability_captures375")
    op.drop_table("camera_event_bindings375")
