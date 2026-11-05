import {describe, expect, it} from "vitest";
import {assessWindowsRelease249, parseWindowsRelease249} from "./windowsRelease249";

const good = {
  schema: "rosevear-windows-release-process-249/v1", source: "local_read_only_owner_handoff",
  observed_at: "2026-11-04T20:00:00Z", boot_observed: true,
  web: {listener: "observed", pid: 22032, source_path: "within_checkout", post_boot: "after_boot"},
  backend: {listener: "observed", pid: 1234, source_path: "within_checkout", post_boot: "after_boot"},
  recovery_task: {status: "enabled", action: "expected_script_reported", last_run: "after_boot"},
  release_commit_attested: false, post_reboot_accepted: false, raw_command: "private-sensitive-content",
};

describe("Build 249 independent Windows evidence boundaries", () => {
  it("discards unexpected private fields", () => {
    const parsed = parseWindowsRelease249(JSON.stringify(good));
    expect(JSON.stringify(parsed)).not.toContain("private-sensitive-content");
  });
  it("rejects forged proof, malformed process identity and oversized receipts", () => {
    expect(() => parseWindowsRelease249(JSON.stringify({...good, release_commit_attested: true}))).toThrow("verification");
    expect(() => parseWindowsRelease249(JSON.stringify({...good, web: {...good.web, pid: -1}}))).toThrow("Process");
    expect(() => parseWindowsRelease249("x".repeat(8193))).toThrow("8 KB");
  });
  it("never closes even if every owner-supplied classification looks healthy", () => {
    const result = assessWindowsRelease249(parseWindowsRelease249(JSON.stringify(good)), "2026-11-04T21:00:00Z", true, true);
    expect(result.state).toBe("OWNER_POST_REBOOT_ACCEPTANCE_HOLD");
    expect(result.signed_release_proven).toBe(false);
    expect(result.owner_closure_authorized).toBe(false);
  });
  it("classifies drift and stale evidence into unresolved findings", () => {
    const drift = parseWindowsRelease249(JSON.stringify({...good, recovery_task: {...good.recovery_task, action: "drift_or_unknown"}}));
    const result = assessWindowsRelease249(drift, "2026-11-06T21:00:00Z", false, false);
    expect(result.findings.join(" ")).toContain("drifted");
    expect(result.findings.join(" ")).toContain("expired");
  });
});
