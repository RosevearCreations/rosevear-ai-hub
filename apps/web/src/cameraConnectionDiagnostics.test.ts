import { describe, expect, it } from "vitest";
import type { CameraCompatibilityPlan } from "./api";
import { CAMERA_SOURCES, cameraConnectionReadback, cameraSourceReadback } from "./cameraConnectionDiagnostics";

const plan: CameraCompatibilityPlan = {
  id: 1, brand: "Blink", model: "Exact model", location: "", method: "unverified",
  evidence: "", revision: 1, approved_by_user_id: null, approved_at: null,
};

describe("Build 213 camera source compatibility", () => {
  it("includes requested brands without universal compatibility claims", () => {
    expect(CAMERA_SOURCES.map((source) => source.brand)).toEqual([
      "Blink", "littlelf", "Nooie", "Netvue", "Alarm.com", "SkyBell",
    ]);
    expect(cameraSourceReadback("Netvue", [])).toContain("capability unknown");
    expect(cameraSourceReadback("blink", [plan])).toContain("1 recorded model");
  });

  it("keeps undocumented, Alexa-only, and unsupported methods distinct", () => {
    expect(cameraConnectionReadback(plan).label).toContain("unknown");
    expect(cameraConnectionReadback({ ...plan, method: "rtsp" }).label).toContain("unknown");
    expect(cameraConnectionReadback({ ...plan, method: "alexa_only" }).label).toContain("Alexa viewing only");
    expect(cameraConnectionReadback({ ...plan, method: "unsupported" }).label).toContain("No supported");
  });

  it("never equates approval to a functioning camera feed", () => {
    const documented = { ...plan, method: "onvif" as const, evidence: "Owner-reviewed model guide" };
    expect(cameraConnectionReadback(documented).label).toContain("owner review pending");
    expect(cameraConnectionReadback({ ...documented, approved_at: "2026-11-01T00:00:00Z" }).label)
      .toContain("live feed unverified");
  });
});
