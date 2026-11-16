"""QL-459 strictly owner-read-only unified Master Server Shell status."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_runtime350 import installed_shell_snapshot350
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/server-shell-350", tags=["server-shell350"])


@router.get("")
def get_server_shell350(
    response: Response, _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return installed_shell_snapshot350()
