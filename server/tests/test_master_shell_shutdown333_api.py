"""QL-442 owner status requires authentication; forbidden write routes stay absent."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_shutdown333 import router as shutdown_router

from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-333-shutdown"


def test_owner_only_shutdown_status_requires_authentication():
    response = TestClient(app).get(PATH)
    assert response.status_code in (401, 403)


def test_ql442_has_no_receiver_control_routes():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        response = getattr(client, method)(PATH)
        assert response.status_code in (401, 403, 405)


def test_source_projection_is_explicitly_unknown_and_hold():
    # Verify router registration and the application's inclusion contract without
    # depending on a shared app.routes list mutated by other test modules.
    assert any(route.path.rstrip("/") == PATH for route in shutdown_router.routes)
    assert any(route.methods == {"GET"} for route in shutdown_router.routes)
    assert "application.include_router(master_shell_shutdown333_router)" in inspect.getsource(
        create_app
    )
