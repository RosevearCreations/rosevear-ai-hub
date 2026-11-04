import { describe, expect, it } from "vitest";
import { assessWindowsProcess248, parseWindowsProcess248 } from "./windowsProcess248";

const evidence = {
  schema: "rosevear-windows-process-task-248/v1", observed_at: "2026-11-04T18:00:00Z",
  source: "owner_on_device_read_only", process_release_verified: false, restart_verified: false,
  listeners: {
    web: {status: "observed_loopback", pid: 22032, parent_pid: 21956, executable_kind: "node.exe"},
    backend: {status: "observed_loopback", pid: 1234, parent_pid: 567, executable_kind: "python.exe"},
  },
  tasks: {
    server: {state: "enabled", last_result: "success_recorded"},
    hub: {state: "enabled", last_result: "success_recorded"},
    recovery: {state: "enabled", last_result: "never_run"},
  },
  private_command: "SECRET-NOT-TO-EXPORT",
};

describe("Build 248 local process and startup handoff", () => {
  it("imports only redacted task and listener classifications", () => {
    const parsed = parseWindowsProcess248(JSON.stringify(evidence));
    expect(parsed.listeners.web.pid).toBe(22032);
    expect(JSON.stringify(parsed)).not.toContain("SECRET-NOT-TO-EXPORT");
  });
  it("rejects forged attestations and malformed evidence", () => {
    expect(() => parseWindowsProcess248(JSON.stringify({...evidence, restart_verified: true}))).toThrow("untrusted");
    expect(() => parseWindowsProcess248(JSON.stringify({...evidence, listeners: {...evidence.listeners, web: {...evidence.listeners.web, status: "owned"}}}))).toThrow("listener");
    expect(() => parseWindowsProcess248("x".repeat(8193))).toThrow("8 KB");
  });
  it("all apparently healthy owner evidence still holds installation closure", () => {
    const result = assessWindowsProcess248(parseWindowsProcess248(JSON.stringify(evidence)), "2026-11-04T19:00:00Z", true);
    expect(result.readback_fresh).toBe(true);
    expect(result.closure_authorized).toBe(false);
    expect(result.installed_production_verified).toBe(false);
    expect(result.disposition).toBe("POST_RESTART_CLOSURE_HOLD");
  });
  it("stale, missing and disabled task observations produce specific holds", () => {
    const changed = parseWindowsProcess248(JSON.stringify({...evidence, tasks: {...evidence.tasks, server: {...evidence.tasks.server, state: "disabled"}}}));
    const report = assessWindowsProcess248(changed, "2026-11-07T19:00:00Z", false);
    expect(report.readback_fresh).toBe(false);
    expect(report.findings.join(" ")).toContain("Server Startup task");
    expect(report.findings.join(" ")).toContain("stale");
  });
});
