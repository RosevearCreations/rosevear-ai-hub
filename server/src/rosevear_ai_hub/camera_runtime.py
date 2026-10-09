"""Server-owned camera transport rehydration for Build 032."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.database import SessionLocal
from rosevear_ai_hub.integrations.go2rtc import Go2RTCClient, Go2RTCError, get_go2rtc_client
from rosevear_ai_hub.models import Camera, CameraStream
from rosevear_ai_hub.secrets import decrypt_scoped_value

logger = logging.getLogger(__name__)


def reconcile_camera_streams(
    *,
    session_factory: Callable[[], Session] = SessionLocal,
    client: Go2RTCClient | None = None,
) -> dict[str, int]:
    """Rehydrate enabled encrypted camera sources into go2rtc runtime memory.

    This is intentionally best-effort: the Hub must remain usable when go2rtc or a
    camera is offline. No credential-bearing value is logged or audit-persisted.
    """

    synchronized = 0
    failed = 0
    skipped = 0

    try:
        go2rtc = client or get_go2rtc_client()
        go2rtc.status()
    except Go2RTCError:
        logger.info("camera transport startup reconcile skipped: go2rtc unavailable")
        return {"configured": 0, "synchronized": 0, "failed": 0, "skipped": 0}

    with session_factory() as session:
        streams = session.scalars(select(CameraStream).order_by(CameraStream.id.asc())).all()
        for stream in streams:
            camera = session.get(Camera, stream.camera_id)
            if camera is None or not camera.enabled or not stream.enabled:
                skipped += 1
                continue

            try:
                source_url = decrypt_scoped_value(
                    stream.source_ciphertext,
                    scope=f"camera.stream.{stream.camera_id}",
                )
                go2rtc.patch_runtime_source(stream.stream_name, source_url)
                stream.last_sync_at = datetime.now(UTC)
                stream.last_error = None
                synchronized += 1
            except RuntimeError:
                stream.last_error = "encrypted_source_unavailable"
                failed += 1
            except Go2RTCError:
                stream.last_error = "go2rtc_sync_failed"
                failed += 1

        record_audit_event(
            session,
            actor_user_id=None,
            event_type="camera.streams.startup_reconciled",
            object_type="camera_stream_registry",
            object_id=None,
            action="startup_reconcile",
            arguments={"configured": len(streams)},
            result={
                "ok": failed == 0,
                "synchronized": synchronized,
                "failed": failed,
                "skipped": skipped,
            },
        )
        session.commit()

    logger.info(
        "camera transport startup reconcile complete: "
        "configured=%s synchronized=%s failed=%s skipped=%s",
        len(streams),
        synchronized,
        failed,
        skipped,
    )
    return {
        "configured": len(streams),
        "synchronized": synchronized,
        "failed": failed,
        "skipped": skipped,
    }
