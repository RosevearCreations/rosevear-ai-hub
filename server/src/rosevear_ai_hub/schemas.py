"""Public API response schemas."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


class VersionResponse(BaseModel):
    service: str
    version: str
    environment: str
