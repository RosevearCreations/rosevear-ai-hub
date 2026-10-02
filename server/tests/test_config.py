from rosevear_ai_hub.config import Settings


def test_settings_accept_environment_overrides(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_PORT", "9999")
    monkeypatch.setenv("LOG_LEVEL", "WARNING")

    settings = Settings()

    assert settings.app_env == "test"
    assert settings.app_port == 9999
    assert settings.log_level == "WARNING"
