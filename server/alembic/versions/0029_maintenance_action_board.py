"""Build 219: owner task overlays and source-key deduplication.

Revision ID: 0029
Revises: 0028
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0029"
down_revision: str | None = "0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "maintenance_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_kind", sa.String(32), nullable=False),
        sa.Column("source_id", sa.String(300), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("assigned_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("due_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("decision_reason", sa.String(500), nullable=False, server_default=""),
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
        sa.UniqueConstraint("source_kind", "source_id", name="uq_maintenance_action_source"),
    )


def downgrade() -> None:
    op.drop_table("maintenance_actions")
