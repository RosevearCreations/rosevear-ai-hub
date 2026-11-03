import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsDarkOwner233Panel } from "./WindowsDarkOwner233Panel";
import { type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import { defaultTriageEntry, summarizeWindowsTriage, windowsFindingSourceKey, type WindowsTriageDraft } from "./windowsFindingTriage229";
import { defaultClosure231Entry, summarizeWindowsClosure231, windows231EvidenceKey, windows231SourceKey,
  type WindowsClosure231Draft } from "./windowsOwnerClosure231";
import { defaultIndependent232Entry, summarizeWindowsIndependent232, windows232DecisionKey, windows232ReviewerKey,
  windows232SourceKey, type WindowsIndependent232Draft } from "./windowsIndependentClosure232";
import {
  closure233DecisionKey, closure233SourceKey, dark233Snapshot, defaultClosure233Followup,
  defaultDark233Observation, formatDarkOwnerPacket233, summarizeClosureExceptions233, summarizeDarkOwner233,
  type Closure233Followup, type Dark233Observation,
} from "./windowsDarkOwner233";

const scope = { installedVersion: "win-228", physicallyWitnessed: true };
const field: WindowsFieldDraft = {
  theme: { outcome: "finding", basis: "direct", reference: "WIN-228-APPEARANCE", recordedAt: "2020-11-02T18:00:00Z" },
};
const original = summarizeWindowsTriage(field, scope, {}).rows[0];
const plans: WindowsTriageDraft = { theme: {
  ...defaultTriageEntry, sourceKey: windowsFindingSourceKey(original, scope),
  decision: "repair_proposal", priority: "p1", reproduction: "reproduced", reproductionReference: "WIN-229-OBSERVED",
} };
const triage = summarizeWindowsTriage(field, scope, plans).rows[0];
const closureBase = {
  ...defaultClosure231Entry, sourceKey: windows231SourceKey(triage, scope),
  installedVersion: "win-231", outcome: "pass" as const, basis: "direct" as const,
  firstReference: "WIN-231-DESKTOP", secondReference: "WIN-231-TABLET", ownerWitnessed: true,
  safetyReviewed: true, recordedAt: "2020-11-04T19:00:00Z",
};
const closure231: WindowsClosure231Draft = { theme: {
  ...closureBase, reviewedEvidenceKey: windows231EvidenceKey(closureBase),
} };
const ownerSource = summarizeWindowsClosure231(field, scope, plans, {}, closure231).rows[0];
const reviewerBase = { ...defaultIndependent232Entry, sourceKey: windows232SourceKey(ownerSource),
  reviewerCode: "WIN-232-REVIEWER", reviewerReference: "WIN-232-EXTERNAL",
  reviewerBasis: "independent_observation" as const, reviewerOutcome: "corroborated" as const,
  separateReviewerAttested: true, reviewerRecordedAt: "2020-11-05T19:00:00Z",
};
const reviewer = { ...reviewerBase, reviewedEvidenceKey: windows232ReviewerKey(reviewerBase),
  ownerDecision: "request_closure_review" as const, ownerDecisionReference: "WIN-232-OWNER",
  ownerSeparatelyAuthorized: true, ownerRecordedAt: "2020-11-06T19:00:00Z",
};
const independent232: WindowsIndependent232Draft = { theme: {
  ...reviewer, reviewedDecisionKey: windows232DecisionKey(reviewer),
} };
const independentRow = summarizeWindowsIndependent232(field, scope, plans, {}, closure231, independent232).rows[0];
const proposal: Closure233Followup = { ...defaultClosure233Followup, sourceKey: closure233SourceKey(independentRow),
  disposition: "request_external_validation" as const, reference: "WIN-233-FOLLOWUP", ownerAuthorizedFollowup: true,
  recordedAt: "2020-11-07T19:00:00Z",
};
const accepted = { ...proposal, reviewedKey: closure233DecisionKey(proposal) };
const exceptions = (entry: Closure233Followup = accepted, upstream = independent232) =>
  summarizeClosureExceptions233(field, scope, plans, {}, closure231, upstream, { theme: entry });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 233 Windows Dark Mode owner acceptance and independent closure exception follow-up", () => {
  it("starts with no fabricated Windows observations, repair or verified closure and never fetches data", () => {
    vi.stubGlobal("fetch", vi.fn());
    const appearance = summarizeDarkOwner233("dark", { installedVersion: "", physicallyWitnessed: false }, {});
    const closure = summarizeClosureExceptions233({}, { installedVersion: "", physicallyWitnessed: false }, {}, {}, {}, {}, {});
    expect(appearance).toMatchObject({ ownerPasses: 0, openFindings: 0, completeOwnerReview: false,
      verifiedWindowsAcceptance: false, repairsAuthorized: false });
    expect(closure).toMatchObject({ openExceptions: 0, recordedFollowups: 0, verifiedClosures: 0,
      independentlyAuthenticated: false, repairsAuthorized: false });
    render(<WindowsDarkOwner233Panel theme="dark" field={{}} scope={{ installedVersion: "", physicallyWitnessed: false }}
      plans={{}} retests={{}} closure231={{}} independent232={{}} />);
    expect(screen.getByRole("heading", { name: "Dark Mode owner acceptance & verified-closure exception follow-up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 233 owner Dark Mode acceptance totals")).toHaveTextContent("Owner-reported visual passes0/5");
    expect(screen.getByLabelText("Build 233 closure exception totals")).toHaveTextContent("Independently verified closures0");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires real Windows version, witness, evidence and fresh matched observation for a Dark Mode pass", () => {
    const entry = { ...defaultDark233Observation, outcome: "pass" as const, basis: "direct_windows" as const,
      reference: "WIN-233-SURFACES", installedVersion: scope.installedVersion, ownerWitnessed: true,
      observedAt: "2020-11-07T20:00:00Z" };
    const recorded = { ...entry, checkedSnapshot: dark233Snapshot("surfaces", "dark", scope, entry) };
    const review = (candidate: Dark233Observation = recorded, theme: "dark" | "standard" = "dark", installed = scope) =>
      summarizeDarkOwner233(theme, installed, { surfaces: candidate }).rows[0];
    expect(review().gate).toBe("owner_pass");
    expect(review(recorded, "standard").gate).toBe("dark_mode_inactive");
    expect(review(recorded, "dark", { ...scope, installedVersion: "win-NEW" }).gate).toBe("evidence_gap");
    expect(review({ ...recorded, ownerWitnessed: false }).gate).toBe("evidence_gap");
    expect(review({ ...recorded, checkedSnapshot: "" }).gate).toBe("owner_record_needed");
    expect(review({ ...recorded, reference: "WIN-233-CHANGED" }).gate).toBe("source_changed");
    expect(review({ ...recorded, observedAt: "" }).gate).toBe("owner_record_needed");
    expect(review({ ...recorded, outcome: "finding" }).gate).toBe("source_changed");
    expect(summarizeDarkOwner233("dark", scope, { surfaces: recorded, status: recorded }).rows[0].gate).toBe("evidence_gap");
    expect(summarizeDarkOwner233("dark", scope, { surfaces: recorded }).verifiedWindowsAcceptance).toBe(false);
  });

  it("keeps genuine owner visual findings as unauthorised candidates and never claims release acceptance", () => {
    const item = { ...defaultDark233Observation, outcome: "finding" as const,
      basis: "supervised_windows" as const, reference: "WIN-233-CLIPPING",
      installedVersion: scope.installedVersion, ownerWitnessed: true, observedAt: "2020-11-07T20:00:00Z" };
    const result = summarizeDarkOwner233("dark", scope, { responsive: { ...item,
      checkedSnapshot: dark233Snapshot("responsive", "dark", scope, item) } });
    expect(result).toMatchObject({ ownerPasses: 0, openFindings: 1, repairsAuthorized: false,
      verifiedWindowsAcceptance: false });
    expect(result.rows.find(row => row.id === "responsive")?.gate).toBe("open_finding");
  });

  it("links each exception follow-up to the original 228–232 chain but cannot authenticate or close it", () => {
    expect(independentRow.gate).toBe("owner_closure_review_request");
    expect(exceptions()).toMatchObject({ openExceptions: 1, recordedFollowups: 1,
      independentlyAuthenticated: false, verifiedClosures: 0, repairsAuthorized: false });
    expect(exceptions().rows[0].gate).toBe("external_validation_requested");
    expect(exceptions({ ...accepted, reference: "WIN-232-EXTERNAL" }).rows[0].gate).toBe("invalid_reference");
    expect(exceptions({ ...accepted, ownerAuthorizedFollowup: false }).rows[0].gate).toBe("owner_permission_needed");
    expect(exceptions({ ...accepted, sourceKey: "STALE" }).rows[0].gate).toBe("source_changed");
    expect(exceptions({ ...accepted, recordedAt: "" }).rows[0].gate).toBe("observation_stale");
    expect(exceptions({ ...accepted, recordedAt: "2020-11-03T12:00:00Z" }).rows[0].gate).toBe("observation_stale");
    expect(exceptions({ ...accepted, disposition: "request_retest" }).rows[0].gate).toBe("observation_stale");
    const changed = { theme: { ...independent232.theme!, reviewerReference: "WIN-232-REVISED" } };
    expect(exceptions(accepted, changed).rows[0].gate).toBe("source_changed");
  });

  it("rejects unsupported external validation, permits distinct defer/retest and preserves hold boundaries", () => {
    const insufficient = { ...independent232.theme!, reviewerOutcome: "insufficient" as const };
    const upstream = { theme: { ...insufficient, reviewedEvidenceKey: windows232ReviewerKey(insufficient) } };
    expect(exceptions(accepted, upstream).rows[0].gate).toBe("source_changed");
    const upstreamRow = summarizeWindowsIndependent232(field, scope, plans, {}, closure231, upstream).rows[0];
    const proposal2 = { ...accepted, sourceKey: closure233SourceKey(upstreamRow), reviewedKey: "" };
    const rebased = { ...proposal2, reviewedKey: closure233DecisionKey(proposal2) };
    expect(exceptions(rebased, upstream).rows[0].gate).toBe("validation_not_eligible");
    const defer = { ...rebased, disposition: "defer" as const, reviewedKey: "" };
    expect(exceptions({ ...defer, reviewedKey: closure233DecisionKey(defer) }, upstream).rows[0].gate).toBe("owner_deferred");
    const retest = { ...rebased, disposition: "request_retest" as const, reviewedKey: "" };
    expect(exceptions({ ...retest, reviewedKey: closure233DecisionKey(retest) }, upstream).rows[0].gate).toBe("retest_requested");
    expect(exceptions().sixAppIntegration).toBe("DISCONNECTED / HOLD");
  });

  it("supports accessible owner entry with no external request, and exports redacted review metadata", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsDarkOwner233Panel theme="dark" field={field} scope={scope}
      plans={plans} retests={{}} closure231={closure231} independent232={independent232} />);
    const visualCard = screen.getByLabelText("Build 233 installed Windows visual acceptance checks").querySelector("article")!;
    expect(visualCard.querySelector("button")!).toBeDisabled();
    fireEvent.change(visualCard.querySelector("select")!, { target: { value: "pass" } });
    fireEvent.change(visualCard.querySelectorAll("select")[1], { target: { value: "direct_windows" } });
    fireEvent.change(visualCard.querySelectorAll("input:not([type=checkbox])")[0], { target: { value: scope.installedVersion } });
    fireEvent.change(visualCard.querySelectorAll("input:not([type=checkbox])")[1], { target: { value: "WIN-233-OBSERVED" } });
    fireEvent.click(visualCard.querySelector("input[type=checkbox]")!);
    fireEvent.click(visualCard.querySelector("button")!);
    expect(screen.getByLabelText("Build 233 owner Dark Mode acceptance totals")).toHaveTextContent("Owner-reported visual passes1/5");
    const exceptionCard = screen.getByLabelText("Build 233 source-matched exception cases").querySelector("article")!;
    fireEvent.change(exceptionCard.querySelector("select")!, { target: { value: "request_source_proof" } });
    fireEvent.change(exceptionCard.querySelector("input:not([type=checkbox])")!, { target: { value: "WIN-233-OWNER-NEW" } });
    fireEvent.click(exceptionCard.querySelector("input[type=checkbox]")!);
    fireEvent.click(exceptionCard.querySelector("button")!);
    expect(screen.getByLabelText("Build 233 closure exception totals")).toHaveTextContent("Recorded owner follow-ups1");
    expect(screen.getByLabelText("Build 233 closure exception totals")).toHaveTextContent("Independently verified closures0");
    const packet = formatDarkOwnerPacket233("dark", scope, {}, field, plans, {}, closure231, independent232, { theme: accepted });
    expect(packet).toContain("verified closures 0");
    expect(packet).toContain("OWNER-REPORTED ONLY");
    expect(packet).toContain("DISCONNECTED / HOLD");
    expect(fetch).not.toHaveBeenCalled();
  });
});
