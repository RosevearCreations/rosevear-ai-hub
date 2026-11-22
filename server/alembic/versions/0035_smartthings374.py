"""Build 374 SmartThings local custody and metadata-only capture.

Revision ID: 0035
Revises: 0034
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0035"
down_revision: str | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "smartthings_reviews374",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(128), nullable=False, unique=True),
        sa.Column("decision", sa.String(16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "reviewed_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "smartthings_captures374",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("device_count", sa.Integer(), nullable=False),
        sa.Column("location_count", sa.Integer(), nullable=False),
        sa.Column("room_count", sa.Integer(), nullable=False),
        sa.Column("digest_sha256", sa.String(64), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("smartthings_captures374")
    op.drop_table("smartthings_reviews374")
