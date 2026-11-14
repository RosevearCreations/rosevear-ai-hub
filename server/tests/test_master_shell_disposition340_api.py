"""QL-449 exposes an owner-only GET; no receiver or closure commands."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_disposition340 import router as disposition_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-340-disposition"


def test_authenticated_owner_status_required():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_no_mutation_route():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_get_only_router_registered():
    assert any(route.path.rstrip("/") == PATH for route in disposition_router.routes)
    assert any(route.methods == {"GET"} for route in disposition_router.routes)
    assert "application.include_router(master_shell_disposition340_router)" in inspect.getsource(
        create_app
    )
