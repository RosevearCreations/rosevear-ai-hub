from rosevear_ai_hub.config import Settings


def test_settings_accept_environment_overrides(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("APP_PORT", "9999")
    monkeypatch.setenv("LOG_LEVEL", "WARNING")

    settings = Settings()

    assert settings.app_env == "test"
    assert settings.app_port == 9999
    assert settings.log_level == "WARNING"


def test_secret_settings_are_redacted_in_repr(monkeypatch) -> None:
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", "secret-master-key")
    monkeypatch.setenv("HOME_ASSISTANT_TOKEN", "secret-ha-token")
    monkeypatch.setenv("MQTT_PASSWORD", "secret-mqtt-password")

    settings = Settings()
    representation = repr(settings)

    assert "secret-master-key" not in representation
    assert "secret-ha-token" not in representation
    assert "secret-mqtt-password" not in representation
    assert settings.home_assistant_token is not None
    assert settings.home_assistant_token.get_secret_value() == "secret-ha-token"
