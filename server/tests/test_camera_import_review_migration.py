"""Build 076: migration preserves camera records while adding owner-bound receipts."""

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_0021_migration_preserves_existing_camera_inventory(tmp_path, monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database = tmp_path / "camera-076.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database}")
    command.upgrade(config, "0020")
    engine = create_engine(f"sqlite:///{database}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO camera_compatibility_records "
                "(brand, model, location, method, evidence, revision) "
                "VALUES ('Blink', 'Indoor', 'Living Room', 'unverified', '', 1)"
            )
        )
    command.upgrade(config, "0021")
    inspector = inspect(engine)
    assert "camera_import_reviews" in inspector.get_table_names()
    with engine.connect() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM camera_compatibility_records")
        ).scalar_one()
        assert count == 1
    command.downgrade(config, "0020")
    assert "camera_import_reviews" not in inspect(engine).get_table_names()
    with engine.connect() as connection:
        count = connection.execute(
            text("SELECT COUNT(*) FROM camera_compatibility_records")
        ).scalar_one()
        assert count == 1
    engine.dispose()
