from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.database import build_engine
from rosevear_ai_hub.models import AppSetting, AuditEvent, Base, Conversation, User


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
        session.add(Conversation(user_id=user.id, title="Foundation conversation"))
        session.add(
            AuditEvent(
                actor_user_id=user.id,
                event_type="database.test",
                object_type="database",
                object_id="local",
                action="write",
                sanitized_arguments={"secret": "[REDACTED]"},
                result={"ok": True},
            )
        )
        session.commit()

        assert session.scalar(select(User).where(User.username == "owner")) is not None
        assert session.scalar(select(AppSetting).where(AppSetting.key == "ui.theme")) is not None
        assert session.scalar(select(Conversation)) is not None
        assert session.scalar(select(AuditEvent)) is not None
