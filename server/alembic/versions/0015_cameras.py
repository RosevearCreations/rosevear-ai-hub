"""Add persistent camera registry for Build 031.

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cameras",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("endpoint_uuid", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("service_url", sa.String(length=1024), nullable=False),
        sa.Column("discovery_source", sa.String(length=64), nullable=False),
        sa.Column("onvif_types", sa.JSON(), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cameras")),
        sa.UniqueConstraint("endpoint_uuid", name=op.f("uq_cameras_endpoint_uuid")),
    )
    op.create_index(op.f("ix_cameras_enabled"), "cameras", ["enabled"], unique=False)
    op.create_index(op.f("ix_cameras_host"), "cameras", ["host"], unique=False)
    op.create_index(op.f("ix_cameras_last_seen_at"), "cameras", ["last_seen_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cameras_last_seen_at"), table_name="cameras")
    op.drop_index(op.f("ix_cameras_host"), table_name="cameras")
    op.drop_index(op.f("ix_cameras_enabled"), table_name="cameras")
    op.drop_table("cameras")
