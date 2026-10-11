"""Build 044: deterministic, read-only preview of a spoken household command.

No voice transcript is submitted to Chat or automatically executed. An explicit
separate user click must invoke the existing audited Home Assistant control API.
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.home_language import (
    load_safe_control_allowlist,
    parse_home_command,
    resolve_home_command,
)
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])
MAX_VOICE_CHARACTERS = 300
VoiceActor = Annotated[
    User,
    Depends(require_roles("owner", "administrator", "household_user")),
]
VoiceSession = Annotated[Session, Depends(get_session)]
VoiceRuntime = Annotated[HomeAssistantRuntime, Depends(get_home_assistant_runtime)]


class VoicePreviewRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=MAX_VOICE_CHARACTERS)

    @field_validator("transcript")
    @classmethod
    def safe_transcript(cls, value: str) -> str:
        clean = value.strip()
        if not clean or any(ord(c) < 32 for c in clean):
            raise ValueError("Voice command must have text and no control characters.")
        return clean


class VoicePreviewResponse(BaseModel):
    status: str
    message: str
    confirmation_required: bool = True
    executable: bool = False
    entity_id: str | None = None
    friendly_name: str | None = None
    action: Literal["on", "off", "activate"] | None = None
    confirmation_rule: str | None = None


@router.post("/preview", response_model=VoicePreviewResponse)
async def preview_voice_command(
    payload: VoicePreviewRequest,
    actor: VoiceActor,
    db: VoiceSession,
    runtime: VoiceRuntime,
) -> VoicePreviewResponse:
    # This is a no-write parser endpoint, never a control endpoint.
    # The role dependency requires a live logged-in account even before bootstrap.
    del actor
    parsed = parse_home_command(payload.transcript)
    if parsed is None:
        result = resolve_home_command(payload.transcript, [], set())
        return VoicePreviewResponse(
            status=result.status,
            message=result.message,
            confirmation_rule=result.confirmation_rule,
        )

    if runtime.client is None:
        raise HTTPException(status_code=503, detail="Home Assistant is not configured.")
    try:
        states = await runtime.client.states()
    except HomeAssistantError as exc:
        raise HTTPException(status_code=503, detail="Home Assistant is unavailable.") from exc

    result = resolve_home_command(
        payload.transcript,
        states,
        load_safe_control_allowlist(db),
    )
    return VoicePreviewResponse(
        status=result.status,
        message=(
            "Review the exact target and action, then click Confirm action. "
            "No spoken confirmation or automatic execution is allowed."
            if result.status == "resolved"
            else result.message
        ),
        executable=result.status == "resolved",
        entity_id=result.entity_id if result.status == "resolved" else None,
        friendly_name=result.friendly_name if result.status == "resolved" else None,
        action=result.action if result.status == "resolved" else None,
        confirmation_rule=result.confirmation_rule,
    )
