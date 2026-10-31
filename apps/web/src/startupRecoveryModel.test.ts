import { describe, expect, it } from "vitest";
import {
  assessStartup, buildStartupSnapshot, createStartupReceipt, parseWindowsStartupEvidence, startupDependencyReadback,
  type StartupSnapshot,
} from "./startupRecoveryModel";

const now = new Date("2026-10-25T12:00:00.000Z");
const valid = {
  schema: "rosevear-hub-windows-startup-v1",
  observedAt: "2026-10-25T11:45:00.000Z",
  tasks: {
    server: { state: "enabled", lastRun: "success_recorded", bootCorrelation: "after_boot" },
    hub: { state: "enabled", lastRun: "success_recorded", bootCorrelation: "after_boot" },
    recovery: { state: "enabled", lastRun: "success_recorded", bootCorrelation: "after_boot" },
  },
};
const good: StartupSnapshot = {
  schema: "rosevear-hub-startup-console-v1",
  capturedAt: "2026-10-25T11:59:00.000Z",
  runtime: { home_assistant: "available", mqtt: "available", ollama: "available", hub: "available", go2rtc: "available", frigate: "available" },
  release: { adoption: "ADOPTED", recoveryTask: "enabled" },
};
const settled = <T>(value: T): PromiseFulfilledResult<T> => ({ status: "fulfilled", value });
const rejected = (): PromiseRejectedResult => ({ status: "rejected", reason: new Error("secret url password=hidden") });

describe("Build 146 read-only recovery classification", () => {
  it("Build 210 maps only observed dependency states and keeps Windows/HTTPS unknown", () => {
    const before = startupDependencyReadback(null);
    expect(before).toHaveLength(8);
    expect(before.every(item => item.state === "unverified")).toBe(true);
    const after = startupDependencyReadback(good);
    expect(after.find(item => item.id === "backend")?.state).toBe("available");
    expect(after.find(item => item.id === "ha")?.state).toBe("available");
    for (const key of ["windows", "web", "caddy", "tailscale"]) {
      expect(after.find(item => item.id === key)?.state).toBe("unverified");
    }
    expect(after.map(item => item.id)).toEqual(["windows", "ha", "mqtt", "ollama", "backend", "web", "caddy", "tailscale"]);
  });
  it("strictly accepts fresh, classified, bounded Windows task evidence", () => {
    expect(parseWindowsStartupEvidence(JSON.stringify(valid), now).tasks.server.state).toBe("enabled");
    for (const extra of [{ ...valid, server: "secret" }, { ...valid, tasks: { ...valid.tasks, server: { ...valid.tasks.server, path: "C:\\Secret" } } }, { ...valid, observedAt: "2026-10-23T12:00:00.000Z" }, { ...valid, observedAt: "2026-10-26T12:00:00.000Z" }]) {
      expect(() => parseWindowsStartupEvidence(JSON.stringify(extra), now)).toThrow();
    }
    expect(() => parseWindowsStartupEvidence("x".repeat(10001), now)).toThrow(/10 KB/);
    expect(() => parseWindowsStartupEvidence(JSON.stringify({ ...valid, tasks: { ...valid.tasks, recovery: { state: "missing", lastRun: "success_recorded", bootCorrelation: "after_boot" } } }), now)).toThrow();
    expect(() => parseWindowsStartupEvidence(JSON.stringify({ ...valid, tasks: { ...valid.tasks, recovery: { state: "unsafe", lastRun: "never_recorded" } } }), now)).toThrow();
    expect(() => parseWindowsStartupEvidence(JSON.stringify({ ...valid, tasks: { ...valid.tasks, recovery: { state: "enabled", lastRun: "failure_recorded", bootCorrelation: "after_boot" } } }), now)).toThrow();
  });

  it("never exposes raw URLs/errors and fail-closes unavailable dependencies", () => {
    const result = buildStartupSnapshot({
      health: settled({ status: "ok", environment: "secrets", service: "Hub" }),
      ha: settled({ configured: true, available: false, base_url: "http://secret", token_configured: true, url_configured: true, message: "private" }),
      mqtt: rejected(),
      ollama: settled({ available: true, base_url: "http://secret", version: "1", model_count: 1, message: "private" }),
      go2rtc: settled({ configured: true, online: true, local_api_only: false, local_rtsp_only: true, api_base_url: "secret", rtsp_listen: null, version: "1", error: null }),
      frigate: settled({ configured: true, online: true, local_only: false, base_url: "secret", version: "1", error: null }),
      release: rejected(),
    }, now);
    expect(result.runtime.home_assistant).toBe("unavailable");
    expect(result.runtime.mqtt).toBe("unverified");
    expect(result.runtime.go2rtc).toBe("unavailable");
    expect(result.runtime.frigate).toBe("unavailable");
    expect(result.release).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/secret|password|token|base_url/i);
    expect(assessStartup(result, null, null, [], now).ownerReviewReady).toBe(false);
  });

  it("does not approve missing, stale, anomalous or changed evidence", () => {
    const windows = parseWindowsStartupEvidence(JSON.stringify(valid), now);
    const baseline = { ...good, capturedAt: "2026-10-25T11:50:00.000Z" };
    const checks = ["task", "vm", "ha", "mqtt", "private", "camera"];
    const assessed = assessStartup(good, baseline, windows, checks, now);
    expect(assessed.ownerReviewReady).toBe(true);
    const receipt = createStartupReceipt(good, baseline, windows, assessed, checks);
    expect(receipt.installedWindowsAcceptance).toBe("HOLD");
    expect(receipt.physicalRecoveryVerified).toBe(false);
    expect(assessStartup(good, null, windows, checks, now).ownerReviewReady).toBe(false);
    expect(assessStartup(good, baseline, windows, [], now).ownerReviewReady).toBe(false);
    expect(assessStartup({ ...good, capturedAt: baseline.capturedAt }, baseline, windows, checks, now).chronology).toBe("invalid");
    expect(assessStartup({ ...good, runtime: { ...good.runtime, mqtt: "unavailable" } }, baseline, windows, checks, now).chronology).toBe("changed");
    expect(assessStartup(good, baseline, windows, checks, new Date("2026-10-26T12:00:00Z")).ownerReviewReady).toBe(false);
    expect(assessStartup(good, baseline, { ...windows, tasks: { ...windows.tasks, server: { state: "disabled", lastRun: "failure_recorded", bootCorrelation: "unverified" } } }, checks, now).ownerReviewReady).toBe(false);
    expect(assessStartup(good, baseline, { ...windows, tasks: { ...windows.tasks, server: { state: "enabled", lastRun: "success_recorded", bootCorrelation: "before_boot" } } }, checks, now).ownerReviewReady).toBe(false);
  });
});
