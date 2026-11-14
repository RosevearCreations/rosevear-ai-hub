"""QL-448 requires owner authentication and never exposes receiver control."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_remediation339 import router as remediation_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-339-remediation"


def test_authenticated_owner_source():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_no_mutation_routes():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_get_only_wired():
    assert any(route.path.rstrip("/") == PATH for route in remediation_router.routes)
    assert any(route.methods == {"GET"} for route in remediation_router.routes)
    assert "application.include_router(master_shell_remediation339_router)" in inspect.getsource(
        create_app
    )
