"""QL-457 API remains strictly owner-read-only, source truth never CONNECTED."""

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_transport348 import router
from rosevear_ai_hub.main import app

PATH = "/api/v1/system/master-shell-348-transport"


def test_no_mutations_or_anonymous_source_status():
    client = TestClient(app)
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(PATH).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)
