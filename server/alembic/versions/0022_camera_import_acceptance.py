"""Build 077: append-only owner camera import acceptance evidence.

Revision ID: 0022
Revises: 0021
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "camera_import_acceptance_evidence",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "actor_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("inventory_snapshot", sa.String(64), nullable=False),
        sa.Column("migration_revision", sa.String(32), nullable=False),
        sa.Column("camera_count", sa.Integer(), nullable=False),
        sa.Column("imported_count", sa.Integer(), nullable=False),
        sa.Column("backup_drill_confirmed", sa.Boolean(), nullable=False),
        sa.Column("ha_connected_confirmed", sa.Boolean(), nullable=False),
        sa.Column("mqtt_connected_confirmed", sa.Boolean(), nullable=False),
        sa.Column("camera_status_confirmed", sa.Boolean(), nullable=False),
        sa.Column("decision", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.CheckConstraint(
            "decision IN ('accepted', 'hold')",
            name="ck_camera_import_acceptance_decision",
        ),
    )
    op.create_index(
        "ix_camera_import_acceptance_actor_id",
        "camera_import_acceptance_evidence",
        ["actor_user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_camera_import_acceptance_actor_id",
        table_name="camera_import_acceptance_evidence",
    )
    op.drop_table("camera_import_acceptance_evidence")
