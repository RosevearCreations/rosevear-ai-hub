"""Build 369 owner-only Home Assistant inventory reconciliation.

Revision ID: 0031
Revises: 0030
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0031"
down_revision: str | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "home_inventory_snapshots369",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "captured_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("area_count", sa.Integer(), nullable=False),
        sa.Column("device_count", sa.Integer(), nullable=False),
        sa.Column("entity_count", sa.Integer(), nullable=False),
        sa.Column("mqtt_reference_count", sa.Integer(), nullable=False),
    )
    op.create_table(
        "home_inventory_identities369",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("area_id", sa.String(120), nullable=False, server_default=""),
        sa.Column("related_device_id", sa.String(255), nullable=False, server_default=""),
        sa.Column("presence", sa.String(32), nullable=False),
        sa.Column("claim", sa.String(16), nullable=False, server_default="unclaimed"),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_source_seen_at", sa.DateTime(timezone=True)),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_snapshot_id", sa.Integer(),
            sa.ForeignKey("home_inventory_snapshots369.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.UniqueConstraint("source", "source_id", name="uq_home_inventory_identity369"),
    )
    op.create_table(
        "home_inventory_changes369",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "snapshot_id", sa.Integer(),
            sa.ForeignKey("home_inventory_snapshots369.id", ondelete="RESTRICT"), nullable=False,
        ),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("before_value", sa.String(120), nullable=False, server_default=""),
        sa.Column("after_value", sa.String(120), nullable=False, server_default=""),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("home_inventory_changes369")
    op.drop_table("home_inventory_identities369")
    op.drop_table("home_inventory_snapshots369")
