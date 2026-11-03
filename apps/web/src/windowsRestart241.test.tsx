import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsRestart241Panel } from "./WindowsRestart241Panel";
import {
  defaultRestart240Draft, defaultRestart240Observation, exportRestart240Handoff,
  observation240Key, preflight240Key, reboot240Key, type Restart240Draft,
} from "./windowsRestart240";
import {
  decision241Key, emptyRestart241Entry, formatRestart241Packet,
  source241Key, summarizeRestart241, type Restart241Entries, type Restart241Entry,
} from "./windowsRestart241";

const t1 = "2026-11-03T10:00:00.000Z";
const t2 = "2026-11-03T10:10:00.000Z";
const t3 = "2026-11-03T10:11:00.000Z";
const t4 = "2026-11-03T10:12:00.000Z";
const t5 = "2026-11-03T10:13:00.000Z";
function realSource(kind: "failed" | "partial" | "not_configured" | "working" = "failed"): Restart240Draft {
  const p = {
    ...defaultRestart240Draft.preflight, installedVersion: "hub-installed-240",
    hubBackupReference: "WIN240-HUB", haBackupReference: "WIN240-HOME",
    baselineReference: "WIN240-BASE", workPaused: true, tasksInspected: true,
    originalVmReviewed: true, recordedAt: t1,
  };
  p.snapshotKey = preflight240Key(p);
  const reboot = {
    ...defaultRestart240Draft.reboot, witnessed: true, signInObserved: true,
    reference: "WIN240-REBOOT", waitedMinutes: 5, recordedAt: t2,
  };
  reboot.snapshotKey = reboot240Key(p, reboot);
  const original = {
    ...defaultRestart240Observation, status: kind, source: "direct_screen" as const,
    reference: "WIN240-VM", recordedAt: t3,
  };
  original.snapshotKey = observation240Key(reboot, "vm", original);
  return { preflight: p, reboot, observations: { vm: original } };
}
function reviewed(source: Restart240Draft): Restart241Entries {
  const base: Restart241Entry = {
    ...emptyRestart241Entry, source: "direct_screen",
    sourceReference: "WIN241-VM-SOURCE", acknowledged: true, sourceAt: t4,
  };
  const row = summarizeRestart241(source, {}).rows.find(x => x.id === "vm")!;
  base.sourceKey = source241Key(source, row, base);
  return { vm: base };
}
function decision(source: Restart240Draft, action: Restart241Entry["decision"] = "request_repair_review") {
  const entries = reviewed(source);
  const item = { ...entries.vm!, decision: action, scope: "vm" as const,
    rollbackReference: action === "request_repair_review" ? "WIN241-ROLLBACK" : "",
    decisionReference: "WIN241-DECISION", decisionAcknowledged: true, decisionAt: t5 };
  item.decisionKey = decision241Key(item);
  return { vm: item };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Build 241 post-restart owner provenance and conditional repair HOLD", () => {
  it("begins with zero genuine restart results and never claims device changes", () => {
    const s = summarizeRestart241(null, {});
    expect(s).toMatchObject({
      restartGate: "preflight_hold", cases: 0, sourceReviewed: 0,
      repairReviewRequests: 0, independentVerification: false,
      repairAuthorized: false, repairExecuted: false, changesMade: 0, liveCommands: 0,
      sixApps: "DISCONNECTED / HOLD", relay: "OFF", vault: "SECURITY HOLD",
    });
    expect(formatRestart241Packet(null, {})).toContain("Independent verification: NO");
  });
  it("rejects false/partial restart baseline and does not invent missing evidence", () => {
    const p = realSource();
    expect(summarizeRestart241({ ...p, reboot: defaultRestart240Draft.reboot }, {}).cases).toBe(0);
    const s = summarizeRestart241(p, {});
    expect(s.cases).toBe(1);
    expect(s.firstUnresolved?.id).toBe("tasks");
    expect(s.rows.find(x => x.id === "vm")?.sourceGate).toBe("source_missing");
    expect(s.rows.find(x => x.id === "mqtt")?.sourceGate).toBe("upstream_evidence_hold");
    expect(s.rows.find(x => x.id === "vm")?.repairCandidate).toBe(true);
  });
  it("reconciles original source; stale, missing witness, duplicate receipts remain HOLD", () => {
    const p = realSource();
    const e = reviewed(p);
    expect(summarizeRestart241(p, e).rows.find(x => x.id === "vm")?.sourceGate)
      .toBe("source_reviewed");
    expect(summarizeRestart241(p, { vm: { ...e.vm!, acknowledged: false } })
      .rows.find(x => x.id === "vm")?.sourceGate).toBe("source_witness_missing");
    expect(summarizeRestart241(p, { vm: { ...e.vm!, sourceReference: p.reboot.reference } })
      .rows.find(x => x.id === "vm")?.sourceGate).toBe("source_reference_duplicate");
    const changed = { ...p.observations.vm!, status: "partial" as const };
    changed.snapshotKey = observation240Key(p.reboot, "vm", changed);
    expect(summarizeRestart241({ ...p, observations: { vm: changed } }, e)
      .rows.find(x => x.id === "vm")?.sourceGate).toBe("source_stale");
  });
  it("permits only a narrowly scoped review REQUEST with separate rollback reference", () => {
    const p = realSource();
    const entries = decision(p);
    const s = summarizeRestart241(p, entries);
    expect(s.rows.find(x => x.id === "vm")?.decisionGate)
      .toBe("conditional_repair_review_requested");
    expect(s).toMatchObject({ repairReviewRequests: 1, repairAuthorized: false, changesMade: 0 });
    const invalidScope = { ...entries.vm!, scope: "mqtt" as const };
    invalidScope.decisionKey = decision241Key(invalidScope);
    expect(summarizeRestart241(p, { vm: invalidScope }).rows.find(x => x.id === "vm")?.decisionGate)
      .toBe("repair_scope_mismatch");
    const duplicate = { ...entries.vm!, rollbackReference: entries.vm!.sourceReference };
    duplicate.decisionKey = decision241Key(duplicate);
    expect(summarizeRestart241(p, { vm: duplicate }).rows.find(x => x.id === "vm")?.decisionGate)
      .toBe("rollback_missing");
    const changedDecision = { ...entries.vm!, decision: "defer" as const };
    expect(summarizeRestart241(p, { vm: changedDecision }).rows.find(x => x.id === "vm")?.decisionGate)
      .toBe("decision_stale");
    expect(formatRestart241Packet(p, entries)).toContain("conditional_repair_review_requested");
  });
  it("supports retest, independent proof and defer, without treating unconfigured as a repair", () => {
    const p = realSource("not_configured");
    expect(summarizeRestart241(p, decision(p, "request_retest"))
      .rows.find(x => x.id === "vm")?.decisionGate).toBe("retest_requested");
    expect(summarizeRestart241(p, decision(p, "request_independent_proof"))
      .rows.find(x => x.id === "vm")?.decisionGate).toBe("independent_proof_requested");
    expect(summarizeRestart241(p, decision(p, "defer"))
      .rows.find(x => x.id === "vm")?.decisionGate).toBe("deferred_under_review");
    expect(summarizeRestart241(p, decision(p))
      .rows.find(x => x.id === "vm")?.decisionGate).toBe("repair_status_ineligible");
    expect(summarizeRestart241(realSource("working"), {}).cases).toBe(0);
  });
  it("keeps imported Build 240 source code-only and the UI completely read-only", () => {
    const spy = vi.fn(); vi.stubGlobal("fetch", spy);
    render(<WindowsRestart241Panel />);
    expect(screen.getByText(/Windows changes performed: 0/)).toBeTruthy();
    const open = screen.getByRole("button", { name: "Open Build 241 recovery worksheet" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    expect(screen.getByRole("button", { name: "Validate Build 240 owner restart source" })
      .hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Paste privately saved, code-only Build 240 JSON"), {
      target: { value: exportRestart240Handoff(realSource()) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate Build 240 owner restart source" }));
    expect(screen.getByText(/Code-only Build 240 self-report imported/)).toBeTruthy();
    expect(screen.getByText(/Original owner state: failed/)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });
});
