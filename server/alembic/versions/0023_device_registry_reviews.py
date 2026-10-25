"""Build 139: standalone source-aware device annotation and match review tables.

Revision ID: 0023
Revises: 0022
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023"
down_revision: str | None = "0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "device_registry_annotations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(24), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("alias", sa.String(100), nullable=False, server_default=""),
        sa.Column("room_label", sa.String(100), nullable=False, server_default=""),
        sa.Column("disposition", sa.String(32), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "reviewed_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
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
            "source IN ('ha_device','ha_entity','camera','mqtt')", name="ck_registry_source"
        ),
        sa.CheckConstraint(
            "disposition IN ('reviewed','needs_investigation','unsupported')",
            name="ck_registry_disposition",
        ),
    )
    op.create_table(
        "device_registry_match_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("left_source", sa.String(24), nullable=False),
        sa.Column("left_id", sa.String(255), nullable=False),
        sa.Column("right_source", sa.String(24), nullable=False),
        sa.Column("right_id", sa.String(255), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "reviewed_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.UniqueConstraint("left_source", "left_id", "right_source", "right_id"),
        sa.CheckConstraint(
            "decision IN ('possible_match','distinct','investigate')",
            name="ck_registry_match_decision",
        ),
    )


def downgrade() -> None:
    op.drop_table("device_registry_match_reviews")
    op.drop_table("device_registry_annotations")
