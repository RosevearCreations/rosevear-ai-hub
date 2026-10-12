import { describe, expect, it } from "vitest";
import { summarizeServiceDiagnostics } from "./LocalDiagnosticsPanel";

const ok = (value: unknown): PromiseFulfilledResult<unknown> => ({ status: "fulfilled", value });
const rejected: PromiseRejectedResult = {
  status: "rejected",
  reason: new Error("http://private-host:9999?token=SECRET"),
};

describe("Build 053 read-only diagnostics", () => {
  it("classifies healthy, missing and optional services independently", () => {
    const services = summarizeServiceDiagnostics([
      ok({ status: "ok" }),
      ok({ available: true, model_count: 2 }),
      ok({ configured: false, available: false }),
      ok({ configured: true, available: false }),
      ok({ configured: false, online: false }),
    ]);
    expect(services.map((item) => item.state)).toEqual([
      "ready", "ready", "optional", "attention", "optional",
    ]);
    expect(services).toHaveLength(5);
  });

  it("flags no Ollama model and an unsafe relay listener without exposing URLs", () => {
    const services = summarizeServiceDiagnostics([
      ok({ status: "ok" }),
      ok({ available: true, model_count: 0, base_url: "http://secret-ollama" }),
      ok({ configured: true, available: true, message: "password=SECRET" }),
      rejected,
      ok({
        configured: true,
        online: true,
        local_api_only: false,
        local_rtsp_only: true,
        api_base_url: "http://secret-camera",
      }),
    ]);
    expect(services.map((item) => item.state)).toEqual([
      "ready", "attention", "ready", "unknown", "attention",
    ]);
    expect(JSON.stringify(services)).not.toContain("SECRET");
    expect(JSON.stringify(services)).not.toContain("secret-");
  });

  it("does not assume an authorization failure or malformed body means offline", () => {
    const services = summarizeServiceDiagnostics([
      rejected, rejected, rejected, ok({ available: false }), ok({ online: false }),
    ]);
    expect(services.every((item) => item.state === "unknown")).toBe(true);
    expect(services.every((item) => item.checks.length > 0)).toBe(true);
  });

  it("has no mutation, start, restart or repair endpoint instructions", () => {
    const services = summarizeServiceDiagnostics([rejected, rejected, rejected, rejected, rejected]);
    const instructions = services.flatMap((item) => item.checks).join(" ");
    expect(instructions).toContain("hub-recovery.ps1 -CheckOnly");
    expect(instructions).not.toMatch(/-Enable\b|POST \/|Invoke-RestMethod.*-Method Post/i);
  });
});
