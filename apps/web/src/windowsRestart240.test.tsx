import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsRestart240Panel } from "./WindowsRestart240Panel";
import { defaultRestart240Draft, defaultRestart240Observation,
  exportRestart240Handoff, formatRestart240Packet, importRestart240Handoff,
  observation240Key, preflight240Key, reboot240Key, restart240Dependencies,
  summarizeRestart240, type Restart240Draft, type Restart240Observation } from "./windowsRestart240";

const t1 = "2026-11-03T10:00:00.000Z";
const t2 = "2026-11-03T10:10:00.000Z";
const t3 = "2026-11-03T10:11:00.000Z";

function preflight(): Restart240Draft {
  const p = {
    ...defaultRestart240Draft.preflight, installedVersion: "hub-installed-test-240",
    hubBackupReference: "WIN240-HUB-BACKUP", haBackupReference: "WIN240-HA-BACKUP",
    baselineReference: "WIN240-BASELINE", workPaused: true, tasksInspected: true,
    originalVmReviewed: true, recordedAt: t1,
  };
  p.snapshotKey = preflight240Key(p);
  return { ...defaultRestart240Draft, preflight: p };
}
function rebooted(): Restart240Draft {
  const data = preflight();
  const q = { ...data.reboot, witnessed: true, signInObserved: true,
    reference: "WIN240-REBOOT", waitedMinutes: 5, recordedAt: t2 };
  q.snapshotKey = reboot240Key(data.preflight, q);
  return { ...data, reboot: q };
}
function observed(): Restart240Draft {
  const data = rebooted();
  const observations: Restart240Draft["observations"] = {};
  for (const dep of restart240Dependencies) {
    const row: Restart240Observation = { ...defaultRestart240Observation,
      status: "working", source: "direct_screen", reference: "WIN240-" + dep.id,
      recordedAt: t3 };
    row.snapshotKey = observation240Key(data.reboot, dep.id, row);
    observations[dep.id] = row;
  }
  return { ...data, observations };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 240 supervised Windows restart field evidence and recovery HOLD", () => {
  it("starts with no reboot, fabricated observation, independent acceptance or Windows action", () => {
    const summary = summarizeRestart240(defaultRestart240Draft);
    expect(summary).toMatchObject({ preflightGate: "scope_missing", rebootGate: "preflight_hold",
      working: 0, outstanding: 8, findings: 0, ownerReportedRecovery: false,
      independentlyVerified: false, remotelyRestarted: false,
      repairsAuthorized: false, repairsExecuted: false, installations: 0, liveCommands: 0,
      privateRelay: "OFF", sixAppIntegration: "DISCONNECTED / HOLD" });
    expect(formatRestart240Packet(defaultRestart240Draft)).toContain("Owner-reported recovery: NO / INCOMPLETE");
  });

  it("requires actual preflight backup, task, VM and distinct source-bound baseline", () => {
    const data = preflight();
    expect(summarizeRestart240(data).preflightGate).toBe("preflight_ready");
    expect(summarizeRestart240({ ...data, preflight: { ...data.preflight,
      hubBackupReference: "" } }).preflightGate).toBe("backup_missing");
    expect(summarizeRestart240({ ...data, preflight: { ...data.preflight,
      haBackupReference: data.preflight.hubBackupReference } }).preflightGate).toBe("preflight_duplicate");
    expect(summarizeRestart240({ ...data, preflight: { ...data.preflight,
      originalVmReviewed: false } }).preflightGate).toBe("preflight_checks_missing");
    expect(summarizeRestart240({ ...data, preflight: { ...data.preflight,
      installedVersion: "hub-updated" } }).preflightGate).toBe("baseline_stale");
    expect(summarizeRestart240(data).rebootGate).toBe("await_supervised_restart");
  });

  it("requires an actual witnessed restart, distinct code, sign-in and full five-minute wait", () => {
    const data = rebooted();
    expect(summarizeRestart240(data).rebootGate).toBe("reboot_recorded");
    expect(summarizeRestart240({ ...data, reboot: { ...data.reboot,
      witnessed: false } }).rebootGate).toBe("restart_witness_missing");
    expect(summarizeRestart240({ ...data, reboot: { ...data.reboot,
      reference: data.preflight.baselineReference } }).rebootGate).toBe("restart_reference_duplicate");
    expect(summarizeRestart240({ ...data, reboot: { ...data.reboot,
      waitedMinutes: 4 } }).rebootGate).toBe("restart_snapshot_stale");
    const short = { ...data.reboot, waitedMinutes: 4 };
    short.snapshotKey = reboot240Key(data.preflight, short);
    expect(summarizeRestart240({ ...data, reboot: short }).rebootGate).toBe("recovery_wait_missing");
    expect(summarizeRestart240({ ...data, reboot: { ...data.reboot,
      recordedAt: t1 } }).rebootGate).toBe("restart_time_invalid");
  });

  it("follows dependency order, retains failure HOLD and rejects stale or reused receipts", () => {
    const data = observed();
    const complete = summarizeRestart240(data);
    expect(complete).toMatchObject({ working: 8, outstanding: 0, ownerReportedRecovery: true,
      independentlyVerified: false, repairsAuthorized: false });
    const failed = { ...data.observations.vm!, status: "failed" as const };
    failed.snapshotKey = observation240Key(data.reboot, "vm", failed);
    const withFailure = { ...data, observations: { ...data.observations, vm: failed } };
    expect(summarizeRestart240(withFailure).firstBlocker?.id).toBe("vm");
    expect(summarizeRestart240(withFailure)).toMatchObject({ findings: 1,
      ownerReportedRecovery: false, repairsExecuted: false });
    const partial = { ...data.observations.api!, status: "partial" as const };
    expect(summarizeRestart240({ ...data, observations: { ...data.observations,
      api: partial } }).rows.find(row => row.id === "api")?.gate).toBe("evidence_stale");
    const duplicate = { ...data.observations.api!, reference: data.preflight.hubBackupReference };
    expect(summarizeRestart240({ ...data, observations: { ...data.observations,
      api: duplicate } }).rows.find(row => row.id === "api")?.gate).toBe("duplicate_reference");
    expect(formatRestart240Packet(withFailure)).toContain("First unresolved dependency: Original Home Assistant VirtualBox VM");
  });

  it("exports only code-safe metadata, imports preflight across reboot, rejects corrupt handoff", () => {
    const data = preflight();
    const json = exportRestart240Handoff(data);
    expect(importRestart240Handoff(json).preflight).toEqual(data.preflight);
    expect(summarizeRestart240(importRestart240Handoff(json)).preflightGate).toBe("preflight_ready");
    const bad = JSON.parse(json);
    bad.preflight.installedVersion = "PRIVATE http://internal.host/?token=abc";
    bad.preflight.hubBackupReference = "ALLOWED://bad.secret";
    bad.preflight.snapshotKey = "PRIVATE-DO-NOT-ECHO";
    bad.untrustedToken = "PRIVATE-CREDENTIAL";
    const imported = importRestart240Handoff(JSON.stringify(bad));
    expect(JSON.stringify(imported)).not.toContain("http");
    expect(JSON.stringify(imported)).not.toContain("PRIVATE-DO-NOT-ECHO");
    expect(JSON.stringify(imported)).not.toContain("PRIVATE-CREDENTIAL");
    expect(summarizeRestart240(imported).preflightGate).toBe("scope_missing");
    expect(() => importRestart240Handoff("{}")).toThrow();
    expect(() => importRestart240Handoff("x".repeat(15001))).toThrow();
  });

  it("is a keyboard-native owner worksheet and never automatically restarts Windows", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<WindowsRestart240Panel />);
    expect(screen.getByText(/Remote restart, repair, installation: NO/)).toBeTruthy();
    const toggle = screen.getByRole("button", { name: "Open Build 240 restart worksheet" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Actually installed Hub version (not GitHub main)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record witnessed restart AFTER the recovery wait" })
      .hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Copy preflight / progress JSON for private storage" })
      .hasAttribute("disabled")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
