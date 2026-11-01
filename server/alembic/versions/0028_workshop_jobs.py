"""Build 218: local workshop jobs, material records and private photos.

Revision ID: 0028
Revises: 0027
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0028"
down_revision: str | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workshop_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column(
            "equipment_id",
            sa.Integer(),
            sa.ForeignKey("workshop_equipment.id", ondelete="SET NULL"),
        ),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actual_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("materials_json", sa.JSON(), nullable=False),
        sa.Column("notes", sa.String(2000), nullable=False, server_default=""),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()),
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
    op.create_table(
        "workshop_job_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("workshop_jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mime_type", sa.String(24), nullable=False),
        sa.Column("photo_bytes", sa.LargeBinary(), nullable=False),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_workshop_job_photos_job_id", "workshop_job_photos", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_workshop_job_photos_job_id", table_name="workshop_job_photos")
    op.drop_table("workshop_job_photos")
    op.drop_table("workshop_jobs")
