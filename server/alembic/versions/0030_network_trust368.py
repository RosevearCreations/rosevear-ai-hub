"""Build 368: approved private network scopes and device claim history.

Revision ID: 0030
Revises: 0029
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0030"
down_revision: str | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "network_scopes368",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cidr", sa.String(18), nullable=False, unique=True),
        sa.Column("label", sa.String(80), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("nonce_digest", sa.String(64), nullable=False, unique=True),
        sa.Column("signature_digest", sa.String(64), nullable=False),
        sa.Column(
            "approved_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_table(
        "network_devices368",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(24), nullable=False),
        sa.Column("source_id", sa.String(120), nullable=False),
        sa.Column("decision", sa.String(24), nullable=False, server_default="needs_review"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            nullable=False, server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("source", "source_id", name="uq_network_devices368_source"),
    )
    op.create_table(
        "network_observations368",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "device_id", sa.Integer(),
            sa.ForeignKey("network_devices368.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column(
            "scope_id", sa.Integer(),
            sa.ForeignKey("network_scopes368.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("ip", sa.String(15), nullable=False),
        sa.Column("lease_ref", sa.String(40), nullable=False, server_default=""),
        sa.Column(
            "observed_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_network_observations368_device_id", "network_observations368", ["device_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_network_observations368_device_id", table_name="network_observations368")
    op.drop_table("network_observations368")
    op.drop_table("network_devices368")
    op.drop_table("network_scopes368")
