"""Ollama discovery and smoke-test API."""

from __future__ import annotations

from time import perf_counter
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.integrations.ollama import (
    OllamaClient,
    OllamaRequestError,
    OllamaTimeoutError,
    OllamaUnavailableError,
)
from rosevear_ai_hub.models import User
from rosevear_ai_hub.resource_budget import collect_resource_snapshot
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


OllamaClientDependency = Annotated[OllamaClient, Depends(get_ollama_client)]
ModelHealthOwner = Annotated[User, Depends(require_roles("owner", "administrator"))]


def _nonnegative_bytes(value: object) -> int | None:
    return value if type(value) is int and value >= 0 else None


@router.get("/health-budget")
async def ollama_health_budget(
    client: OllamaClientDependency,
    _owner: ModelHealthOwner,
) -> dict:
    """One opt-in sample: local inventory and host budget without model generation."""
    from datetime import UTC, datetime

    started = perf_counter()
    models: list[dict] = []
    resident: list[dict] = []
    version: str | None = None
    inventory_state = "unavailable"
    residency_state = "unknown"
    try:
        version = await client.version()
        raw_models = await client.models()
        models = [
            {
                "name": entry.name,
                "size_bytes": _nonnegative_bytes(entry.size),
                "parameter_size": entry.details.parameter_size,
                "quantization": entry.details.quantization_level,
            }
            for entry in (_model_response(item) for item in raw_models[:100])
        ]
        inventory_state = "available"
        try:
            raw_resident = await client.running_models()
            resident = [
                {
                    "name": str(item.get("name") or item.get("model") or "unknown")[:160],
                    "resident_size_bytes": _nonnegative_bytes(item.get("size")),
                    "vram_bytes": _nonnegative_bytes(item.get("size_vram")),
                }
                for item in raw_resident[:100]
            ]
            residency_state = "available"
        except (OllamaUnavailableError, OllamaRequestError, OllamaTimeoutError):
            residency_state = "unknown"
    except (OllamaUnavailableError, OllamaRequestError, OllamaTimeoutError):
        pass

    try:
        host = collect_resource_snapshot()
    except (OSError, RuntimeError):
        host = None

    total_model_bytes = sum(item["size_bytes"] or 0 for item in models)
    return {
        "sampled_at_utc": datetime.now(UTC).isoformat(),
        "scope": "owner_requested_local_read_only",
        "inventory_state": inventory_state,
        "ollama_version": version,
        "models": models,
        "installed_disk_size_sum_bytes": total_model_bytes
        if inventory_state == "available"
        else None,
        "installed_disk_size_note": (
            "Reported model artifact sizes only; shared blobs and other disks may differ."
        ),
        "resident_state": residency_state,
        "resident_models": resident,
        "probe_duration_ms": round((perf_counter() - started) * 1000, 1),
        "probe_kind": "version_tags_ps_only_no_generation",
        "host_budget": host,
        "automatic_downloads": False,
        "automatic_reconfiguration": False,
        "no_background_polling": True,
    }


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
    client: OllamaClientDependency,
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
    client: OllamaClientDependency,
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
    client: OllamaClientDependency,
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
