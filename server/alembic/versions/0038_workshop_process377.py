"""Build 377: append-only manually reported workshop process observations.

Revision ID: 0038
Revises: 0037
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0038"
down_revision: str | None = "0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workshop_process_readings377",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "equipment_id", sa.Integer(),
            sa.ForeignKey("workshop_equipment.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "recorded_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("operating_state", sa.String(32), nullable=False),
        sa.Column("progress_percent", sa.Float(), nullable=True),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("ventilation", sa.String(24), nullable=False),
        sa.Column("note", sa.String(300), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_workshop_process_readings377_equipment_id",
        "workshop_process_readings377",
        ["equipment_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_workshop_process_readings377_equipment_id",
        table_name="workshop_process_readings377",
    )
    op.drop_table("workshop_process_readings377")
