"""Build 378: local-only household grocery and pantry with audited approvals.

Revision ID: 0039
Revises: 0038
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0039"
down_revision: str | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "grocery_items378",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("canonical_name", sa.String(120), nullable=False),
        sa.Column("unit", sa.String(16), nullable=False),
        sa.Column("wanted_qty", sa.Float(), nullable=False),
        sa.Column("on_hand_qty", sa.Float(), nullable=False),
        sa.Column("min_on_hand_qty", sa.Float(), nullable=False),
        sa.Column("recurrence_days", sa.Integer(), nullable=True),
        sa.Column("expires_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pickup_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_picked_up_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("price_note", sa.String(100), nullable=False),
        sa.Column("note", sa.String(250), nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column(
            "approved_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "updated_by_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
    )
    op.create_index("ix_grocery_items378_canonical_name", "grocery_items378", ["canonical_name"])
    op.create_table(
        "grocery_events378",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "item_id", sa.Integer(),
            sa.ForeignKey("grocery_items378.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "actor_user_id", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("item_revision", sa.Integer(), nullable=False),
        sa.Column("related_item_id", sa.Integer(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_grocery_events378_item_id", "grocery_events378", ["item_id"])


def downgrade() -> None:
    op.drop_index("ix_grocery_events378_item_id", table_name="grocery_events378")
    op.drop_table("grocery_events378")
    op.drop_index("ix_grocery_items378_canonical_name", table_name="grocery_items378")
    op.drop_table("grocery_items378")
