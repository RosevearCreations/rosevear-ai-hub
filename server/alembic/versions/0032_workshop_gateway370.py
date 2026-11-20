"""Build 370 signed, private printer-PC source receipt table.

Revision ID: 0032
Revises: 0031
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0032"
down_revision: str | None = "0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workshop_gateway_receipts370",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collector_id", sa.String(40), nullable=False),
        sa.Column("nonce", sa.String(32), nullable=False),
        sa.Column("observed_at_ms", sa.BigInteger(), nullable=False),
        sa.Column("expires_at_ms", sa.BigInteger(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.UniqueConstraint("collector_id", "nonce", name="uq_workshop_gateway370_nonce"),
    )


def downgrade() -> None:
    op.drop_table("workshop_gateway_receipts370")
