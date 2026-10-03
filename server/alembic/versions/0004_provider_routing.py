"""Persist provider routing metadata.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.add_column(
            sa.Column(
                "provider",
                sa.String(length=64),
                server_default=sa.text("'ollama'"),
                nullable=False,
            )
        )

    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.add_column(sa.Column("provider", sa.String(length=64), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.drop_column("provider")

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_column("provider")
