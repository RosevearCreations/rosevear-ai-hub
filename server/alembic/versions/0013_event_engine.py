"""Add automation run evidence for Build 027.

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "automation_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("automation_id", sa.Integer(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("result_summary", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["automation_id"],
            ["automations.id"],
            name=op.f("fk_automation_runs_automation_id_automations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_automation_runs")),
    )
    op.create_index(
        op.f("ix_automation_runs_automation_id"),
        "automation_runs",
        ["automation_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_automation_runs_started_at"),
        "automation_runs",
        ["started_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_automation_runs_status"),
        "automation_runs",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_automation_runs_status"), table_name="automation_runs")
    op.drop_index(op.f("ix_automation_runs_started_at"), table_name="automation_runs")
    op.drop_index(op.f("ix_automation_runs_automation_id"), table_name="automation_runs")
    op.drop_table("automation_runs")
