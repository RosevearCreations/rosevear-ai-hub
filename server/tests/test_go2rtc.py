import httpx
import pytest

from rosevear_ai_hub.config import Settings
from rosevear_ai_hub.integrations.go2rtc import Go2RTCClient, Go2RTCError


def test_go2rtc_requires_loopback_api() -> None:
    settings = Settings(GO2RTC_BASE_URL="http://192.168.68.118:1984")
    with pytest.raises(Go2RTCError, match="localhost/loopback"):
        Go2RTCClient(settings)


def test_go2rtc_status_and_runtime_stream_patch() -> None:
    requests: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append((request.method, str(request.url)))
        if request.method == "GET" and request.url.path == "/api":
            return httpx.Response(
                200,
                json={
                    "version": "1.9.14",
                    "rtsp": {"listen": "127.0.0.1:8554"},
                },
            )
        if request.method == "GET" and request.url.path == "/api/streams":
            return httpx.Response(200, json={"producers": [{}], "consumers": []})
        return httpx.Response(200, text="")

    settings = Settings(
        GO2RTC_BASE_URL="http://127.0.0.1:1984",
        GO2RTC_TIMEOUT_SECONDS=2,
    )
    client = Go2RTCClient(settings, transport=httpx.MockTransport(handler))

    status = client.status()
    assert status.online is True
    assert status.version == "1.9.14"
    assert status.local_api_only is True
    assert status.local_rtsp_only is True

    client.patch_runtime_source(
        "camera-1",
        "rtsp://user:secret@192.168.68.55/live",
    )
    probe = client.probe_stream("camera-1")

    assert probe.producer_count == 1
    assert probe.consumer_count == 0
    assert any(method == "PATCH" and "camera-1" in url for method, url in requests)
