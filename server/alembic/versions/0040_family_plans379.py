"""Build 379: private family calendar, chores and in-app reminder receipt.

Revision ID: 0040
Revises: 0039
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0040"
down_revision: str | None = "0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "family_plans379",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(140), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("detail", sa.String(300), nullable=False),
        sa.Column("supplies", sa.String(200), nullable=False),
        sa.Column("visibility", sa.String(16), nullable=False),
        sa.Column("local_due", sa.String(16), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("due_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recurrence_days", sa.Integer(), nullable=True),
        sa.Column("reminder_minutes", sa.Integer(), nullable=True),
        sa.Column("reminder_ack_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reminder_ack_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("completion_count", sa.Integer(), nullable=False),
        sa.Column("last_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "creator_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "assignee_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column(
            "updated_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.current_timestamp(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.current_timestamp(), nullable=False
        ),
    )
    op.create_index("ix_family_plans379_due", "family_plans379", ["due_at_utc"])
    op.create_table(
        "family_plan_events379",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "plan_id", sa.Integer(),
            sa.ForeignKey("family_plans379.id", ondelete="RESTRICT"),
            nullable=False
        ),
        sa.Column(
            "actor_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_family_plan_events379_plan_id", "family_plan_events379", ["plan_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_family_plan_events379_plan_id", table_name="family_plan_events379")
    op.drop_table("family_plan_events379")
    op.drop_index("ix_family_plans379_due", table_name="family_plans379")
    op.drop_table("family_plans379")
