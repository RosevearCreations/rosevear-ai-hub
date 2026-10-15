"""Build 077: schema 0022 preserves existing camera records and approvals."""

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_acceptance_migration_is_additive_and_reversible(tmp_path, monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database = tmp_path / "camera-077.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database}")
    command.upgrade(config, "0021")
    engine = create_engine(f"sqlite:///{database}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO camera_compatibility_records "
                "(brand, model, location, method, evidence, revision) "
                "VALUES ('Blink', 'Indoor', 'Den', 'unverified', '', 1)"
            )
        )
    command.upgrade(config, "0022")
    assert "camera_import_acceptance_evidence" in inspect(engine).get_table_names()
    with engine.connect() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM camera_compatibility_records")
        ).scalar_one()
        assert count == 1
    command.downgrade(config, "0021")
    assert "camera_import_acceptance_evidence" not in inspect(engine).get_table_names()
    with engine.connect() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM camera_compatibility_records")
        ).scalar_one()
        assert count == 1
    engine.dispose()
