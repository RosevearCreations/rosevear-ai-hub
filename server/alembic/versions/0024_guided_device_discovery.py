"""Build 140: owner-reviewed discovery decisions without changing provider registries.

Revision ID: 0024
Revises: 0023
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: str | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "device_discovery_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(24), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "reviewed_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("source", "source_id"),
        sa.CheckConstraint(
            "source IN ('ha_device','ha_entity','camera_candidate','mqtt')",
            name="ck_discovery_source",
        ),
        sa.CheckConstraint(
            "decision IN ('approved_for_followup','rejected','unsupported','investigate')",
            name="ck_discovery_decision",
        ),
    )


def downgrade() -> None:
    op.drop_table("device_discovery_reviews")
