import { describe, expect, it } from "vitest";
import { importActivation246Receipt, reconcileActivation247 } from "./windowsActivation247";

const sha = "a".repeat(40);
const content = JSON.stringify({
  schema: "rosevear-windows-first-activation-246/v1",
  approved_main_reference: sha, browser_sha: sha, locally_reported_active_release: sha,
  owner_self_reported_checks: {
    backupRestored: true, migrationSucceeded: true, backendRestarted: true,
    clientReloaded: true, darkModeVisible: true, restartButtonVisible: true,
  },
  secrets: "must-not-transfer",
});

describe("Build 247 local outcome import boundaries", () => {
  it("whitelists only a bounded receipt summary", () => {
    const receipt = importActivation246Receipt(content, "2026-11-04T00:00:00Z");
    expect(receipt.owner_checks_recorded).toBe(6);
    expect(JSON.stringify(receipt)).not.toContain("must-not-transfer");
  });
  it("rejects wrong schemas, malformed SHA and oversized receipts", () => {
    expect(() => importActivation246Receipt("{}", "now")).toThrow("Build 246");
    expect(() => importActivation246Receipt(content.replace(sha, "not-a-sha"), "now")).toThrow("Invalid main");
    expect(() => importActivation246Receipt("x".repeat(32769), "now")).toThrow("32 KB");
  });
  it("never promotes self-reported alignment into Windows verification", () => {
    const receipt = importActivation246Receipt(content, "now");
    const result = reconcileActivation247(sha, sha, sha, receipt, "same_release_claimed");
    expect(result.imported_receipt_matches_current_readback).toBe(true);
    expect(result.machine_verified).toBe(false);
    expect(result.production_installed).toBe(false);
    expect(result.recovery_exceptions_closed).toBe(false);
  });
  it("holds stale processes open as recovery exceptions", () => {
    expect(reconcileActivation247(sha, sha, sha, null, "stale_or_different").disposition).toBe("RECOVERY_EXCEPTION_OPEN");
  });
});
