"""QL-442 owner status requires authentication; forbidden write routes stay absent."""
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app


def test_owner_only_shutdown_status_requires_authentication():
    response = TestClient(app).get("/api/v1/system/master-shell-333-shutdown")
    assert response.status_code in (401, 403)


def test_ql442_has_no_receiver_control_routes():
    client = TestClient(app)
    for method in ("post", "put", "patch", "delete"):
        response = getattr(client, method)("/api/v1/system/master-shell-333-shutdown")
        assert response.status_code in (401, 403, 405)


def test_source_projection_is_explicitly_unknown_and_hold():
    matches = [
        route for route in app.routes
        if getattr(route, "path", None) == "/api/v1/system/master-shell-333-shutdown"
    ]
    assert len(matches) == 1
    assert matches[0].methods == {"GET"}
