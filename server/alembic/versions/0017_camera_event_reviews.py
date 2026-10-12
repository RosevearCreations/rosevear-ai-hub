"""Build 054: local reviewed Frigate event metadata, never raw recordings.

Revision ID: 0017
Revises: 0016
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "camera_event_reviews",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("event_id", sa.String(length=160), nullable=False, unique=True),
        sa.Column("camera_name", sa.String(length=160), nullable=False),
        sa.Column("object_label", sa.String(length=100), nullable=False),
        sa.Column("event_start_time", sa.Float(), nullable=False),
        sa.Column("review_status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.ForeignKeyConstraint(
            ["reviewed_by_user_id"], ["users.id"],
            name=op.f("fk_camera_event_reviews_reviewed_by_user_id_users"),
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_camera_event_reviews_event_start_time",
                    "camera_event_reviews", ["event_start_time"])
    op.create_index("ix_camera_event_reviews_review_status",
                    "camera_event_reviews", ["review_status"])


def downgrade() -> None:
    op.drop_index("ix_camera_event_reviews_review_status", table_name="camera_event_reviews")
    op.drop_index("ix_camera_event_reviews_event_start_time", table_name="camera_event_reviews")
    op.drop_table("camera_event_reviews")
