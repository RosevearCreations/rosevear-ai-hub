"""Ollama discovery and smoke-test API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.integrations.ollama import (
    OllamaClient,
    OllamaRequestError,
    OllamaUnavailableError,
)
from rosevear_ai_hub.schemas import (
    OllamaModelDetails,
    OllamaModelResponse,
    OllamaModelsResponse,
    OllamaStatusResponse,
    OllamaTestRequest,
    OllamaTestResponse,
)

router = APIRouter(prefix="/api/v1/models/ollama", tags=["models"])


def get_ollama_client() -> OllamaClient:
    settings = get_settings()
    return OllamaClient(
        settings.ollama_base_url,
        timeout_seconds=settings.ollama_timeout_seconds,
        generation_timeout_seconds=settings.ollama_generation_timeout_seconds,
    )


def _model_response(item: dict[str, Any]) -> OllamaModelResponse:
    details = item.get("details")
    details_dict = details if isinstance(details, dict) else {}
    families = details_dict.get("families")
    safe_families = (
        [value for value in families if isinstance(value, str)]
        if isinstance(families, list)
        else []
    )

    return OllamaModelResponse(
        name=str(item.get("name") or item.get("model") or "unknown"),
        model=str(item.get("model") or item.get("name") or "unknown"),
        modified_at=item.get("modified_at") if isinstance(item.get("modified_at"), str) else None,
        size=item.get("size") if isinstance(item.get("size"), int) else None,
        digest=item.get("digest") if isinstance(item.get("digest"), str) else None,
        details=OllamaModelDetails(
            format=details_dict.get("format")
            if isinstance(details_dict.get("format"), str)
            else None,
            family=details_dict.get("family")
            if isinstance(details_dict.get("family"), str)
            else None,
            families=safe_families,
            parameter_size=details_dict.get("parameter_size")
            if isinstance(details_dict.get("parameter_size"), str)
            else None,
            quantization_level=details_dict.get("quantization_level")
            if isinstance(details_dict.get("quantization_level"), str)
            else None,
        ),
    )


@router.get("/status", response_model=OllamaStatusResponse)
async def ollama_status(
    client: OllamaClient = Depends(get_ollama_client),
) -> OllamaStatusResponse:
    try:
        version = await client.version()
        models = await client.models()
    except (OllamaUnavailableError, OllamaRequestError) as exc:
        return OllamaStatusResponse(
            available=False,
            base_url=client.base_url,
            version=None,
            model_count=0,
            message=str(exc),
        )

    return OllamaStatusResponse(
        available=True,
        base_url=client.base_url,
        version=version,
        model_count=len(models),
        message="Ollama is available.",
    )


@router.get("/models", response_model=OllamaModelsResponse)
async def ollama_models(
    client: OllamaClient = Depends(get_ollama_client),
) -> OllamaModelsResponse:
    try:
        items = await client.models()
    except (OllamaUnavailableError, OllamaRequestError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return OllamaModelsResponse(
        base_url=client.base_url,
        models=[_model_response(item) for item in items],
    )


@router.post("/test", response_model=OllamaTestResponse)
async def ollama_test(
    request: OllamaTestRequest,
    client: OllamaClient = Depends(get_ollama_client),
) -> OllamaTestResponse:
    try:
        payload = await client.test_model(request.model)
    except (OllamaUnavailableError, OllamaRequestError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    response_text = payload.get("response")
    if not isinstance(response_text, str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ollama generation response was incomplete.",
        )

    return OllamaTestResponse(
        ok=True,
        model=request.model,
        response=response_text.strip(),
        total_duration_ns=payload.get("total_duration")
        if isinstance(payload.get("total_duration"), int)
        else None,
        eval_count=payload.get("eval_count")
        if isinstance(payload.get("eval_count"), int)
        else None,
    )
