"""QL-451 requires owner authentication and never exposes writes."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_renewal342 import router as renewal_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-342-renewal"


def test_owner_only():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_no_mutation_controls():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_registered_read_only():
    assert any(route.path.rstrip("/") == PATH for route in renewal_router.routes)
    assert any(route.methods == {"GET"} for route in renewal_router.routes)
    assert "application.include_router(master_shell_renewal342_router)" in inspect.getsource(
        create_app
    )
