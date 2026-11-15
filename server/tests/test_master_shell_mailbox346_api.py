"""QL-455 API is immutable, owner-scoped and never enrolls local mailboxes."""

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_mailbox346 import router
from rosevear_ai_hub.main import app

PATH = "/api/v1/system/master-shell-346-mailbox"


def test_unauthenticated_and_mutating_calls_denied():
    client = TestClient(app)
    assert client.get(PATH).status_code in (401, 403)
    assert all(route.methods == {"GET"} for route in router.routes)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(PATH).status_code in (401, 403, 405)
