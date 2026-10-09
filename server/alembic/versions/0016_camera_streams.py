"""Add encrypted camera stream transport configuration for Build 032.

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "camera_streams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("camera_id", sa.Integer(), nullable=False),
        sa.Column("stream_name", sa.String(length=160), nullable=False),
        sa.Column("source_scheme", sa.String(length=16), nullable=False),
        sa.Column("source_host", sa.String(length=255), nullable=False),
        sa.Column("source_port", sa.Integer(), nullable=False),
        sa.Column("credentials_present", sa.Boolean(), nullable=False),
        sa.Column("source_ciphertext", sa.Text(), nullable=False),
        sa.Column("key_fingerprint", sa.String(length=16), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_probe_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_probe_status", sa.String(length=32), nullable=True),
        sa.Column("last_error", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["camera_id"],
            ["cameras.id"],
            name=op.f("fk_camera_streams_camera_id_cameras"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_camera_streams")),
        sa.UniqueConstraint("camera_id", name=op.f("uq_camera_streams_camera_id")),
        sa.UniqueConstraint("stream_name", name=op.f("uq_camera_streams_stream_name")),
    )
    op.create_index(op.f("ix_camera_streams_enabled"), "camera_streams", ["enabled"], unique=False)
    op.create_index(
        op.f("ix_camera_streams_last_probe_status"),
        "camera_streams",
        ["last_probe_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_camera_streams_last_probe_status"), table_name="camera_streams")
    op.drop_index(op.f("ix_camera_streams_enabled"), table_name="camera_streams")
    op.drop_table("camera_streams")
