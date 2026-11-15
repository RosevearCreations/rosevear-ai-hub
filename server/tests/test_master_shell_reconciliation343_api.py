"""QL-452 HTTP endpoint must remain owner-only, no-store, and GET-only."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_reconciliation343 import router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-343-reconciliation"


def test_owner_role_required():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_no_mutation_methods():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_registered_read_only():
    assert any(route.path.rstrip("/") == PATH for route in router.routes)
    assert all(route.methods == {"GET"} for route in router.routes)
    assert "application.include_router(master_shell_reconciliation343_router)" in inspect.getsource(
        create_app
    )
