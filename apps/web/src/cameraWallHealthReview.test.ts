import { describe, expect, test } from "vitest";
import type { CameraHealthItem } from "./api";
import { cameraWallHealthReview } from "./cameraWallHealthReview";

const now = Date.parse("2026-11-01T12:00:00Z");
const health: CameraHealthItem = {
  camera_id: 1, display_name: "Workshop", enabled: true, configured: true, health: "healthy",
  last_seen_at: "2026-11-01T11:59:00Z", last_probe_at: "2026-11-01T11:59:00Z",
  last_probe_status: "online", last_error: "SECRET_SOURCE_URL", source_host: "PRIVATE_IP",
  stream_name: "PRIVATE_STREAM", viewer_url: "PRIVATE_URL",
};

describe("Build 214 private camera health review", () => {
  test("fresh healthy observations never claim video acceptance or a last-good frame", () => {
    const readback = cameraWallHealthReview(health, now, 300);
    expect(readback.attention).toBe(false);
    expect(readback.status).toContain("video not field-verified");
    expect(readback.lastGood).toContain("No verified");
    expect(JSON.stringify(readback)).not.toMatch(/SECRET|PRIVATE/);
  });
  test("missing, stale, future and offline probes require manual follow-up", () => {
    expect(cameraWallHealthReview(undefined, now, 300).attention).toBe(true);
    expect(cameraWallHealthReview({ ...health, last_probe_at: null }, now, 300).attention).toBe(true);
    expect(cameraWallHealthReview({ ...health, last_probe_at: "2026-11-01T11:40:00Z" }, now, 300).attention).toBe(true);
    expect(cameraWallHealthReview({ ...health, last_probe_at: "2026-11-01T12:10:00Z" }, now, 300).attention).toBe(true);
    expect(cameraWallHealthReview({ ...health, health: "failed" }, now, 300).attention).toBe(true);
    expect(cameraWallHealthReview({ ...health, enabled: false }, now, 300).next).toContain("disabled");
  });
});
