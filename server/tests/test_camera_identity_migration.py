"""Build 075: additive schema migration and safe downgrade acceptance."""

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_build_075_identity_migration_is_additive_and_reversible(tmp_path, monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    path = tmp_path / "build-075.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{path}")
    command.upgrade(config, "0019")

    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO camera_compatibility_records "
            "(brand, model, location, method, evidence, revision) "
            "VALUES ('Blink', 'Indoor', 'Hallway', 'unverified', '', 1)"
        ))
    command.upgrade(config, "0020")
    inspector = inspect(engine)
    columns = {item["name"] for item in inspector.get_columns("camera_compatibility_records")}
    assert "identity_fingerprint" in columns
    with engine.connect() as connection:
        assert connection.execute(text(
            "SELECT brand FROM camera_compatibility_records"
        )).scalar_one() == "Blink"
        assert connection.execute(text(
            "SELECT identity_fingerprint FROM camera_compatibility_records"
        )).scalar_one() is None

    command.downgrade(config, "0019")
    inspector = inspect(engine)
    columns = {item["name"] for item in inspector.get_columns("camera_compatibility_records")}
    assert "identity_fingerprint" not in columns
    assert "camera_compatibility_ledger" in inspector.get_table_names()
    engine.dispose()
