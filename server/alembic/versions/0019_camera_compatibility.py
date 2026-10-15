"""Build 074: server-backed camera compatibility registry and authorization ledger.

Revision ID: 0019
Revises: 0018
"""
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table(
        "camera_compatibility_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("brand", sa.String(80), nullable=False),
        sa.Column("model", sa.String(120), nullable=False),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.Column("method", sa.String(32), nullable=False, server_default="unverified"),
        sa.Column("evidence", sa.String(400), nullable=False, server_default=""),
        sa.Column("approved_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(CURRENT_TIMESTAMP)")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_table(
        "camera_compatibility_ledger",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("record_id", sa.Integer(), sa.ForeignKey("camera_compatibility_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(24), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("method", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_camera_compatibility_ledger_record_id", "camera_compatibility_ledger", ["record_id"])

def downgrade() -> None:
    op.drop_index("ix_camera_compatibility_ledger_record_id", table_name="camera_compatibility_ledger")
    op.drop_table("camera_compatibility_ledger")
    op.drop_table("camera_compatibility_records")
