import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WindowsFieldAcceptance228Panel } from "./WindowsFieldAcceptance228Panel";
import { formatWindowsFieldHandoff, type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, summarizeWindowsTriage,
  windowsFindingSourceKey, type WindowsTriageDraft,
} from "./windowsFindingTriage229";
import {
  defaultWindowsRetest, summarizeWindowsRecoveryRetests, windows230ChangeKey,
  windows230SourceKey, type WindowsRetestDraft,
} from "./windowsRecoveryRetest230";
import {
  defaultClosure231Entry, formatWindowsClosure231Packet, summarizeWindowsClosure231,
  windows231EvidenceKey, windows231SourceKey, type WindowsClosure231Entry,
} from "./windowsOwnerClosure231";

const scope = { installedVersion: "win-228", physicallyWitnessed: true };
const source: WindowsFieldDraft = {
  theme: { outcome: "finding", basis: "direct", reference: "WIN-228-THEME", recordedAt: "2020-11-02T17:30:00Z" },
  keyboard: { outcome: "blocked", basis: "direct", reference: "WIN-228-KEY", recordedAt: "2020-11-02T17:31:00Z" },
  roles: { outcome: "finding", basis: "direct", reference: "WIN-228-ROLES", recordedAt: "2020-11-02T17:32:00Z" },
  backup: { outcome: "finding", basis: "local_log", reference: "WIN-228-BACKUP", recordedAt: "2020-11-02T17:33:00Z" },
  resources: { outcome: "blocked", basis: "direct", reference: "WIN-228-RESOURCE", recordedAt: "2020-11-02T17:34:00Z" },
};
const baselineRows = summarizeWindowsTriage(source, scope, {}).rows;
const plans: WindowsTriageDraft = Object.fromEntries(baselineRows.map(row => [row.id, {
  ...defaultTriageEntry, sourceKey: windowsFindingSourceKey(row, scope),
  priority: "p1" as const, decision: "repair_proposal" as const,
  reproduction: "reproduced" as const, reproductionReference: `WIN-229-${row.id.toUpperCase()}`,
}]));

function validBackupRetest() {
  const scoped = summarizeWindowsTriage(source, scope, plans).rows.find(row => row.id === "backup")!;
  const retest = {
    ...defaultWindowsRetest, sourceKey: windows230SourceKey(scoped, scope),
    ownerChangeAttested: true, changeReference: "WIN-230-BACKUP-CHANGE",
    changeRecordedAt: "2020-11-03T18:00:00Z", safetyReviewed: true,
    installedVersion: "win-230", outcome: "pass" as const,
    basis: "supervised_retest" as const, reference: "WIN-230-BACKUP-TEST",
    retestWitnessed: true, retestRecordedAt: "2020-11-03T18:30:00Z",
  };
  return { ...retest, testedChangeKey: windows230ChangeKey(retest) };
}

function ownerEntry(id: "theme" | "backup", retests: WindowsRetestDraft = {}) {
  const original = summarizeWindowsTriage(source, scope, plans).rows.find(row => row.id === id)!;
  const prior = summarizeWindowsRecoveryRetests(source, scope, plans, retests).rows.find(row => row.id === id);
  const entry = {
    ...defaultClosure231Entry, sourceKey: windows231SourceKey(original, scope, prior),
    installedVersion: "win-231", outcome: "pass" as const,
    basis: "supervised_retest" as const,
    firstReference: "WIN-231-SCREEN-A", secondReference: "WIN-231-SCREEN-B",
    ownerWitnessed: true, safetyReviewed: true,
    recordedAt: "2020-11-04T19:00:00Z",
  };
  return { ...entry, reviewedEvidenceKey: windows231EvidenceKey(entry) };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 231 Windows accessibility, role, backup and resource closure safety", () => {
  it("starts with zero real findings, no fabricated acceptance and no network calls", () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(summarizeWindowsClosure231({}, { installedVersion: "", physicallyWitnessed: false }, {}, {}, {}))
      .toMatchObject({ scopedFindings: 0, ownerPacketsReady: 0, independentClosures: 0, independentVerification: false, automaticRemediation: false });
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Accessibility, roles, backup & resource closure" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 231 owner closure totals")).toHaveTextContent("Authentic owner-reported findings0");
    expect(screen.getByText(/No authentic installed-Windows accessibility, role, backup or resource findings/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts theme/keyboard/roles only after source-scoped plans, and blocks backup and resources without fresh Build 230", () => {
    const noPlan = summarizeWindowsClosure231(source, scope, {}, {}, {});
    expect(noPlan.rows).toHaveLength(5);
    expect(noPlan.rows.every(row => row.gate === "awaiting_229_scope")).toBe(true);
    const scoped = summarizeWindowsClosure231(source, scope, plans, {}, {});
    expect(scoped.rows.find(row => row.id === "theme")?.gate).toBe("not_started");
    expect(scoped.rows.find(row => row.id === "keyboard")?.gate).toBe("not_started");
    expect(scoped.rows.find(row => row.id === "roles")?.gate).toBe("not_started");
    expect(scoped.rows.find(row => row.id === "backup")?.gate).toBe("awaiting_230_retest");
    expect(scoped.rows.find(row => row.id === "resources")?.gate).toBe("awaiting_230_retest");
    expect(scoped.needsEarlierSource).toBe(2);
  });

  it("requires two fresh non-reused references, physical witness, reviewed safety and a later explicit record", () => {
    const complete = ownerEntry("theme");
    const summary = (entry: WindowsClosure231Entry) => summarizeWindowsClosure231(source, scope, plans, {}, { theme: entry });
    expect(summary(complete)).toMatchObject({ ownerPacketsReady: 1, independentClosures: 0, automaticRemediation: false });
    expect(summary(complete).rows.find(row => row.id === "theme")?.gate).toBe("owner_packet_ready");
    expect(summary({ ...complete, ownerWitnessed: false }).rows.find(row => row.id === "theme")?.gate).toBe("owner_witness_gap");
    expect(summary({ ...complete, firstReference: "WIN-228-THEME" }).rows.find(row => row.id === "theme")?.gate).toBe("evidence_gap");
    expect(summary({ ...complete, secondReference: complete.firstReference }).rows.find(row => row.id === "theme")?.gate).toBe("evidence_gap");
    expect(summary({ ...complete, recordedAt: "2020-11-01T18:00:00Z" }).rows.find(row => row.id === "theme")?.gate).toBe("freshness_gap");
    expect(summary({ ...complete, outcome: "still_failing" }).rows.find(row => row.id === "theme")?.gate).toBe("freshness_gap");
    const failing = { ...complete, outcome: "still_failing" as const };
    expect(summary({ ...failing, reviewedEvidenceKey: windows231EvidenceKey(failing) }).rows.find(row => row.id === "theme")?.gate).toBe("still_failing");
    expect(formatWindowsClosure231Packet(source, scope, plans, {}, { theme: complete })).toContain("independently closed: 0");
    expect(formatWindowsClosure231Packet(source, scope, plans, {}, { theme: complete })).toContain("DISCONNECTED / HOLD");
  });

  it("rejects stale Build 228/229 source and requires a fully refreshed Build 230 backup retest", () => {
    const retests: WindowsRetestDraft = { backup: validBackupRetest() };
    expect(summarizeWindowsRecoveryRetests(source, scope, plans, retests).rows.find(row => row.id === "backup")?.gate).toBe("owner_closure_candidate");
    const entry = ownerEntry("backup", retests);
    const review = (sourceOverride = source, plansOverride = plans, retestsOverride = retests) =>
      summarizeWindowsClosure231(sourceOverride, scope, plansOverride, retestsOverride, { backup: entry })
        .rows.find(row => row.id === "backup")?.gate;
    expect(review()).toBe("owner_packet_ready");
    expect(review(source, plans, { backup: { ...retests.backup!, retestWitnessed: false } })).toBe("awaiting_230_retest");
    expect(review(source, plans, { backup: { ...retests.backup!, basis: "direct" } })).toBe("source_changed");
    expect(review(source, { ...plans, backup: { ...plans.backup!, priority: "p0" } })).toBe("awaiting_230_retest");
    expect(review({ ...source, backup: { ...source.backup!, reference: "WIN-228-BACKUP-NEW" } })).toBe("awaiting_229_scope");
  });

  it("lets the owner import prior private handoffs and record a fresh check without a false closure or remote call", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 228 private handoff/),
      { target: { value: formatWindowsFieldHandoff(source, scope) } });
    fireEvent.click(screen.getByRole("button", { name: /Replace current session observations/ }));
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 229 private repair plan/),
      { target: { value: formatWindowsFindingPlan229(source, scope, plans) } });
    fireEvent.click(screen.getByRole("button", { name: "Import matching Build 229 plan and reset retests" }));
    expect(screen.getByLabelText("Build 231 owner closure totals")).toHaveTextContent("Authentic owner-reported findings5");
    const theme = screen.getByLabelText("Build 231 source-linked Windows closure reviews").querySelector("article")!;
    expect(theme).toHaveTextContent("Standard theme");
    fireEvent.change(theme.querySelector("input#windows-231-version-theme")!, { target: { value: "win-231" } });
    fireEvent.change(theme.querySelector("select#windows-231-outcome-theme")!, { target: { value: "pass" } });
    fireEvent.change(theme.querySelector("select#windows-231-basis-theme")!, { target: { value: "direct" } });
    fireEvent.change(theme.querySelector("input#windows-231-first-theme")!, { target: { value: "WIN-231-SCREEN-A" } });
    fireEvent.change(theme.querySelector("input#windows-231-second-theme")!, { target: { value: "WIN-231-SCREEN-B" } });
    theme.querySelectorAll(".windows-closure-231-confirmations input[type=checkbox]").forEach(control => fireEvent.click(control));
    fireEvent.click(theme.querySelector("button")!);
    expect(screen.getByLabelText("Build 231 owner closure totals")).toHaveTextContent("Owner packets ready (unverified)1");
    expect(screen.getByLabelText("Build 231 owner closure totals")).toHaveTextContent("Independently closed0");
    expect(fetch).not.toHaveBeenCalled();
  });
});
