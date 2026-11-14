"""QL-444 owner-only source readback; never exposes hardware control routes."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_continuity335 import router as continuity_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-335-continuity"


def test_ql444_status_requires_owner_authentication():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_ql444_never_exposes_write_activators():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_owner_only_get_registered_and_uses_unverified_projection():
    assert any(route.path.rstrip("/") == PATH for route in continuity_router.routes)
    assert any(route.methods == {"GET"} for route in continuity_router.routes)
    assert "application.include_router(master_shell_continuity335_router)" in inspect.getsource(
        create_app
    )
