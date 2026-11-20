#!/usr/bin/env python3
"""Owner-started, localhost-only USB camera snapshot viewer for a Windows PC.

Does not send camera content to the AI Hub; never touches serial ports, G-code,
laser controllers or printer firmware. Only one camera opens at a time.
Install optional dependency: python -m pip install opencv-python
"""

from __future__ import annotations

import argparse
import html
import secrets
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit

PORT = 8766


def serve(camera_ids: tuple[int, ...]) -> None:
    token = secrets.token_urlsafe(24)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, _format: str, *_args: object) -> None:
            return  # Never write the local access token to console or logs.

        def send_bytes(self, status: int, content_type: str, data: bytes) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'none'; img-src 'self'")
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:
            request = urlsplit(self.path)
            args = parse_qs(request.query)
            if args.get("token") != [token]:
                self.send_bytes(403, "text/plain; charset=utf-8", b"Private viewer token required.")
                return
            try:
                requested = int(args.get("camera", ["0"])[0])
            except ValueError:
                requested = -1
            if requested not in camera_ids:
                self.send_bytes(404, "text/plain; charset=utf-8", b"Camera not enabled.")
                return
            if request.path == "/frame":
                try:
                    import cv2  # Optional local-only dependency, no cloud or network stream.

                    camera = cv2.VideoCapture(requested, cv2.CAP_DSHOW)
                    try:
                        ok, frame = camera.read() if camera.isOpened() else (False, None)
                    finally:
                        camera.release()
                    if not ok or frame is None:
                        raise RuntimeError("Camera is unavailable or used by another program.")
                    ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    if not ok:
                        raise RuntimeError("Image not available.")
                    self.send_bytes(200, "image/jpeg", encoded.tobytes())
                except (ImportError, OSError, RuntimeError, AttributeError):
                    self.send_bytes(
                        503, "text/plain; charset=utf-8",
                        b"Camera unavailable. Check OpenCV, camera index, and driver ownership.",
                    )
                return
            if request.path != "/view":
                self.send_bytes(404, "text/plain; charset=utf-8", b"Not found.")
                return
            links = " ".join(
                '<a href="/view?' + html.escape(urlencode({"token": token, "camera": idx})) +
                '">Camera ' + str(idx) + "</a>" for idx in camera_ids
            )
            photo = "/frame?" + html.escape(urlencode({"token": token, "camera": requested}))
            markup = (
                "<!doctype html><html><head><meta charset='utf-8'>"
                "<meta name='referrer' content='no-referrer'>"
                "<meta http-equiv='refresh' content='4'>"
                "<title>Rosevear local camera</title></head>"
                "<body style='font-family:system-ui;background:#16171d;color:white;padding:1rem'>"
                "<h1>Printer PC camera preview</h1><p>" + links + "</p>"
                "<p>Local-only single-camera snapshots, every 4 seconds. No recording, "
                "cloud stream or printer control.</p>"
                "<img alt='Selected camera frame' style='width:100%;max-width:960px' src='"
                + photo + "'><p>If the image is unavailable, another app may own the camera.</p>"
                "</body></html>"
            )
            self.send_bytes(200, "text/html; charset=utf-8", markup.encode("utf-8"))

    with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as server:
        print("LOCAL ONLY. Open this address on the printer PC:")
        print("http://127.0.0.1:" + str(PORT) + "/view?" +
              urlencode({"token": token, "camera": camera_ids[0]}))
        print("Press Ctrl+C to stop. No images are stored or sent to the Hub.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("Camera viewer stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cameras", default="0,1", help="Explicit USB camera indices; e.g. 0,1")
    args = parser.parse_args()
    try:
        ids = tuple(int(part) for part in args.cameras.split(","))
    except ValueError:
        sys.exit("Camera indices must be comma-separated integers.")
    if not ids or len(ids) > 4 or len(set(ids)) != len(ids) or any(i < 0 or i > 5 for i in ids):
        sys.exit("Allow 1-4 distinct camera indices between 0 and 5.")
    if sys.platform != "win32":
        sys.exit("Viewer HOLD: only supported on the supervised Windows printer PC.")
    serve(ids)


if __name__ == "__main__":
    main()
