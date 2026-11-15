"""Owner-only and immutable QL-453 GET denies writes or live state."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_followup344 import router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-344-followup"


def test_owner_only():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_methods_reject_writes():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_registered_get_and_read_only_boundaries():
    assert all(route.methods == {"GET"} for route in router.routes)
    assert any(route.path.rstrip("/") == PATH for route in router.routes)
    assert "application.include_router(master_shell_followup344_router)" in inspect.getsource(
        create_app
    )
