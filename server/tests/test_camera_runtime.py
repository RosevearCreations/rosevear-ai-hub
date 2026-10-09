import base64
from datetime import UTC, datetime

from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.camera_runtime import reconcile_camera_streams
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import Base, build_engine
from rosevear_ai_hub.models import Camera, CameraStream
from rosevear_ai_hub.secrets import encrypt_scoped_value


class FakeGo2RTC:
    def __init__(self) -> None:
        self.sources: dict[str, str] = {}

    def status(self):
        return object()

    def patch_runtime_source(self, stream_name: str, source_url: str) -> None:
        self.sources[stream_name] = source_url


def test_startup_reconcile_rehydrates_encrypted_camera_source(tmp_path, monkeypatch) -> None:
    key = base64.urlsafe_b64encode(b"r" * 32).decode("ascii").rstrip("=")
    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", key)
    get_settings.cache_clear()

    engine = build_engine(f"sqlite:///{tmp_path / 'camera-runtime.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    source = "rtsp://user:secret@192.168.68.55/live"

    with factory() as session:
        camera = Camera(
            endpoint_uuid="startup-camera",
            display_name="Startup Camera",
            host="192.168.68.55",
            port=80,
            service_url="http://192.168.68.55/onvif/device_service",
            discovery_source="onvif_ws_discovery",
            onvif_types=[],
            scopes=[],
            enabled=True,
            last_seen_at=datetime.now(UTC),
        )
        session.add(camera)
        session.flush()
        ciphertext, fingerprint = encrypt_scoped_value(
            source,
            scope=f"camera.stream.{camera.id}",
        )
        session.add(
            CameraStream(
                camera_id=camera.id,
                stream_name=f"camera-{camera.id}",
                source_scheme="rtsp",
                source_host="192.168.68.55",
                source_port=554,
                credentials_present=True,
                source_ciphertext=ciphertext,
                key_fingerprint=fingerprint,
                enabled=True,
            )
        )
        session.commit()
        camera_id = camera.id

    fake = FakeGo2RTC()
    result = reconcile_camera_streams(session_factory=factory, client=fake)

    assert result == {"configured": 1, "synchronized": 1, "failed": 0, "skipped": 0}
    assert fake.sources[f"camera-{camera_id}"] == source

    with factory() as session:
        stream = session.query(CameraStream).filter_by(camera_id=camera_id).one()
        assert stream.last_sync_at is not None
        assert stream.last_error is None

    get_settings.cache_clear()
