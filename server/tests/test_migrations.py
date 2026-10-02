from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def migration_config(database_path, monkeypatch) -> Config:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")
    return config


def test_upgrade_to_head_creates_initial_schema(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migration-test.db"
    config = migration_config(database_path, monkeypatch)

    command.upgrade(config, "head")

    test_engine = create_engine(f"sqlite:///{database_path}")
    tables = set(inspect(test_engine).get_table_names())

    assert {
        "alembic_version",
        "app_settings",
        "audit_events",
        "conversations",
        "users",
    }.issubset(tables)


def test_initial_migration_is_reversible(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migration-reversible.db"
    config = migration_config(database_path, monkeypatch)

    command.upgrade(config, "head")
    command.downgrade(config, "base")

    test_engine = create_engine(f"sqlite:///{database_path}")
    tables = set(inspect(test_engine).get_table_names())

    assert "users" not in tables
    assert "conversations" not in tables
    assert "audit_events" not in tables
