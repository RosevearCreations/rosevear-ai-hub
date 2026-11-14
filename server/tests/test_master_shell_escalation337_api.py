"""QL-446 owner-only historical source API must never actuate hardware."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_escalation337 import router as escalation_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-337-escalation"


def test_owner_authentication_required():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_hardware_mutation_routes_absent():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_get_only_and_source_wired():
    assert any(route.path.rstrip("/") == PATH for route in escalation_router.routes)
    assert any(route.methods == {"GET"} for route in escalation_router.routes)
    assert "application.include_router(master_shell_escalation337_router)" in inspect.getsource(
        create_app
    )
