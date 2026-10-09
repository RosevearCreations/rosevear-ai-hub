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
        "automations",
        "automation_runs",
        "audit_events",
        "cameras",
        "camera_streams",
        "chat_messages",
        "confirmation_requests",
        "conversations",
        "chunk_embeddings",
        "document_chunks",
        "documents",
        "knowledge_collections",
        "model_profiles",
        "notification_receipts",
        "notifications",
        "integrations",
        "sessions",
        "secret_values",
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
    confirmation_columns = {
        column["name"] for column in inspector.get_columns("confirmation_requests")
    }
    automation_columns = {column["name"] for column in inspector.get_columns("automations")}
    automation_run_columns = {column["name"] for column in inspector.get_columns("automation_runs")}
    audit_columns = {column["name"] for column in inspector.get_columns("audit_events")}
    secret_columns = {column["name"] for column in inspector.get_columns("secret_values")}
    camera_columns = {column["name"] for column in inspector.get_columns("cameras")}
    camera_stream_columns = {column["name"] for column in inspector.get_columns("camera_streams")}
    notification_columns = {column["name"] for column in inspector.get_columns("notifications")}
    notification_receipt_columns = {
        column["name"] for column in inspector.get_columns("notification_receipts")
    }
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
    assert {
        "requested_by_user_id",
        "decided_by_user_id",
        "tool_id",
        "tool_key",
        "risk_level",
        "arguments_json",
        "arguments_hash",
        "preview_json",
        "status",
        "expires_at",
        "decided_at",
        "consumed_at",
    }.issubset(confirmation_columns)
    expected_automation_columns = {
        "name",
        "enabled",
        "definition_json",
        "created_by",
        "created_at",
        "updated_at",
    }
    assert expected_automation_columns.issubset(automation_columns)
    assert {
        "automation_id",
        "started_at",
        "completed_at",
        "status",
        "result_summary",
    }.issubset(automation_run_columns)
    assert {
        "actor_user_id",
        "event_type",
        "object_type",
        "object_id",
        "action",
        "tool_key",
        "risk_level",
        "confirmation_id",
        "sanitized_arguments",
        "result",
        "result_status",
        "created_at",
    }.issubset(audit_columns)
    assert {
        "secret_key",
        "ciphertext",
        "key_fingerprint",
        "rotated_at",
        "created_at",
        "updated_at",
    }.issubset(secret_columns)
    assert {
        "endpoint_uuid",
        "display_name",
        "host",
        "port",
        "service_url",
        "discovery_source",
        "onvif_types",
        "scopes",
        "enabled",
        "last_seen_at",
        "created_at",
        "updated_at",
    }.issubset(camera_columns)
    assert {
        "camera_id",
        "stream_name",
        "source_scheme",
        "source_host",
        "source_port",
        "credentials_present",
        "source_ciphertext",
        "key_fingerprint",
        "enabled",
        "last_sync_at",
        "last_probe_at",
        "last_probe_status",
        "last_error",
        "created_at",
        "updated_at",
    }.issubset(camera_stream_columns)
    assert {
        "audience",
        "title",
        "message",
        "severity",
        "source_type",
        "source_id",
        "created_by_user_id",
        "created_at",
    }.issubset(notification_columns)
    assert {
        "notification_id",
        "user_id",
        "read_at",
        "dismissed_at",
        "created_at",
    }.issubset(notification_receipt_columns)

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

    assert "camera_streams" not in tables
    assert "cameras" not in tables
    assert "notification_receipts" not in tables
    assert "notifications" not in tables
    assert "automation_runs" not in tables
    assert "automations" not in tables
    assert "secret_values" not in tables
    assert "confirmation_requests" not in tables
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


def test_audit_migration_backfills_filter_columns(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "audit-backfill.db"
    config = migration_config(database_path, monkeypatch)
    command.upgrade(config, "0009")

    test_engine = create_engine(f"sqlite:///{database_path}")
    with test_engine.begin() as connection:
        user_id = connection.execute(
            text(
                "INSERT INTO users (username, password_hash, role, enabled) "
                "VALUES ('owner', 'hash', 'owner', 1) RETURNING id"
            )
        ).scalar_one()
        connection.execute(
            text(
                "INSERT INTO audit_events "
                "(actor_user_id, event_type, object_type, object_id, action, "
                "sanitized_arguments, result) "
                "VALUES (:actor_user_id, 'confirmation.requested', 'confirmation', "
                "'confirmation-1', 'request', :arguments, :result)"
            ),
            {
                "actor_user_id": user_id,
                "arguments": '{"tool_key":"knowledge.document.delete","arguments_hash":"abc"}',
                "result": '{"ok":true,"risk_level":2}',
            },
        )

    command.upgrade(config, "head")

    with test_engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT tool_key, risk_level, confirmation_id, result_status "
                "FROM audit_events WHERE event_type = 'confirmation.requested'"
            )
        ).one()

    assert row.tool_key == "knowledge.document.delete"
    assert row.risk_level == 2
    assert row.confirmation_id == "confirmation-1"
    assert row.result_status == "success"
