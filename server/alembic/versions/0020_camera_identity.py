"""Build 075: unique normalized identity keys for conflict-safe camera plans.

Revision ID: 0020
Revises: 0019
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Existing Build 074 records stay untouched; they may contain duplicates.
    # New writes additionally check all legacy identities before insertion.
    op.add_column(
        "camera_compatibility_records",
        sa.Column("identity_fingerprint", sa.String(64), nullable=True),
    )
    op.create_index(
        "uq_camera_compatibility_identity_fingerprint",
        "camera_compatibility_records",
        ["identity_fingerprint"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_camera_compatibility_identity_fingerprint",
        table_name="camera_compatibility_records",
    )
    op.drop_column("camera_compatibility_records", "identity_fingerprint")
