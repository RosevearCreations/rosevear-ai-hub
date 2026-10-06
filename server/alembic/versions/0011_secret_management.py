"""Add encrypted secret storage.

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "secret_values",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("secret_key", sa.String(length=160), nullable=False),
        sa.Column("ciphertext", sa.Text(), nullable=False),
        sa.Column("key_fingerprint", sa.String(length=16), nullable=False),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_secret_values")),
        sa.UniqueConstraint("secret_key", name=op.f("uq_secret_values_secret_key")),
    )


def downgrade() -> None:
    op.drop_table("secret_values")
