import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WindowsFieldAcceptance228Panel } from "./WindowsFieldAcceptance228Panel";
import { formatWindowsFieldHandoff, type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, summarizeWindowsTriage,
  windowsFindingSourceKey, type WindowsTriageDraft,
} from "./windowsFindingTriage229";
import {
  defaultClosure231Entry, summarizeWindowsClosure231, windows231EvidenceKey, windows231SourceKey,
  type WindowsClosure231Draft,
} from "./windowsOwnerClosure231";
import {
  defaultIndependent232Entry, formatWindowsIndependentPacket232, summarizeWindowsIndependent232,
  windows232DecisionKey, windows232ReviewerKey, windows232SourceKey, type WindowsIndependent232Entry,
} from "./windowsIndependentClosure232";

const scope = { installedVersion: "win-228", physicallyWitnessed: true };
const source: WindowsFieldDraft = {
  theme: { outcome: "finding", basis: "direct", reference: "WIN-228-THEME", recordedAt: "2020-11-02T17:30:00Z" },
};
const original = summarizeWindowsTriage(source, scope, {}).rows[0];
const plans: WindowsTriageDraft = { theme: {
  ...defaultTriageEntry, sourceKey: windowsFindingSourceKey(original, scope),
  priority: "p1", decision: "repair_proposal", reproduction: "reproduced",
  reproductionReference: "WIN-229-THEME",
} };
const scoped = summarizeWindowsTriage(source, scope, plans).rows[0];
const ownerBase = {
  ...defaultClosure231Entry, sourceKey: windows231SourceKey(scoped, scope),
  installedVersion: "win-231", outcome: "pass" as const, basis: "supervised_retest" as const,
  firstReference: "WIN-231-VIEW-DESKTOP", secondReference: "WIN-231-VIEW-TABLET",
  ownerWitnessed: true, safetyReviewed: true, recordedAt: "2020-11-04T19:00:00Z",
};
const closure231: WindowsClosure231Draft = {
  theme: { ...ownerBase, reviewedEvidenceKey: windows231EvidenceKey(ownerBase) },
};
const ownerRow = summarizeWindowsClosure231(source, scope, plans, {}, closure231).rows[0];

function reviewerEntry(): WindowsIndependent232Entry {
  const base = {
    ...defaultIndependent232Entry, sourceKey: windows232SourceKey(ownerRow),
    reviewerCode: "WIN-232-REVIEWER", reviewerReference: "WIN-232-INDEPENDENT",
    reviewerBasis: "supervised_independent_retest" as const,
    reviewerOutcome: "corroborated" as const, separateReviewerAttested: true,
    reviewerRecordedAt: "2020-11-05T19:00:00Z",
  };
  return { ...base, reviewedEvidenceKey: windows232ReviewerKey(base) };
}

function ownerDecision(entry: WindowsIndependent232Entry, decision: WindowsIndependent232Entry["ownerDecision"] = "request_closure_review") {
  const next = { ...entry, ownerDecision: decision, ownerDecisionReference: "WIN-232-OWNER-DECISION",
    ownerSeparatelyAuthorized: true, ownerRecordedAt: "2020-11-06T19:00:00Z" };
  return { ...next, reviewedDecisionKey: windows232DecisionKey(next) };
}

function review(entry?: WindowsIndependent232Entry, originalSource = source, originalPlans = plans,
  ownerEvidence = closure231) {
  return summarizeWindowsIndependent232(originalSource, scope, originalPlans, {}, ownerEvidence,
    entry ? { theme: entry } : {});
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 232 independent Windows source reconciliation and owner decisions", () => {
  it("starts with no invented Windows findings, external reviewer, repair or closure", () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(summarizeWindowsIndependent232({}, { installedVersion: "", physicallyWitnessed: false }, {}, {}, {}, {}))
      .toMatchObject({ reportedFindings: 0, reviewRequests: 0, verifiedClosures: 0, independentlyAuthenticated: false, repairsExecuted: false });
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Windows independent evidence reconciliation & authorized closure decisions" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 232 independent review totals")).toHaveTextContent("Verified Windows closures0");
    expect(screen.getByText(/No authentic Build 228–231 Windows owner findings/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires the exact Build 228–231 owner packet before accepting any separate review", () => {
    expect(review().rows[0].gate).toBe("not_started");
    expect(review(reviewerEntry()).rows[0].gate).toBe("owner_decision_needed");
    expect(review(reviewerEntry(), source, plans, {}).rows[0].gate).toBe("awaiting_231_owner_packet");
    expect(review(reviewerEntry(), source, { theme: { ...plans.theme!, priority: "p0" } }).rows[0].gate).toBe("awaiting_231_owner_packet");
    expect(review(reviewerEntry(), { theme: { ...source.theme!, reference: "WIN-228-THEME-NEW" } }).rows[0].gate).toBe("awaiting_231_owner_packet");
    const changedOptionalSource = { theme: { ...closure231.theme!, reviewerReference: "WIN-231-NEW-REVIEWER" } };
    expect(review(reviewerEntry(), source, plans, changedOptionalSource).rows[0].gate).toBe("source_changed");
  });

  it("rejects reused source identifiers, same reviewer/proof codes, missing attestation and stale reviewer records", () => {
    const entry = reviewerEntry();
    expect(review({ ...entry, reviewerReference: "WIN-231-VIEW-TABLET" }).rows[0].gate).toBe("independent_reference_gap");
    expect(review({ ...entry, reviewerReference: entry.reviewerCode }).rows[0].gate).toBe("independent_reference_gap");
    expect(review({ ...entry, separateReviewerAttested: false }).rows[0].gate).toBe("independence_attestation_gap");
    expect(review({ ...entry, reviewerRecordedAt: "2020-11-02T19:00:00Z" }).rows[0].gate).toBe("reviewer_freshness_gap");
    expect(review({ ...entry, reviewerCode: "WIN-232-CHANGED" }).rows[0].gate).toBe("reviewer_freshness_gap");
    expect(review({ ...entry, sourceKey: "STALE" }).rows[0].gate).toBe("source_changed");
  });

  it("requires a fresh separate owner authorization and never claims a real independent closure", () => {
    const entry = reviewerEntry();
    expect(review(entry).rows[0].gate).toBe("owner_decision_needed");
    const ready = ownerDecision(entry);
    expect(review(ready)).toMatchObject({ reviewRequests: 1, verifiedClosures: 0, independentlyAuthenticated: false });
    expect(review(ready).rows[0].gate).toBe("owner_closure_review_request");
    expect(review({ ...ready, ownerSeparatelyAuthorized: false }).rows[0].gate).toBe("owner_authorization_gap");
    expect(review({ ...ready, ownerDecisionReference: entry.reviewerReference }).rows[0].gate).toBe("owner_authorization_gap");
    expect(review({ ...ready, ownerRecordedAt: "2020-11-03T12:00:00Z" }).rows[0].gate).toBe("owner_freshness_gap");
    expect(review({ ...ready, ownerDecision: "defer" }).rows[0].gate).toBe("owner_freshness_gap");
    const packet = formatWindowsIndependentPacket232(source, scope, plans, {}, closure231, { theme: ready });
    expect(packet).toContain("verified closures 0");
    expect(packet).toContain("reviewer independence NOT AUTHENTICATED");
    expect(packet).toContain("DISCONNECTED / HOLD");
  });

  it("keeps reviewer conflicts open while allowing an owner to request a retest or defer", () => {
    const base = { ...reviewerEntry(), reviewerOutcome: "conflict" as const };
    const conflict = { ...base, reviewedEvidenceKey: windows232ReviewerKey(base) };
    expect(review(conflict).rows[0].gate).toBe("reviewer_conflict");
    expect(review(ownerDecision(conflict, "request_retest")).rows[0].gate).toBe("owner_retest_requested");
    expect(review(ownerDecision(conflict, "defer")).rows[0].gate).toBe("owner_deferred");
    expect(review(ownerDecision(conflict, "request_closure_review")).rows[0].gate).toBe("reviewer_conflict");
    const insufficientBase = { ...reviewerEntry(), reviewerOutcome: "insufficient" as const };
    const insufficient = { ...insufficientBase, reviewedEvidenceKey: windows232ReviewerKey(insufficientBase) };
    expect(review(insufficient).rows[0].gate).toBe("reviewer_insufficient");
  });

  it("reads private Build 228/229 handoffs, records independent metadata and owner disposition locally", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 228 private handoff/),
      { target: { value: formatWindowsFieldHandoff(source, scope) } });
    fireEvent.click(screen.getByRole("button", { name: /Replace current session observations/ }));
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 229 private repair plan/),
      { target: { value: formatWindowsFindingPlan229(source, scope, plans) } });
    fireEvent.click(screen.getByRole("button", { name: "Import matching Build 229 plan and reset retests" }));
    const ownerCard = screen.getByLabelText("Build 231 source-linked Windows closure reviews").querySelector("article")!;
    fireEvent.change(ownerCard.querySelector("input#windows-231-version-theme")!, { target: { value: "win-231" } });
    fireEvent.change(ownerCard.querySelector("select#windows-231-outcome-theme")!, { target: { value: "pass" } });
    fireEvent.change(ownerCard.querySelector("select#windows-231-basis-theme")!, { target: { value: "direct" } });
    fireEvent.change(ownerCard.querySelector("input#windows-231-first-theme")!, { target: { value: "WIN-231-DESKTOP" } });
    fireEvent.change(ownerCard.querySelector("input#windows-231-second-theme")!, { target: { value: "WIN-231-TABLET" } });
    ownerCard.querySelectorAll(".windows-closure-231-confirmations input[type=checkbox]").forEach(control => fireEvent.click(control));
    fireEvent.click(ownerCard.querySelector("button")!);
    expect(screen.getByLabelText("Build 232 independent review totals")).toHaveTextContent("Owner-reported original findings1");
    const card = screen.getByLabelText("Build 232 source-matched independent review cases").querySelector("article")!;
    fireEvent.change(card.querySelector("input#windows-232-reviewer-code-theme")!, { target: { value: "WIN-232-REVIEWER" } });
    fireEvent.change(card.querySelector("input#windows-232-reviewer-ref-theme")!, { target: { value: "WIN-232-EVIDENCE" } });
    fireEvent.change(card.querySelector("select#windows-232-reviewer-basis-theme")!, { target: { value: "independent_observation" } });
    fireEvent.change(card.querySelector("select#windows-232-reviewer-outcome-theme")!, { target: { value: "corroborated" } });
    fireEvent.click(card.querySelectorAll(".windows-independent-232-confirmations input[type=checkbox]")[0]);
    fireEvent.click(card.querySelector("button")!);
    fireEvent.change(card.querySelector("select#windows-232-owner-decision-theme")!, { target: { value: "request_closure_review" } });
    fireEvent.change(card.querySelector("input#windows-232-owner-ref-theme")!, { target: { value: "WIN-232-OWNER" } });
    fireEvent.click(card.querySelectorAll(".windows-independent-232-confirmations input[type=checkbox]")[1]);
    fireEvent.click(card.querySelectorAll("button")[1]);
    expect(screen.getByLabelText("Build 232 independent review totals")).toHaveTextContent("Owner closure review requests (unverified)1");
    expect(screen.getByLabelText("Build 232 independent review totals")).toHaveTextContent("Verified Windows closures0");
    expect(fetch).not.toHaveBeenCalled();
  });
});
