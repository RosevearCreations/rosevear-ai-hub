"""Build 372 owner-reviewed Alexa local consent, independent from HA provider settings.

Revision ID: 0033
Revises: 0032
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0033"
down_revision: str | None = "0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alexa_consents372",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_id", sa.String(127), nullable=False, unique=True),
        sa.Column("decision", sa.String(16), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("alexa_consents372")
