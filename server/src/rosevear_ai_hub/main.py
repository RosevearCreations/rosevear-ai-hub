"""FastAPI application entry point."""

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from rosevear_ai_hub import __version__
from rosevear_ai_hub.api.audit import router as audit_router
from rosevear_ai_hub.api.chat import router as chat_router
from rosevear_ai_hub.api.confirmations import router as confirmations_router
from rosevear_ai_hub.api.knowledge import router as knowledge_router
from rosevear_ai_hub.api.knowledge_admin import router as knowledge_admin_router
from rosevear_ai_hub.api.ollama import router as ollama_router
from rosevear_ai_hub.api.profiles import router as profiles_router
from rosevear_ai_hub.api.providers import router as providers_router
from rosevear_ai_hub.api.secrets import router as secrets_router
from rosevear_ai_hub.api.tools import router as tools_router
from rosevear_ai_hub.auth import require_authenticated
from rosevear_ai_hub.auth import router as auth_router
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.logging import configure_logging
from rosevear_ai_hub.schemas import HealthResponse, VersionResponse


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = get_settings()
    configure_logging(settings.log_level)

    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Accept", "Content-Type"],
        expose_headers=["X-Generation-ID"],
    )

    logger = logging.getLogger(__name__)
    logger.info("application configured")

    @application.get("/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service=settings.app_name,
            environment=settings.app_env,
        )

    @application.get("/version", response_model=VersionResponse, tags=["system"])
    def version() -> VersionResponse:
        return VersionResponse(
            service=settings.app_name,
            version=__version__,
            environment=settings.app_env,
        )

    application.include_router(auth_router)
    application.include_router(audit_router)
    protected = [Depends(require_authenticated)]
    application.include_router(ollama_router, dependencies=protected)
    application.include_router(providers_router, dependencies=protected)
    application.include_router(profiles_router, dependencies=protected)
    application.include_router(secrets_router, dependencies=protected)
    application.include_router(tools_router, dependencies=protected)
    application.include_router(chat_router, dependencies=protected)
    application.include_router(confirmations_router, dependencies=protected)
    application.include_router(knowledge_router, dependencies=protected)
    application.include_router(knowledge_admin_router, dependencies=protected)
    return application


app = create_app()
