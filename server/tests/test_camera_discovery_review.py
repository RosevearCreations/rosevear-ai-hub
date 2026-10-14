"""Build 070: ONVIF scan-only preview and selected, disabled registration."""

from __future__ import annotations

from rosevear_ai_hub.camera_discovery_review import consume_ticket, create_ticket
from rosevear_ai_hub.integrations.onvif import DiscoveredONVIFDevice


def device(
    uuid: str = "camera-A",
    host: str = "192.168.68.55",
    service_url: str | None = None,
) -> DiscoveredONVIFDevice:
    return DiscoveredONVIFDevice(
        endpoint_uuid=uuid,
        service_url=service_url or f"http://{host}/onvif/device_service",
        host=host,
        port=80,
        name="Porch",
        types=("dn:NetworkVideoTransmitter",),
        scopes=(),
    )


def test_ticket_is_owner_bound_one_time_and_exact_selection() -> None:
    key, candidates = create_ticket(100, [device(), device()])
    assert len(candidates) == 1
    assert consume_ticket(101, key, ["camera-A"]) is None
    assert consume_ticket(100, key, ["invalid"]) is None
    assert consume_ticket(100, key, ["camera-A", "camera-A"]) is None
    accepted = consume_ticket(100, key, ["camera-A"])
    assert accepted is not None and accepted[0].host == "192.168.68.55"
    assert consume_ticket(100, key, ["camera-A"]) is None


def test_review_drops_nonlocal_and_credential_bearing_endpoints() -> None:
    key, found = create_ticket(
        101,
        [
            device("public", "8.8.8.8"),
            device("credentials", service_url="http://admin:secret@192.168.68.55/onvif"),
            device("mismatch", service_url="http://192.168.68.100/onvif"),
            device("query", service_url="http://192.168.68.55/onvif?token=secret"),
            device("local"),
        ],
    )
    assert [item.endpoint_uuid for item in found] == ["local"]
    assert consume_ticket(101, key, ["public"]) is None


def test_review_bounds_candidates_and_requires_explicit_selection() -> None:
    key, found = create_ticket(303, [device(str(i)) for i in range(50)])
    assert len(found) == 32
    assert consume_ticket(303, key, []) is None
    assert consume_ticket(303, key, [str(i) for i in range(33)]) is None
    assert consume_ticket(303, key, ["1"]) is not None
