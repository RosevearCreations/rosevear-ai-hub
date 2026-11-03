import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsReview239Panel } from "./WindowsReview239Panel";
import { appearance236ObservationKey, defaultAppearance236Entry,
  type Appearance236Draft, type Appearance236Scope } from "./windowsAppearanceAcceptance236";
import { defaultVisual237Entry, summarizeVisual237, visual237DecisionKey,
  visual237RetestKey, type Visual237Draft } from "./windowsVisualDisposition237";
import { defaultReview238Entry, review238SnapshotKey, summarizeReview238,
  type Review238Draft, type Review238Entry } from "./windowsReview238";
import { defaultReview239Entry, decision239Key, formatReview239Packet,
  provenance239Key, summarizeReview239, type Review239Entry } from "./windowsReview239";

const scope: Appearance236Scope = { installedVersion: "hub-test-239", ownerWitnessed: true };
const sourceAt = "2026-10-26T11:00:00.000Z";
const retestAt = "2026-10-27T12:00:00.000Z";
const requestAt = "2026-10-28T12:00:00.000Z";
const replyAt = "2026-10-29T12:00:00.000Z";
const provenanceAt = "2026-10-30T12:00:00.000Z";
const decisionAt = "2026-10-31T12:00:00.000Z";

function buildChain() {
  const original = { ...defaultAppearance236Entry, outcome: "finding" as const,
    viewport: "windows_desktop" as const, symptom: "contrast" as const,
    reference: "WIN-236-ORIGINAL", observedAt: sourceAt };
  const source: Appearance236Draft = {
    contrast: { ...original, observedKey: appearance236ObservationKey("contrast", "dark", scope, original) },
  };
  const originalRow = summarizeVisual237("dark", scope, source, {}).rows[0].sourceRow;
  const retest = { ...defaultVisual237Entry, retestOutcome: "finding" as const,
    retestViewport: "windows_desktop" as const, retestSymptom: "contrast" as const,
    retestReference: "WIN-237-RETEST", retestWitnessed: true, retestAt };
  const decision = { ...retest, retestKey: visual237RetestKey("dark", scope, originalRow, retest),
    disposition: "request_ui_review" as const, repairArea: "color_contrast" as const,
    decisionReference: "WIN-237-REQUEST", decisionAttested: true, decisionAt: requestAt };
  const visual: Visual237Draft = {
    contrast: { ...decision, decisionKey: visual237DecisionKey(decision) },
  };
  const visualRow = summarizeVisual237("dark", scope, source, visual).rows[0];
  expect(visualRow.gate).toBe("review_ready");
  const responseEntry: Review238Entry = {
    ...defaultReview238Entry, outcome: "reply_received", reference: "WIN-238-REPLY",
    ownerAcknowledged: true, recordedAt: replyAt, snapshotKey: "",
  };
  responseEntry.snapshotKey = review238SnapshotKey(visualRow, responseEntry);
  const review: Review238Draft = { contrast: responseEntry };
  const responseRow = summarizeReview238("dark", scope, source, visual, review).rows[0];
  expect(responseRow.gate).toBe("reply_unverified");
  return { source, visual, review, responseRow };
}
function provenance() {
  const chain = buildChain();
  const entry: Review239Entry = {
    ...defaultReview239Entry, source: "private_correspondence",
    sourceReference: "WIN-239-PROVENANCE", sourceAcknowledged: true,
    provenanceAt, provenanceKey: "",
  };
  entry.provenanceKey = provenance239Key(chain.responseRow, entry);
  return { ...chain, entry };
}
function decided() {
  const data = provenance();
  const entry: Review239Entry = {
    ...data.entry, decision: "request_repair_authorization_review",
    repairArea: "color_contrast", rollbackReference: "WIN-239-ROLLBACK",
    decisionReference: "WIN-239-OWNER", decisionAcknowledged: true,
    decisionAt, decisionKey: "",
  };
  entry.decisionKey = decision239Key(entry);
  return { ...data, entry };
}
function assess(data: ReturnType<typeof provenance> | ReturnType<typeof decided>,
  entry: Review239Entry) {
  return summarizeReview239("dark", scope, data.source, data.visual, data.review,
    { contrast: entry });
}
afterEach(() => cleanup());

describe("Build 239 Windows review provenance and conditional repair authorization HOLD", () => {
  it("defaults to no external evidence, independent acceptance, repair or installed actions", () => {
    const result = summarizeReview239("dark", scope, {}, {}, {}, {});
    expect(result).toMatchObject({ responseCandidates: 0, ownerProvenanceRecorded: 0,
      conditionalReviewRequests: 0, authenticatedOutsideReviews: 0,
      independentWindowsAcceptance: 0, repairsAuthorized: 0, repairsExecuted: 0,
      installations: 0, privateRelay: "OFF", vault: "SECURITY HOLD" });
    expect(formatReview239Packet("dark", scope, {}, {}, {}, {}))
      .toContain("NO REPAIR AUTHORIZATION OR INSTALLATION");
  });

  it("requires a current exact Build 238 reply, never a declined or missing response", () => {
    const chain = buildChain();
    expect(summarizeReview239("dark", scope, chain.source, chain.visual, {}, {}).rows[0].gate)
      .toBe("response_not_eligible");
    const declined = { contrast: { ...chain.review.contrast!, outcome: "declined" as const } };
    expect(summarizeReview239("dark", scope, chain.source, chain.visual, declined, {}).rows[0].gate)
      .toBe("response_not_eligible");
    expect(summarizeReview239("standard", scope, chain.source, chain.visual, chain.review, {}).rows[0].gate)
      .toBe("response_not_eligible");
  });

  it("rejects stale, duplicate, missing or unwitnessed owner provenance", () => {
    const data = provenance();
    expect(assess(data, data.entry).rows[0].gate).toBe("decision_pending");
    expect(assess(data, { ...data.entry, sourceReference: "WIN-238-REPLY" })
      .rows[0].gate).toBe("source_duplicate");
    expect(assess(data, { ...data.entry, sourceReference: "" })
      .rows[0].gate).toBe("source_reference_gap");
    expect(assess(data, { ...data.entry, sourceAcknowledged: false })
      .rows[0].gate).toBe("source_witness_gap");
    expect(assess(data, { ...data.entry, provenanceAt: replyAt })
      .rows[0].gate).toBe("source_stale");
    expect(assess(data, { ...data.entry, source: "local_review_record" })
      .rows[0].gate).toBe("source_stale");
  });

  it("requires matching UI-only scope, rollback plan, distinct owner decision and later receipt", () => {
    const data = decided();
    const result = assess(data, data.entry);
    expect(result.rows[0].gate).toBe("authorization_review_ready");
    expect(result).toMatchObject({ conditionalReviewRequests: 1, openFindings: 1,
      authenticatedOutsideReviews: 0, repairsAuthorized: 0, installations: 0 });
    expect(assess(data, { ...data.entry, repairArea: "navigation_layout" })
      .rows[0].gate).toBe("decision_scope_gap");
    expect(assess(data, { ...data.entry, rollbackReference: "" })
      .rows[0].gate).toBe("rollback_gap");
    expect(assess(data, { ...data.entry, rollbackReference: "WIN-238-REPLY" })
      .rows[0].gate).toBe("rollback_duplicate");
    expect(assess(data, { ...data.entry, decisionReference: "WIN-239-PROVENANCE" })
      .rows[0].gate).toBe("decision_duplicate");
    expect(assess(data, { ...data.entry, decisionAcknowledged: false })
      .rows[0].gate).toBe("decision_witness_gap");
    expect(assess(data, { ...data.entry, decisionAt: provenanceAt })
      .rows[0].gate).toBe("decision_stale");
    expect(formatReview239Packet("dark", scope, data.source, data.visual, data.review,
      { contrast: data.entry })).toContain("Repairs authorized 0");
  });

  it("owner defer and proof requests remain open and do not authenticate a provider", () => {
    const data = provenance();
    for (const decision of ["defer", "request_retest", "request_independent_proof"] as const) {
      const entry: Review239Entry = {
        ...data.entry, decision, decisionReference: "WIN-239-NEXT",
        decisionAcknowledged: true, decisionAt, decisionKey: "",
      };
      entry.decisionKey = decision239Key(entry);
      const result = assess(data, entry);
      expect(result.rows[0].gate).toBe(decision === "defer" ? "owner_deferred" :
        decision === "request_retest" ? "owner_retest_requested" : "independent_proof_requested");
      expect(result.repairsAuthorized).toBe(0);
    }
    const changed = { contrast: { ...data.visual.contrast!, decisionReference: "WIN-237-CHANGED" } };
    expect(summarizeReview239("dark", scope, data.source, changed,
      data.review, { contrast: data.entry }).rows[0].gate).toBe("response_not_eligible");
  });

  it("exposes a keyboard-native owner worksheet with no automatic action", () => {
    const { source, visual, review } = buildChain();
    render(<WindowsReview239Panel theme="dark" scope={scope} sourceDraft={source}
      visualDraft={visual} reviewDraft={review} />);
    const open = screen.getByRole("button", { name: "Open Build 239 owner decision worksheet" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    expect(screen.getByLabelText("Owner-observed response source")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record owner-observed source" })
      .hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Repairs authorized: NO/)).toBeTruthy();
  });
});
