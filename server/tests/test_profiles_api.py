from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, ModelProfile


def test_profiles_endpoint_returns_enabled_profiles(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'profiles.db'}")
    Base.metadata.create_all(engine)
    test_session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    with test_session_maker() as session:
        session.add_all(
            [
                ModelProfile(
                    slug="general",
                    name="General",
                    system_prompt="General prompt",
                    preferred_provider="ollama",
                    preferred_model=None,
                    privacy_policy="local_only",
                    enabled=True,
                    built_in=True,
                ),
                ModelProfile(
                    slug="disabled",
                    name="Disabled",
                    system_prompt="Disabled prompt",
                    preferred_provider="ollama",
                    preferred_model=None,
                    privacy_policy="local_only",
                    enabled=False,
                    built_in=False,
                ),
            ]
        )
        session.commit()

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)

    response = client.get("/api/v1/models/profiles")
    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["General"]
    assert response.json()[0]["privacy_policy"] == "local_only"
