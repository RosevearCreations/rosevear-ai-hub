"""Built-in local model profiles."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import ModelProfile
from rosevear_ai_hub.schemas import ModelProfileResponse

router = APIRouter(prefix="/api/v1/models/profiles", tags=["models"])
SessionDependency = Annotated[Session, Depends(get_session)]


def _profile_response(profile: ModelProfile) -> ModelProfileResponse:
    return ModelProfileResponse(
        id=profile.id,
        slug=profile.slug,
        name=profile.name,
        system_prompt=profile.system_prompt,
        preferred_provider=profile.preferred_provider,
        preferred_model=profile.preferred_model,
        privacy_policy=profile.privacy_policy,
        enabled=profile.enabled,
        built_in=profile.built_in,
    )


@router.get("", response_model=list[ModelProfileResponse])
def list_profiles(session: SessionDependency) -> list[ModelProfileResponse]:
    profiles = session.scalars(
        select(ModelProfile)
        .where(ModelProfile.enabled.is_(True))
        .order_by(ModelProfile.id.asc())
    ).all()
    return [_profile_response(profile) for profile in profiles]
