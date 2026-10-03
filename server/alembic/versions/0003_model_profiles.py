"""Add model profiles and seed built-in profiles.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PROFILE_ROWS = [
    {
        "id": 1,
        "slug": "general",
        "name": "General",
        "system_prompt": (
            "You are the Rosevear AI Hub local assistant. Give clear, practical answers, "
            "state meaningful uncertainty, and never claim an action or tool result occurred "
            "unless it was actually confirmed."
        ),
        "preferred_provider": "ollama",
        "preferred_model": None,
        "privacy_policy": "local_only",
        "enabled": True,
        "built_in": True,
    },
    {
        "id": 2,
        "slug": "coding",
        "name": "Coding",
        "system_prompt": (
            "You are the Rosevear AI Hub coding assistant. Focus on maintainable software, "
            "tests, security, rollback paths, and concise implementation guidance. Prefer "
            "Windows and PowerShell instructions when a local command is genuinely required."
        ),
        "preferred_provider": "ollama",
        "preferred_model": None,
        "privacy_policy": "local_only",
        "enabled": True,
        "built_in": True,
    },
    {
        "id": 3,
        "slug": "home",
        "name": "Home",
        "system_prompt": (
            "You are the Rosevear AI Hub home-automation assistant. Prioritize household "
            "safety, distinguish advice from executed actions, and do not bypass security, "
            "life-safety devices, or physical safety interlocks."
        ),
        "preferred_provider": "ollama",
        "preferred_model": None,
        "privacy_policy": "local_only",
        "enabled": True,
        "built_in": True,
    },
    {
        "id": 4,
        "slug": "workshop",
        "name": "Workshop",
        "system_prompt": (
            "You are the Rosevear AI Hub workshop assistant. Give practical maker guidance "
            "for fabrication, jewelry, 3D printing, CNC, laser work, casting, and related "
            "projects while clearly identifying meaningful heat, chemical, electrical, "
            "machinery, ventilation, and PPE hazards."
        ),
        "preferred_provider": "ollama",
        "preferred_model": None,
        "privacy_policy": "local_only",
        "enabled": True,
        "built_in": True,
    },
    {
        "id": 5,
        "slug": "business",
        "name": "Business",
        "system_prompt": (
            "You are the Rosevear AI Hub business assistant. Focus on practical operations, "
            "customer communication, pricing, planning, and measurable decisions. Separate "
            "facts from estimates and do not invent market, customer, or financial data."
        ),
        "preferred_provider": "ollama",
        "preferred_model": None,
        "privacy_policy": "local_only",
        "enabled": True,
        "built_in": True,
    },
]


def upgrade() -> None:
    profile_table = op.create_table(
        "model_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column(
            "preferred_provider",
            sa.String(length=64),
            server_default=sa.text("'ollama'"),
            nullable=False,
        ),
        sa.Column("preferred_model", sa.String(length=255), nullable=True),
        sa.Column(
            "privacy_policy",
            sa.String(length=64),
            server_default=sa.text("'local_only'"),
            nullable=False,
        ),
        sa.Column("enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("built_in", sa.Boolean(), server_default=sa.true(), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_model_profiles")),
        sa.UniqueConstraint("slug", name=op.f("uq_model_profiles_slug")),
        sa.UniqueConstraint("name", name=op.f("uq_model_profiles_name")),
    )
    op.bulk_insert(profile_table, PROFILE_ROWS)

    with op.batch_alter_table("conversations") as batch_op:
        batch_op.create_index(
            op.f("ix_conversations_profile_id"),
            ["profile_id"],
            unique=False,
        )
        batch_op.create_foreign_key(
            op.f("fk_conversations_profile_id_model_profiles"),
            "model_profiles",
            ["profile_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("conversations") as batch_op:
        batch_op.drop_constraint(
            op.f("fk_conversations_profile_id_model_profiles"),
            type_="foreignkey",
        )
        batch_op.drop_index(op.f("ix_conversations_profile_id"))

    op.drop_table("model_profiles")
