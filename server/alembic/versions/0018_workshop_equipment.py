"""Build 057: local multi-project workshop equipment and manual safety observations.

Revision ID: 0018
Revises: 0017
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workshop_stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_key", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("hazards_json", sa.JSON(), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.UniqueConstraint("project_key", "name", name="uq_workshop_station_project_name"),
    )
    op.create_index(
        "ix_workshop_stations_project_key", "workshop_stations", ["project_key"]
    )
    op.create_table(
        "workshop_equipment",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_key", sa.String(80), nullable=False),
        sa.Column("station_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("equipment_type", sa.String(80), nullable=False),
        sa.Column("activity_type", sa.String(32), nullable=False),
        sa.Column("readiness_status", sa.String(24), nullable=False),
        sa.Column("maintenance_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_inspected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(500), nullable=False),
        sa.Column("disabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.ForeignKeyConstraint(["station_id"], ["workshop_stations.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_workshop_equipment_project_key", "workshop_equipment", ["project_key"]
    )
    op.create_index(
        "ix_workshop_equipment_station_id", "workshop_equipment", ["station_id"]
    )
    op.create_index(
        "ix_workshop_equipment_readiness_status", "workshop_equipment", ["readiness_status"]
    )
    op.create_table(
        "workshop_inspections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("equipment_id", sa.Integer(), nullable=False),
        sa.Column("review_status", sa.String(24), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("checked_by_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "checked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.ForeignKeyConstraint(["equipment_id"], ["workshop_equipment.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["checked_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_workshop_inspections_equipment_id", "workshop_inspections", ["equipment_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_workshop_inspections_equipment_id", table_name="workshop_inspections")
    op.drop_table("workshop_inspections")
    op.drop_index("ix_workshop_equipment_readiness_status", table_name="workshop_equipment")
    op.drop_index("ix_workshop_equipment_station_id", table_name="workshop_equipment")
    op.drop_index("ix_workshop_equipment_project_key", table_name="workshop_equipment")
    op.drop_table("workshop_equipment")
    op.drop_index("ix_workshop_stations_project_key", table_name="workshop_stations")
    op.drop_table("workshop_stations")
