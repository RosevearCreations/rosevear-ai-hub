"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the Rosevear AI Hub backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(default="Rosevear AI Hub", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="127.0.0.1", alias="APP_HOST")
    app_port: int = Field(default=8765, alias="APP_PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    database_url: str = Field(
        default="sqlite:///./data/rosevear_ai_hub.db",
        alias="DATABASE_URL",
    )
    auth_session_hours: int = Field(
        default=168,
        ge=1,
        le=24 * 365,
        alias="AUTH_SESSION_HOURS",
    )
    auth_cookie_secure: bool = Field(
        default=False,
        alias="AUTH_COOKIE_SECURE",
    )
    confirmation_ttl_seconds: int = Field(
        default=300,
        ge=30,
        le=3600,
        alias="CONFIRMATION_TTL_SECONDS",
    )
    secret_encryption_key: SecretStr | None = Field(
        default=None,
        alias="SECRET_ENCRYPTION_KEY",
    )
    secret_encryption_previous_key: SecretStr | None = Field(
        default=None,
        alias="SECRET_ENCRYPTION_PREVIOUS_KEY",
    )
    home_assistant_url: str = Field(
        default="",
        alias="HOME_ASSISTANT_URL",
    )
    home_assistant_token: SecretStr | None = Field(
        default=None,
        alias="HOME_ASSISTANT_TOKEN",
    )
    home_assistant_timeout_seconds: float = Field(
        default=5.0,
        gt=0,
        le=60,
        alias="HOME_ASSISTANT_TIMEOUT_SECONDS",
    )
    mqtt_password: SecretStr | None = Field(
        default=None,
        alias="MQTT_PASSWORD",
    )
    knowledge_storage_dir: Path = Field(
        default=Path("./data/knowledge"),
        alias="KNOWLEDGE_STORAGE_DIR",
    )
    knowledge_max_upload_bytes: int = Field(
        default=25 * 1024 * 1024,
        gt=0,
        alias="KNOWLEDGE_MAX_UPLOAD_BYTES",
    )
    knowledge_max_expanded_docx_bytes: int = Field(
        default=100 * 1024 * 1024,
        gt=0,
        alias="KNOWLEDGE_MAX_EXPANDED_DOCX_BYTES",
    )
    knowledge_chunk_characters: int = Field(
        default=1200,
        ge=100,
        le=10000,
        alias="KNOWLEDGE_CHUNK_CHARACTERS",
    )
    knowledge_chunk_overlap_characters: int = Field(
        default=200,
        ge=0,
        le=5000,
        alias="KNOWLEDGE_CHUNK_OVERLAP_CHARACTERS",
    )
    knowledge_embedding_provider: str = Field(
        default="ollama",
        alias="KNOWLEDGE_EMBEDDING_PROVIDER",
    )
    knowledge_embedding_model: str = Field(
        default="nomic-embed-text",
        alias="KNOWLEDGE_EMBEDDING_MODEL",
    )
    knowledge_embedding_batch_size: int = Field(
        default=16,
        ge=1,
        le=128,
        alias="KNOWLEDGE_EMBEDDING_BATCH_SIZE",
    )
    knowledge_search_top_k: int = Field(
        default=8,
        ge=1,
        le=50,
        alias="KNOWLEDGE_SEARCH_TOP_K",
    )
    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        alias="OLLAMA_BASE_URL",
    )
    ollama_timeout_seconds: float = Field(
        default=5.0,
        gt=0,
        alias="OLLAMA_TIMEOUT_SECONDS",
    )
    ollama_generation_timeout_seconds: float = Field(
        default=120.0,
        gt=0,
        alias="OLLAMA_GENERATION_TIMEOUT_SECONDS",
    )
    provider_generation_attempts: int = Field(
        default=2,
        ge=1,
        le=5,
        alias="PROVIDER_GENERATION_ATTEMPTS",
    )
    provider_retry_delay_seconds: float = Field(
        default=0.35,
        ge=0,
        le=10,
        alias="PROVIDER_RETRY_DELAY_SECONDS",
    )
    provider_offline_cooldown_seconds: float = Field(
        default=5.0,
        ge=0,
        le=300,
        alias="PROVIDER_OFFLINE_COOLDOWN_SECONDS",
    )
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://tauri.localhost",
            "tauri://localhost",
        ],
        alias="CORS_ALLOWED_ORIGINS",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the cached process-level application settings."""

    return Settings()
