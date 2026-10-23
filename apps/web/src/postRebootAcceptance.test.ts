import { describe, expect, it } from "vitest";
import type {
  CameraRecord, Go2RTCStatus, HealthResponse, HomeAssistantBrowserResponse,
  HomeAssistantStatus, HubVersionResponse, MQTTStatus, OllamaStatusResponse,
} from "./api";
import {
  assessRebootContinuity, buildRebootSnapshot, compareIds, parseRebootBaseline,
  type RebootSnapshot,
} from "./postRebootAcceptance";

const ok = <T,>(value: T): PromiseFulfilledResult<T> => ({ status: "fulfilled", value });
const fail = (): PromiseRejectedResult => ({ status: "rejected", reason: new Error("token=DO_NOT_PRINT") });

function sample(date = new Date("2026-10-23T10:00:00Z")) {
  return buildRebootSnapshot({
    health: ok({ status: "ok", service: "Hub", environment: "development" } satisfies HealthResponse),
    version: ok({ service: "Hub", version: "0.0.4", environment: "development" } satisfies HubVersionResponse),
    homeAssistant: ok({ configured: true, available: true, base_url: "http://private-ip:8123", token_configured: true, url_configured: true, message: "token SECRET" } as HomeAssistantStatus),
    mqtt: ok({ configured: true, available: true, host: "private", last_error: "password PRIVATE" } as MQTTStatus),
    ollama: ok({ available: true, base_url: "http://localhost:11434", model_count: 1 } as OllamaStatusResponse),
    go2rtc: ok({ configured: true, online: true, local_api_only: true, local_rtsp_only: true, api_base_url: "http://private", error: "key PRIVATE" } as Go2RTCStatus),
    haInventory: ok({ entities: [{ entity_id: "light.shop" }, { entity_id: "sensor.home" }, { entity_id: "light.shop" }] } as HomeAssistantBrowserResponse),
    cameras: ok([{ endpoint_uuid: "urn:uuid:camera-1", service_url: "rtsp://bad:sensitive" }] as CameraRecord[]),
  }, date);
}

describe("Build 117 private reboot comparison", () => {
  it("exports only exact, sorted and deduplicated identity fields; never credentials or addresses", () => {
    const json = JSON.stringify(sample());
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("PRIVATE");
    expect(json).not.toContain("private-ip");
    expect(json).not.toContain("rtsp:");
    expect(parseRebootBaseline(json).haEntityIds).toEqual(["light.shop", "sensor.home"]);
    expect(parseRebootBaseline(json).cameraIds).toEqual(["urn:uuid:camera-1"]);
  });

  it("distinguishes exact changes when inventory totals look the same", () => {
    const before = sample();
    const after = sample(new Date("2026-10-23T10:05:00Z"));
    after.haEntityIds = ["light.other", "sensor.home"];
    after.cameraIds = ["urn:uuid:camera-2"];
    const report = assessRebootContinuity(before, after);
    expect(report.ha).toEqual({ state: "changed", missing: ["light.shop"], added: ["light.other"] });
    expect(report.cameras.state).toBe("changed");
    expect(report.complete).toBe(false);
    expect(compareIds(null, [])).toEqual({ state: "unverified", missing: [], added: [] });
  });

  it("holds if captures are reversed, version differs, registered camera is absent, or relay is not loopback-only", () => {
    const before = sample();
    const after = sample(new Date("2026-10-23T10:05:00Z"));
    expect(assessRebootContinuity(before, after).complete).toBe(true);
    expect(assessRebootContinuity(after, before).complete).toBe(false);
    const changedVersion: RebootSnapshot = { ...after, hubVersion: "0.0.5" };
    expect(assessRebootContinuity(before, changedVersion).versionVerified).toBe(false);
    const empty: RebootSnapshot = { ...before, cameraIds: [] };
    expect(assessRebootContinuity(empty, { ...after, cameraIds: [] }).devicesObserved).toBe(false);
    const relay: RebootSnapshot = { ...after, services: { ...after.services, go2rtc: "unavailable" } };
    expect(assessRebootContinuity(before, relay).services).toContain("go2rtc");
  });

  it("fails closed on partial HTTP failures without leaking underlying error messages", () => {
    const snapshot = buildRebootSnapshot({
      health: fail(), version: fail(), homeAssistant: fail(), mqtt: fail(),
      ollama: fail(), go2rtc: fail(), haInventory: fail(), cameras: fail(),
    });
    expect(snapshot.services.hub).toBe("unverified");
    expect(snapshot.services.mqtt).toBe("unverified");
    expect(snapshot.haEntityIds).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain("DO_NOT_PRINT");
    expect(assessRebootContinuity(sample(), snapshot).complete).toBe(false);
  });

  it("rejects oversized, duplicate, malformed or secret-bearing imports", () => {
    const baseline = sample();
    expect(() => parseRebootBaseline(JSON.stringify({ ...baseline, password: "SECRET" }))).toThrow(/Unexpected fields/);
    expect(() => parseRebootBaseline(JSON.stringify({ ...baseline, cameraIds: ["rtsp://secret"] }))).toThrow(/identities/);
    expect(() => parseRebootBaseline(JSON.stringify({ ...baseline, haEntityIds: ["light.shop", "light.shop"] }))).toThrow(/identities/);
    expect(() => parseRebootBaseline(JSON.stringify({ ...baseline, services: { ...baseline.services, password: "SECRET" } }))).toThrow(/service/);
    expect(() => parseRebootBaseline("x".repeat(250_001))).toThrow(/size/);
    expect(() => parseRebootBaseline("invalid json")).toThrow(/JSON/);
  });
});
