"""QL-450 is owner-only and GET-only; no receiver or closure mutation."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_stability341 import router as stability_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-341-stability"


def test_owner_authentication():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_no_mutation_routes():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_registered_get_only():
    assert any(route.path.rstrip("/") == PATH for route in stability_router.routes)
    assert any(route.methods == {"GET"} for route in stability_router.routes)
    assert "application.include_router(master_shell_stability341_router)" in inspect.getsource(
        create_app
    )
