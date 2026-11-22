"""Build 376 — owner reviewed automation dependency and simulation custody.

Revision ID: 0037
Revises: 0036
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0037"
down_revision: str | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "automation_sequences376",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("steps_json", sa.JSON(), nullable=False),
        sa.Column("cooldown_seconds", sa.Integer(), nullable=False),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("approved_hash", sa.String(64), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "automation_sequence_simulations376",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("automation_sequences376.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cause_sha256", sa.String(64), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome", sa.String(24), nullable=False),
        sa.Column("blocker_count", sa.Integer(), nullable=False),
        sa.UniqueConstraint("plan_id", "cause_sha256", name="uq_sequence376_one_cause"),
    )


def downgrade() -> None:
    op.drop_table("automation_sequence_simulations376")
    op.drop_table("automation_sequences376")
