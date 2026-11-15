"""Owner-only QL-454 audit endpoint has no write/activation capability."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_policy345 import router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-345-policy"


def test_owner_session_required():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_http_writes_not_exposed():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_routes_are_read_only_and_registered():
    assert all(route.methods == {"GET"} for route in router.routes)
    assert any(route.path.rstrip("/") == PATH for route in router.routes)
    assert "application.include_router(master_shell_policy345_router)" in inspect.getsource(
        create_app
    )
