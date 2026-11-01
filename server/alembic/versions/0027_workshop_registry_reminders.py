"""Build 217: manual equipment identity and owner-set reminder lead time.

Revision ID: 0027
Revises: 0026
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0027"
down_revision: str | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("workshop_equipment") as batch:
        batch.add_column(sa.Column("model_reference", sa.String(160), nullable=False, server_default=""))
        batch.add_column(sa.Column("accessories_json", sa.JSON(), nullable=False, server_default="[]"))
    with op.batch_alter_table("workshop_maintenance_plans") as batch:
        batch.add_column(sa.Column("reminder_days", sa.Integer(), nullable=False, server_default="7"))


def downgrade() -> None:
    with op.batch_alter_table("workshop_maintenance_plans") as batch:
        batch.drop_column("reminder_days")
    with op.batch_alter_table("workshop_equipment") as batch:
        batch.drop_column("accessories_json")
        batch.drop_column("model_reference")
