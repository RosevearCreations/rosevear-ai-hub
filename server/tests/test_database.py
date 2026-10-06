from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.database import build_engine
from rosevear_ai_hub.models import (
    AppSetting,
    AuditEvent,
    Base,
    ChatMessage,
    ConfirmationRequest,
    Conversation,
    Integration,
    ToolRecord,
    User,
)


def test_initial_models_persist(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'model-test.db'}"
    test_engine = build_engine(database_url)
    Base.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        user = User(
            username="owner",
            password_hash="not-a-real-password-hash",
            role="owner",
            enabled=True,
        )
        session.add(user)
        session.flush()

        session.add(AppSetting(key="ui.theme", value_json={"mode": "system"}))
        integration = Integration(
            integration_key="core.test",
            type="core",
            name="Test",
            enabled=True,
        )
        session.add(integration)
        session.flush()
        tool = ToolRecord(
            integration_id=integration.id,
            tool_key="test.read",
            display_name="Test read",
            description="Test registry persistence.",
            capabilities_json=["test.read"],
            risk_level=2,
            input_schema_json={
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            output_schema_json={
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            enabled=True,
            built_in=True,
        )
        session.add(tool)
        session.flush()
        session.add(
            ConfirmationRequest(
                id="00000000-0000-0000-0000-000000000001",
                requested_by_user_id=user.id,
                decided_by_user_id=None,
                tool_id=tool.id,
                tool_key=tool.tool_key,
                risk_level=2,
                arguments_json={"item_id": 1},
                arguments_hash="a" * 64,
                preview_json={"summary": "Test confirmation"},
                status="pending",
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
        )
        conversation = Conversation(
            user_id=user.id,
            title="Foundation conversation",
            model="test-model:latest",
        )
        session.add(conversation)
        session.flush()
        session.add(
            ChatMessage(
                conversation_id=conversation.id,
                role="user",
                content="Hello",
                status="complete",
            )
        )
        session.add(
            AuditEvent(
                actor_user_id=user.id,
                event_type="database.test",
                object_type="database",
                object_id="local",
                action="write",
                tool_key="test.read",
                risk_level=2,
                confirmation_id="00000000-0000-0000-0000-000000000001",
                sanitized_arguments={"secret": "[REDACTED]"},
                result={"ok": True},
                result_status="success",
            )
        )
        session.commit()

        assert session.scalar(select(User).where(User.username == "owner")) is not None
        assert session.scalar(select(AppSetting).where(AppSetting.key == "ui.theme")) is not None
        assert session.scalar(select(Conversation)) is not None
        assert session.scalar(select(ChatMessage)) is not None
        assert session.scalar(select(AuditEvent)) is not None
        assert session.scalar(select(Integration)) is not None
        assert session.scalar(select(ToolRecord)) is not None
        assert session.scalar(select(ConfirmationRequest)) is not None
