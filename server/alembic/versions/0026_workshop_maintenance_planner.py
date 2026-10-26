"""Build 145: local workshop maintenance plans and append-only service ledger.

Revision ID: 0026
Revises: 0025
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0026"
down_revision: str | None = "0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workshop_maintenance_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "equipment_id",
            sa.Integer(),
            sa.ForeignKey("workshop_equipment.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("next_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "assigned_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("checklist_json", sa.JSON(), nullable=False),
        sa.Column("parts_refs_json", sa.JSON(), nullable=False),
        sa.Column("notes", sa.String(500), nullable=False, server_default=""),
        sa.Column("last_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_workshop_maintenance_plans_equipment_id",
        "workshop_maintenance_plans",
        ["equipment_id"],
        unique=True,
    )
    op.create_table(
        "workshop_maintenance_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("workshop_maintenance_plans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("outcome", sa.String(24), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("completed_checklist_json", sa.JSON(), nullable=False),
        sa.Column("parts_used_json", sa.JSON(), nullable=False),
        sa.Column("previous_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("schedule_updated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "recorded_by_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_workshop_maintenance_events_plan_id", "workshop_maintenance_events", ["plan_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_workshop_maintenance_events_plan_id", table_name="workshop_maintenance_events"
    )
    op.drop_table("workshop_maintenance_events")
    op.drop_index(
        "ix_workshop_maintenance_plans_equipment_id", table_name="workshop_maintenance_plans"
    )
    op.drop_table("workshop_maintenance_plans")
