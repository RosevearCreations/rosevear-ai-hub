import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsReview238Panel } from "./WindowsReview238Panel";
import { appearance236ObservationKey, defaultAppearance236Entry,
  type Appearance236Draft, type Appearance236Scope } from "./windowsAppearanceAcceptance236";
import { defaultVisual237Entry, summarizeVisual237, visual237DecisionKey,
  visual237RetestKey, type Visual237Draft } from "./windowsVisualDisposition237";
import { defaultReview238Entry, formatReview238Packet, review238SnapshotKey,
  summarizeReview238, type Review238Entry } from "./windowsReview238";

const scope: Appearance236Scope = { installedVersion: "hub-test-238", ownerWitnessed: true };
const sourceAt = "2026-10-29T11:00:00.000Z";
const retestAt = "2026-10-30T12:00:00.000Z";
const decisionAt = "2026-10-31T12:00:00.000Z";
const replyAt = "2026-11-01T12:00:00.000Z";

function readyCase() {
  const original = { ...defaultAppearance236Entry, outcome: "finding" as const,
    viewport: "windows_desktop" as const, symptom: "contrast" as const,
    reference: "WIN-236-SOURCE", observedAt: sourceAt };
  const source: Appearance236Draft = {
    contrast: { ...original, observedKey: appearance236ObservationKey("contrast", "dark", scope, original) },
  };
  const sourceRow = summarizeVisual237("dark", scope, source, {}).rows[0].sourceRow;
  const retest = { ...defaultVisual237Entry, retestOutcome: "finding" as const,
    retestViewport: "windows_desktop" as const, retestSymptom: "contrast" as const,
    retestReference: "WIN-237-RETEST", retestWitnessed: true, retestAt };
  const decision = { ...retest, retestKey: visual237RetestKey("dark", scope, sourceRow, retest),
    disposition: "request_ui_review" as const, repairArea: "color_contrast" as const,
    decisionReference: "WIN-237-DECISION", decisionAttested: true, decisionAt };
  const visual: Visual237Draft = {
    contrast: { ...decision, decisionKey: visual237DecisionKey(decision) },
  };
  expect(summarizeVisual237("dark", scope, source, visual).rows[0].gate).toBe("review_ready");
  return { source, visual };
}

function recorded(outcome: "reply_received" | "more_evidence" | "declined" = "reply_received") {
  const { source, visual } = readyCase();
  const sourceRow = summarizeVisual237("dark", scope, source, visual).rows[0];
  const entry: Review238Entry = { ...defaultReview238Entry, outcome,
    reference: "WIN-238-REPLY", ownerAcknowledged: true, recordedAt: replyAt,
    snapshotKey: "" };
  entry.snapshotKey = review238SnapshotKey(sourceRow, entry);
  return { source, visual, entry };
}

afterEach(() => cleanup());

describe("Build 238 safe owner reply intake and repair decision HOLD", () => {
  it("starts with no evidence or outside authorization", () => {
    const result = summarizeReview238("dark", scope, {}, {}, {});
    expect(result).toMatchObject({
      reviewRequests: 0, ownerRecordedReplies: 0, evidenceRequests: 0,
      declinedReports: 0, authenticatedOutsideReviews: 0,
      independentWindowsAcceptance: 0, repairsAuthorized: 0, repairsExecuted: 0,
      privateRelay: "OFF", vault: "SECURITY HOLD",
    });
    expect(formatReview238Packet("dark", scope, {}, {}, {})).toContain("NO REPAIR OR INSTALL AUTHORIZATION");
  });

  it("does not accept unrequested, changed, or merely owner-retested cases", () => {
    const { source, visual } = readyCase();
    expect(summarizeReview238("dark", scope, source, visual, {}).rows[0].gate).toBe("no_reply");
    const changed = summarizeReview238("standard", scope, source, visual, {});
    expect(changed.rows[0].gate).toBe("request_not_ready");
    const unrequested = summarizeReview238("dark", scope, source, {}, {});
    expect(unrequested.rows[0].gate).toBe("request_not_ready");
    expect(unrequested.reviewRequests).toBe(0);
  });

  it("records only uniquely referenced, personally acknowledged fresh claims without authenticating a reviewer", () => {
    const { source, visual, entry } = recorded();
    const result = summarizeReview238("dark", scope, source, visual, { contrast: entry });
    expect(result.rows[0].gate).toBe("reply_unverified");
    expect(result).toMatchObject({
      reviewRequests: 1, ownerRecordedReplies: 1, openFindings: 1,
      authenticatedOutsideReviews: 0, repairsAuthorized: 0,
    });
    expect(summarizeReview238("dark", scope, source, visual,
      { contrast: { ...entry, reference: "WIN-237-DECISION" } }).rows[0].gate)
      .toBe("reference_duplicate");
    expect(summarizeReview238("dark", scope, source, visual,
      { contrast: { ...entry, ownerAcknowledged: false } }).rows[0].gate)
      .toBe("owner_ack_missing");
    expect(summarizeReview238("dark", scope, source, visual,
      { contrast: { ...entry, recordedAt: decisionAt } }).rows[0].gate)
      .toBe("response_stale");
    expect(summarizeReview238("dark", scope, source, visual,
      { contrast: { ...entry, reference: "WIN-238-ALTERED" } }).rows[0].gate)
      .toBe("response_stale");
  });

  it("distinguishes evidence-needed and declined reports; stale source remains locked", () => {
    for (const outcome of ["more_evidence", "declined"] as const) {
      const { source, visual, entry } = recorded(outcome);
      const result = summarizeReview238("dark", scope, source, visual, { contrast: entry });
      expect(result.rows[0].gate).toBe(outcome === "declined" ? "declined_unverified" : "more_evidence_unverified");
      expect(result.repairsAuthorized).toBe(0);
      expect(result.openFindings).toBe(1);
    }
    const { source, visual, entry } = recorded();
    const changed = { contrast: { ...visual.contrast!, decisionReference: "WIN-237-NEW" } };
    expect(summarizeReview238("dark", scope, source, changed,
      { contrast: entry }).rows[0].gate).toBe("request_not_ready");
    expect(formatReview238Packet("dark", scope, source, visual,
      { contrast: entry })).toContain("Authenticated outside reviews 0");
  });

  it("shows an accessible, initially closed owner-only manual review worksheet", () => {
    const { source, visual } = readyCase();
    render(<WindowsReview238Panel theme="dark" scope={scope}
      sourceDraft={source} visualDraft={visual} />);
    expect(screen.getByText("Owner-reported reviewer responses & repair decision HOLD")).toBeTruthy();
    const open = screen.getByRole("button", { name: "Open Build 238 response worksheet" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    expect(screen.getByLabelText("Actual owner-reported reply")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record owner-reported response" })
      .hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/Original finding: OPEN/)).toBeTruthy();
  });
});
