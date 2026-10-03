"""Provider-neutral model routing status API."""

from typing import Annotated

from fastapi import APIRouter, Depends

from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry
from rosevear_ai_hub.schemas import ProviderStatusResponse

router = APIRouter(prefix="/api/v1/models/providers", tags=["models"])
ProviderRegistryDependency = Annotated[ProviderRegistry, Depends(get_provider_registry)]


@router.get("", response_model=list[ProviderStatusResponse])
async def list_providers(registry: ProviderRegistryDependency) -> list[ProviderStatusResponse]:
    responses: list[ProviderStatusResponse] = []

    for provider in registry.list():
        descriptor = provider.descriptor
        health = await provider.health()
        responses.append(
            ProviderStatusResponse(
                key=descriptor.key,
                display_name=descriptor.display_name,
                provider_type=descriptor.provider_type,
                privacy_policy=descriptor.privacy_policy,
                supports_streaming=descriptor.supports_streaming,
                supports_tools=descriptor.supports_tools,
                enabled=descriptor.enabled,
                available=health.available,
                message=health.message,
                version=health.version,
                model_count=health.model_count,
            )
        )

    return responses
