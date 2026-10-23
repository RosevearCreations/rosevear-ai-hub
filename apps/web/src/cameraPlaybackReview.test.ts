import { describe, expect, test } from "vitest";
import type { CameraHealthItem, CameraRecord, Go2RTCStatus } from "./api";
import { assessPrivatePlayback, cameraBinding } from "./cameraPlaybackReview";

const now = Date.parse("2026-10-23T16:00:00Z");
const camera = {
  id: 7, endpoint_uuid: "known-7", display_name: "Workshop", host: "192.168.68.77", port: 80,
  service_url: "http://192.168.68.77/onvif", discovery_source: "onvif", onvif_types: [], scopes: [],
  enabled: true, last_seen_at: "2026-10-23T15:58:00Z", created_at: "2026-10-23T15:00:00Z", updated_at: "2026-10-23T15:00:00Z",
  stream: { id: 18, stream_name: "camera-7", source_scheme: "rtsp", source_host: "192.168.68.77", source_port: 554,
    credentials_present: true, enabled: true, encrypted: true, relay_url: "rtsp://127.0.0.1:8554/camera-7",
    last_sync_at: null, last_probe_at: "2026-10-23T15:59:00Z", last_probe_status: "online", last_error: null,
    created_at: "2026-10-23T15:00:00Z", updated_at: "2026-10-23T15:00:00Z" },
} satisfies CameraRecord;
const health = {
  camera_id: 7, display_name: "Workshop", enabled: true, configured: true, health: "healthy",
  last_seen_at: "2026-10-23T15:58:00Z", last_probe_at: "2026-10-23T15:59:00Z", last_probe_status: "online",
  last_error: null, source_host: "192.168.68.77", stream_name: "camera-7",
  viewer_url: "http://127.0.0.1:1984/stream.html?src=camera-7&mode=webrtc,mse,hls,mjpeg",
} satisfies CameraHealthItem;
const transport = {
  configured: true, online: true, version: "1", api_base_url: "http://127.0.0.1:1984", rtsp_listen: "127.0.0.1:8554",
  local_api_only: true, local_rtsp_only: true, error: null,
} satisfies Go2RTCStatus;
const review = (cam: CameraRecord = camera, h: CameraHealthItem = health, t: Go2RTCStatus = transport,
  hostname = "localhost", at = now, forProbe = false) =>
  assessPrivatePlayback(cam, h, t, hostname, 300, at, forProbe);

describe("private camera playback guard", () => {
  test("allows recent exact bound loopback viewer but does not claim video evidence", () => {
    expect(review()).toMatchObject({ ready: true, viewerUrl: health.viewer_url });
    expect(review().reason).toContain("human review");
  });
  test("refuses remote-client localhost mixup and non-loopback services", () => {
    expect(review(camera, health, transport, "192.168.68.114").ready).toBe(false);
    expect(review(camera, health, { ...transport, local_rtsp_only: false }).ready).toBe(false);
    expect(review(camera, { ...health, viewer_url: "http://192.168.68.77:1984/stream.html?src=camera-7" }).ready).toBe(false);
    expect(review(camera, { ...health, viewer_url: "http://evil.example/stream.html?src=camera-7" }).ready).toBe(false);
  });
  test("refuses wrong stream or userinfo and stale successful results", () => {
    expect(review(camera, { ...health, stream_name: "camera-8" }).ready).toBe(false);
    expect(review(camera, { ...health, viewer_url: "http://admin:secret@127.0.0.1:1984/stream.html?src=camera-7" }).ready).toBe(false);
    expect(review(camera, health, transport, "localhost", now + 301_000).ready).toBe(false);
  });
  test("requires encrypted enabled registry but initial manual probe can precede healthy status", () => {
    expect(review({ ...camera, enabled: false }).ready).toBe(false);
    expect(review({ ...camera, stream: { ...camera.stream, encrypted: false } }).ready).toBe(false);
    expect(review(camera, { ...health, health: "untested", last_probe_at: null }).ready).toBe(false);
    expect(review(camera, { ...health, health: "untested", last_probe_at: null }, transport, "localhost", now, true).ready).toBe(true);
  });
  test("binding changes when an existing camera identity or stream changes", () => {
    expect(cameraBinding(camera)).not.toBe(cameraBinding({ ...camera, stream: { ...camera.stream, source_host: "192.168.68.88" } }));
    expect(cameraBinding(camera)).not.toBe(cameraBinding({ ...camera, endpoint_uuid: "replacement" }));
    expect(cameraBinding(camera)).not.toContain("password");
  });
});
