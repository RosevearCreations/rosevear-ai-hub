from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def migration_config(database_path, monkeypatch) -> Config:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")
    return config


def test_upgrade_to_head_creates_current_schema(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migration-test.db"
    config = migration_config(database_path, monkeypatch)

    command.upgrade(config, "head")

    test_engine = create_engine(f"sqlite:///{database_path}")
    inspector = inspect(test_engine)
    tables = set(inspector.get_table_names())

    assert {
        "alembic_version",
        "app_settings",
        "audit_events",
        "chat_messages",
        "conversations",
        "chunk_embeddings",
        "document_chunks",
        "documents",
        "knowledge_collections",
        "model_profiles",
        "integrations",
        "sessions",
        "tools",
        "users",
    }.issubset(tables)

    conversation_columns = {column["name"] for column in inspector.get_columns("conversations")}
    message_columns = {column["name"] for column in inspector.get_columns("chat_messages")}
    document_columns = {column["name"] for column in inspector.get_columns("documents")}
    chunk_columns = {column["name"] for column in inspector.get_columns("document_chunks")}
    embedding_columns = {column["name"] for column in inspector.get_columns("chunk_embeddings")}
    session_columns = {column["name"] for column in inspector.get_columns("sessions")}
    integration_columns = {column["name"] for column in inspector.get_columns("integrations")}
    tool_columns = {column["name"] for column in inspector.get_columns("tools")}
    assert {"model", "provider"}.issubset(conversation_columns)
    assert {"model", "provider"}.issubset(message_columns)
    assert {
        "collection_id",
        "content_hash",
        "source_path",
        "extracted_text",
        "metadata_json",
        "status",
    }.issubset(document_columns)
    assert {
        "document_id",
        "ordinal",
        "text",
        "start_char",
        "end_char",
        "citation_metadata",
        "embedding_reference",
    }.issubset(chunk_columns)
    assert {
        "chunk_id",
        "provider",
        "model",
        "dimensions",
        "vector_json",
    }.issubset(embedding_columns)
    assert {
        "user_id",
        "token_hash",
        "created_at",
        "expires_at",
        "revoked_at",
    }.issubset(session_columns)
    assert {
        "integration_key",
        "type",
        "name",
        "enabled",
        "configuration_reference",
        "last_health_status",
        "last_health_at",
    }.issubset(integration_columns)
    assert {
        "integration_id",
        "tool_key",
        "display_name",
        "description",
        "capabilities_json",
        "risk_level",
        "input_schema_json",
        "output_schema_json",
        "enabled",
        "built_in",
    }.issubset(tool_columns)

    with test_engine.connect() as connection:
        profile_names = (
            connection.execute(text("SELECT name FROM model_profiles ORDER BY id")).scalars().all()
        )
        collection_names = (
            connection.execute(text("SELECT name FROM knowledge_collections ORDER BY id"))
            .scalars()
            .all()
        )
    assert profile_names == ["General", "Coding", "Home", "Workshop", "Business"]
    assert collection_names == ["Inbox"]


def test_migrations_are_reversible_to_base(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migration-reversible.db"
    config = migration_config(database_path, monkeypatch)

    command.upgrade(config, "head")
    command.downgrade(config, "base")

    test_engine = create_engine(f"sqlite:///{database_path}")
    tables = set(inspect(test_engine).get_table_names())

    assert "tools" not in tables
    assert "integrations" not in tables
    assert "sessions" not in tables
    assert "users" not in tables
    assert "conversations" not in tables
    assert "chat_messages" not in tables
    assert "model_profiles" not in tables
    assert "chunk_embeddings" not in tables
    assert "document_chunks" not in tables
    assert "documents" not in tables
    assert "knowledge_collections" not in tables
    assert "audit_events" not in tables
