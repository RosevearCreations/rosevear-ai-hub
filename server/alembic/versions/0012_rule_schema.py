"""Add persistent automation rule definitions for Build 026.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "automations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("definition_json", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name=op.f("fk_automations_created_by_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_automations")),
        sa.UniqueConstraint("name", name=op.f("uq_automations_name")),
    )
    op.create_index(op.f("ix_automations_enabled"), "automations", ["enabled"], unique=False)
    op.create_index(op.f("ix_automations_created_by"), "automations", ["created_by"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_automations_created_by"), table_name="automations")
    op.drop_index(op.f("ix_automations_enabled"), table_name="automations")
    op.drop_table("automations")
