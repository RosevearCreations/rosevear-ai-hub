"""Public API request and response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


class VersionResponse(BaseModel):
    service: str
    version: str
    environment: str


class OllamaModelDetails(BaseModel):
    format: str | None = None
    family: str | None = None
    families: list[str] = Field(default_factory=list)
    parameter_size: str | None = None
    quantization_level: str | None = None


class OllamaModelResponse(BaseModel):
    name: str
    model: str
    modified_at: str | None = None
    size: int | None = None
    digest: str | None = None
    details: OllamaModelDetails


class OllamaStatusResponse(BaseModel):
    available: bool
    base_url: str
    version: str | None
    model_count: int
    message: str


class OllamaModelsResponse(BaseModel):
    base_url: str
    models: list[OllamaModelResponse]


class OllamaTestRequest(BaseModel):
    model: str = Field(min_length=1, max_length=255)


class OllamaTestResponse(BaseModel):
    ok: bool
    model: str
    response: str
    total_duration_ns: int | None = None
    eval_count: int | None = None


class ProviderStatusResponse(BaseModel):
    key: str
    display_name: str
    provider_type: Literal["local", "cloud"]
    privacy_policy: str
    supports_streaming: bool
    supports_tools: bool
    enabled: bool
    available: bool
    degraded: bool
    message: str
    version: str | None = None
    model_count: int | None = None
    consecutive_failures: int = 0
    retry_after_seconds: float = 0
    last_error: str | None = None


class ModelProfileResponse(BaseModel):
    id: int
    slug: str
    name: str
    system_prompt: str
    preferred_provider: str
    preferred_model: str | None
    privacy_policy: str
    enabled: bool
    built_in: bool


class ConversationCreateRequest(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=255)
    provider: str | None = Field(default=None, min_length=1, max_length=64)
    model: str | None = Field(default=None, max_length=255)
    profile_id: int | None = Field(default=None, ge=1)


class ConversationResponse(BaseModel):
    id: int
    title: str
    provider: str
    model: str | None
    profile_id: int | None
    created_at: datetime
    updated_at: datetime


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: Literal["user", "assistant", "system"]
    content: str
    provider: str | None
    model: str | None
    status: str
    created_at: datetime


class ChatStreamRequest(BaseModel):
    provider: str | None = Field(default=None, min_length=1, max_length=64)
    model: str = Field(min_length=1, max_length=255)
    prompt: str = Field(min_length=1, max_length=20000)
    profile_id: int | None = Field(default=None, ge=1)


class CancelGenerationResponse(BaseModel):
    generation_id: str
    cancelled: bool
