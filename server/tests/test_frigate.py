import httpx
import pytest

from rosevear_ai_hub.config import Settings
from rosevear_ai_hub.integrations.frigate import FrigateClient, FrigateError


def test_frigate_requires_loopback_internal_api() -> None:
    settings = Settings(FRIGATE_BASE_URL="http://192.168.68.118:5000")
    with pytest.raises(FrigateError, match="localhost/loopback"):
        FrigateClient(settings)


def test_frigate_status_cameras_and_recent_events() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/version":
            return httpx.Response(200, text="0.16.2")
        if request.url.path == "/api/config":
            return httpx.Response(
                200,
                json={
                    "cameras": {
                        "front_door": {
                            "enabled": True,
                            "detect": {"enabled": True},
                            "record": {"enabled": True},
                            "snapshots": {"enabled": True},
                        },
                        "garage": {
                            "enabled": False,
                            "detect": {"enabled": False},
                            "record": {"enabled": False},
                            "snapshots": {"enabled": False},
                        },
                    }
                },
            )
        if request.url.path == "/api/events":
            return httpx.Response(
                200,
                json=[
                    {
                        "id": "event-1",
                        "camera": "front_door",
                        "label": "person",
                        "sub_label": "visitor",
                        "start_time": 1728480000.5,
                        "end_time": 1728480012.0,
                        "zones": ["porch"],
                        "has_clip": True,
                        "has_snapshot": True,
                        "false_positive": False,
                        "data": {"score": 0.91},
                    }
                ],
            )
        return httpx.Response(404)

    settings = Settings(
        FRIGATE_BASE_URL="http://127.0.0.1:5000",
        FRIGATE_TIMEOUT_SECONDS=2,
    )
    client = FrigateClient(settings, transport=httpx.MockTransport(handler))

    status = client.status()
    assert status.online is True
    assert status.version == "0.16.2"
    assert status.local_only is True

    cameras = client.cameras()
    assert [item.name for item in cameras] == ["front_door", "garage"]
    assert cameras[0].detect_enabled is True
    assert cameras[1].enabled is False

    events = client.recent_events(limit=20)
    assert len(events) == 1
    event = events[0]
    assert event.event_id == "event-1"
    assert event.camera == "front_door"
    assert event.label == "person"
    assert event.zones == ("porch",)
    assert event.score == 0.91


def test_frigate_event_limit_is_bounded_locally() -> None:
    payload = [
        {
            "id": f"event-{index}",
            "camera": "front_door",
            "label": "person",
            "start_time": float(index + 1),
            "zones": [],
            "has_clip": False,
            "has_snapshot": False,
            "false_positive": False,
            "data": {},
        }
        for index in range(120)
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=payload)

    client = FrigateClient(
        Settings(FRIGATE_BASE_URL="http://127.0.0.1:5000"),
        transport=httpx.MockTransport(handler),
    )
    assert len(client.recent_events(limit=100)) == 100
