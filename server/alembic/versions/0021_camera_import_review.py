"""Build 076: identity-bound, expiring camera-import review receipts.

Revision ID: 0021
Revises: 0020
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "camera_import_reviews",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column(
            "actor_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("inventory_snapshot", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("imported_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
    )
    op.create_index(
        "ix_camera_import_reviews_actor_user_id",
        "camera_import_reviews",
        ["actor_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_camera_import_reviews_actor_user_id", table_name="camera_import_reviews")
    op.drop_table("camera_import_reviews")
