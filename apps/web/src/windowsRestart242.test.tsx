import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsRestart242Panel } from "./WindowsRestart242Panel";
import {
  defaultRestart240Draft, defaultRestart240Observation, observation240Key,
  preflight240Key, reboot240Key, type Restart240Draft,
} from "./windowsRestart240";
import {
  decision241Key, emptyRestart241Entry, exportRestart241Handoff,
  importRestart241Handoff, source241Key, summarizeRestart241,
  type Restart241Entries,
} from "./windowsRestart241";
import {
  decision242Key, emptyRestart242Entry, formatRestart242Packet, retest242Key,
  summarizeRestart242, type Restart242Entries, type Restart242Handoff,
  type Restart242Status,
} from "./windowsRestart242";

const t1 = "2026-11-03T10:00:00.000Z";
const t2 = "2026-11-03T10:10:00.000Z";
const t3 = "2026-11-03T10:12:00.000Z";
const t4 = "2026-11-03T10:13:00.000Z";
const t5 = "2026-11-03T10:14:00.000Z";
const t6 = "2026-11-03T10:15:00.000Z";
const t7 = "2026-11-03T10:16:00.000Z";

function valid240(tasksWorking = true): Restart240Draft {
  const p = {
    ...defaultRestart240Draft.preflight,
    installedVersion: "hub-installed-240", hubBackupReference: "HUB240-BACKUP",
    haBackupReference: "HUB240-HA-BACKUP", baselineReference: "HUB240-BASE",
    workPaused: true, tasksInspected: true, originalVmReviewed: true,
    recordedAt: t1,
  };
  p.snapshotKey = preflight240Key(p);
  const reboot = {
    ...defaultRestart240Draft.reboot, witnessed: true, signInObserved: true,
    reference: "HUB240-REBOOT", waitedMinutes: 5, recordedAt: t2,
  };
  reboot.snapshotKey = reboot240Key(p, reboot);
  const observations: Restart240Draft["observations"] = {};
  if (tasksWorking) {
    const tasks = { ...defaultRestart240Observation, status: "working" as const,
      source: "task_history" as const, reference: "HUB240-TASKS", recordedAt: t3 };
    tasks.snapshotKey = observation240Key(reboot, "tasks", tasks);
    observations.tasks = tasks;
  }
  const api = {
    ...defaultRestart240Observation, status: "failed" as const,
    source: "direct_screen" as const, reference: "HUB240-API", recordedAt: t3,
  };
  api.snapshotKey = observation240Key(reboot, "api", api);
  observations.api = api;
  return { preflight: p, reboot, observations };
}
function valid241(tasksWorking = true, decision = "request_retest" as const): Restart242Handoff {
  const restart240 = valid240(tasksWorking);
  const source = { ...emptyRestart241Entry, source: "direct_screen" as const,
    sourceReference: "HUB241-API-SOURCE", acknowledged: true, sourceAt: t4 };
  const row = summarizeRestart241(restart240, {}).rows.find(x => x.id === "api")!;
  source.sourceKey = source241Key(restart240, row, source);
  const request = { ...source, decision, decisionReference: "HUB241-DECISION",
    decisionAcknowledged: true, decisionAt: t5 };
  request.decisionKey = decision241Key(request);
  const entries: Restart241Entries = { api: request };
  return { restart240, entries };
}
function retested(src: Restart242Handoff, status: Restart242Status = "failed"): Restart242Entries {
  const row = summarizeRestart241(src.restart240, src.entries).rows.find(x => x.id === "api")!;
  const r = { ...emptyRestart242Entry, status, basis: "direct_screen" as const,
    retestReference: "HUB242-API-RETEST", ownerWitnessed: true, retestAt: t6 };
  r.retestKey = retest242Key(src, row, r);
  return { api: r };
}
function decided(src: Restart242Handoff, status: Restart242Status = "failed") {
  const entries = retested(src, status);
  const d = { ...entries.api!, disposition: "request_repair_review" as const,
    repairScope: "api" as const, rollbackReference: "HUB242-ROLLBACK",
    ownerDecisionReference: "HUB242-OWNER", requestOnlyAcknowledged: true, decisionAt: t7 };
  d.decisionKey = decision242Key(d);
  return { api: d };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 242 first-failure Windows restart retest, safe repair decision handoff", () => {
  it("starts empty, read-only, with independent Windows acceptance and repair authority zero", () => {
    const s = summarizeRestart242(null, {});
    expect(s).toMatchObject({ cases: 0, readyToRetest: 0,
      ownerReportedRecovered: 0, ownerStillFailed: 0,
      repairReviewRequests: 0, independentlyVerified: false,
      repairAuthorized: false, repairExecuted: false, serviceActions: 0,
      sixApps: "DISCONNECTED / HOLD", relay: "OFF", vault: "SECURITY HOLD" });
    expect(formatRestart242Packet(null, {})).toContain("Independent Windows acceptance: NO");
  });
  it("links exactly to a valid Build 241 decision and the first incomplete dependency", () => {
    const src = valid241();
    const s = summarizeRestart242(src, {});
    expect(s.firstUnresolved?.id).toBe("api");
    expect(s).toMatchObject({ cases: 1, readyToRetest: 1 });
    const row = s.rows.find(x => x.id === "api")!;
    expect(row.firstInOrder).toBe(true);
    expect(row.retestGate).toBe("await_actual_retest");
    expect(s.rows.find(x => x.id === "tasks")?.eligible).toBe(false);
    const noDecision = { ...src, entries: {} };
    expect(summarizeRestart242(noDecision, {}).cases).toBe(0);
  });
  it("blocks downstream recovery if an earlier startup dependency was not checked", () => {
    const src = valid241(false);
    const s = summarizeRestart242(src, {});
    expect(s.firstUnresolved?.id).toBe("tasks");
    expect(s.rows.find(x => x.id === "api")?.retestGate).toBe("first_dependency_hold");
    expect(s.readyToRetest).toBe(0);
    expect(summarizeRestart242(src, retested(src, "working")).ownerReportedRecovered).toBe(0);
  });
  it("records only a source-fresh self-report; duplicate, stale or missing witness stay HOLD", () => {
    const src = valid241();
    const complete = summarizeRestart242(src, retested(src, "working"));
    expect(complete.rows.find(x => x.id === "api")?.retestGate)
      .toBe("owner_recovered_unverified");
    expect(complete).toMatchObject({ ownerReportedRecovered: 1,
      independentlyVerified: false, repairAuthorized: false });
    const entries = retested(src);
    expect(summarizeRestart242(src, { api: { ...entries.api!,
      retestReference: src.restart240.observations.api!.reference } }).rows.find(x =>
      x.id === "api")?.retestGate).toBe("reference_duplicate");
    expect(summarizeRestart242(src, { api: { ...entries.api!, ownerWitnessed: false } })
      .rows.find(x => x.id === "api")?.retestGate).toBe("owner_witness_missing");
    expect(summarizeRestart242(src, { api: { ...entries.api!, retestAt: t4 } })
      .rows.find(x => x.id === "api")?.retestGate).toBe("retest_stale");
    const changed = { ...src.entries.api!, decisionReference: "CHANGED-241" };
    expect(summarizeRestart242({ ...src, entries: { api: changed } }, entries)
      .cases).toBe(0);
  });
  it("creates a narrow repair authorization REVIEW request, never a repair approval", () => {
    const src = valid241();
    const entries = decided(src);
    const summary = summarizeRestart242(src, entries);
    expect(summary.rows.find(x => x.id === "api")?.gate)
      .toBe("repair_authorization_review_requested");
    expect(summary).toMatchObject({ repairReviewRequests: 1,
      independentlyVerified: false, repairAuthorized: false,
      repairExecuted: false, serviceActions: 0 });
    const otherScope = { ...entries.api!, repairScope: "vm" as const };
    otherScope.decisionKey = decision242Key(otherScope);
    expect(summarizeRestart242(src, { api: otherScope }).rows.find(x => x.id === "api")?.gate)
      .toBe("scope_mismatch");
    const reused = { ...entries.api!, rollbackReference: entries.api!.retestReference };
    reused.decisionKey = decision242Key(reused);
    expect(summarizeRestart242(src, { api: reused }).rows.find(x => x.id === "api")?.gate)
      .toBe("rollback_missing");
    const changedDecision = { ...entries.api!, disposition: "defer" as const };
    expect(summarizeRestart242(src, { api: changedDecision }).rows.find(x => x.id === "api")?.gate)
      .toBe("decision_stale");
    expect(summarizeRestart242(src, decided(src, "working")).rows.find(x => x.id === "api")?.gate)
      .toBe("repair_not_needed");
  });
  it("validates a code-only Build 241 export across the new retest and strips unknown sensitive fields", () => {
    const source = valid241();
    const raw = exportRestart241Handoff(source.restart240, source.entries);
    const clean = importRestart241Handoff(raw);
    expect(summarizeRestart241(clean.restart240, clean.entries)
      .rows.find(x => x.id === "api")?.decisionGate).toBe("retest_requested");
    const tampered = JSON.parse(raw);
    tampered.privateToken = "PRIVATE-SECRET-TOKEN";
    tampered.entries.api.sourceReference = "http://private.local/secret";
    tampered.entries.api.sourceKey = "SECRET-DO-NOT-RETAIN";
    const imported = importRestart241Handoff(JSON.stringify(tampered));
    expect(JSON.stringify(imported)).not.toContain("PRIVATE-SECRET-TOKEN");
    expect(JSON.stringify(imported)).not.toContain("http://");
    expect(JSON.stringify(imported)).not.toContain("SECRET-DO-NOT-RETAIN");
    expect(summarizeRestart241(imported.restart240, imported.entries)
      .rows.find(x => x.id === "api")?.decisionGate).not.toBe("retest_requested");
    expect(() => importRestart241Handoff("{}")).toThrow();
    expect(() => importRestart241Handoff("x".repeat(40001))).toThrow();
  });
  it("renders a keyboard-accessible, no-network owner worksheet for real evidence only", () => {
    const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    render(<WindowsRestart242Panel />);
    expect(screen.getByText(/Windows installed acceptance: NO/)).toBeTruthy();
    const button = screen.getByRole("button", { name: "Open Build 242 retest worksheet" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Validate owner source and reload cases" })
      .hasAttribute("disabled")).toBe(true);
    const src = valid241();
    fireEvent.change(screen.getByLabelText("Saved Build 241 JSON handoff"), {
      target: { value: exportRestart241Handoff(src.restart240, src.entries) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate owner source and reload cases" }));
    expect(screen.getByText(/Private Build 241 owner handoff imported/)).toBeTruthy();
    expect(screen.getByLabelText("Fresh result seen on the real Windows PC")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
