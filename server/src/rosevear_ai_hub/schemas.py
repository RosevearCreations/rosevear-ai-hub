"""Public API response schemas."""

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
