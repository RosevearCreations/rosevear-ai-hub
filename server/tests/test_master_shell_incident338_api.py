"""QL-447 GET-only owner status does not authorize incident/hardware writes."""

import inspect

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_incident338 import router as incident_router
from rosevear_ai_hub.main import app, create_app

PATH = "/api/v1/system/master-shell-338-incident"


def test_owner_authentication_required():
    assert TestClient(app).get(PATH).status_code in (401, 403)


def test_post_put_patch_delete_never_control_receiver():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)


def test_only_get_route_registered():
    assert any(route.path.rstrip("/") == PATH for route in incident_router.routes)
    assert any(route.methods == {"GET"} for route in incident_router.routes)
    assert "application.include_router(master_shell_incident338_router)" in inspect.getsource(
        create_app
    )
