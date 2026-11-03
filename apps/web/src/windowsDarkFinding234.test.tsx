import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsDarkFinding234Panel } from "./WindowsDarkFinding234Panel";
import { WindowsDarkOwner233Panel } from "./WindowsDarkOwner233Panel";
import { dark233Snapshot, defaultDark233Observation, type Dark233Draft } from "./windowsDarkOwner233";
import { dark234DecisionKey, defaultDark234Entry,
  formatDarkFinding234Packet, summarizeDarkFinding234, type Dark234Draft, type Dark234Entry } from "./windowsDarkFinding234";

const scope = { installedVersion: "win-installed-233", physicallyWitnessed: true };
const observation = { ...defaultDark233Observation, outcome: "finding" as const,
  basis: "direct_windows" as const, reference: "WIN-233-WHITE-CARD",
  installedVersion: scope.installedVersion, ownerWitnessed: true,
  observedAt: "2020-11-06T19:00:00Z" };
const visual: Dark233Draft = { surfaces: { ...observation,
  checkedSnapshot: dark233Snapshot("surfaces", "dark", scope, observation) } };
const firstSource = summarizeDarkFinding234("dark", scope, visual, {}).rows[0];
const reviewBase: Dark234Entry = {
  ...defaultDark234Entry, sourceKey: firstSource.sourceKey,
  priority: "p1", reproduction: "direct_windows", reproductionReference: "WIN-234-WINDOWS-REPRO",
  proposedAction: "css_contrast", impact: "presentation_only", rollbackReference: "WIN-234-ROLLBACK",
  independentReference: "WIN-234-REVIEWER", reviewerAttested: true,
  ownerDecision: "request_conditional_review", ownerDecisionReference: "WIN-234-OWNER-DECISION",
  ownerReviewAttested: true, recordedAt: "2020-11-07T20:00:00Z",
};
const accepted: Dark234Entry = { ...reviewBase, reviewedKey: dark234DecisionKey(reviewBase) };
const summarize = (entry?: Dark234Entry, source: Dark233Draft = visual, theme: "dark" | "standard" = "dark") =>
  summarizeDarkFinding234(theme, scope, source, entry ? { surfaces: entry } : {});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 234 Dark Mode owner finding triage and conditional authorization-review gates", () => {
  it("starts empty: no real owner finding means no repair candidate, reviewer or authorization", () => {
    vi.stubGlobal("fetch", vi.fn());
    const summary = summarizeDarkFinding234("dark", scope, {}, {});
    expect(summary).toMatchObject({ ownerFindings: 0, conditionalReviewPackets: 0,
      repairsAuthorized: 0, repairsExecuted: 0, independentlyVerified: false });
    render(<WindowsDarkFinding234Panel theme="dark" scope={scope} visual={{}} />);
    expect(screen.getByRole("heading", { name: "Dark Mode finding triage & conditional repair authorization review" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 234 Dark Mode finding triage totals")).toHaveTextContent("Repairs authorized / executed0 / 0");
    expect(screen.getByText(/No authentic Build 233 Windows Dark Mode findings/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("only considers witnessed, fresh Build 233 findings or blocked tests, retaining stale out-of-scope drafts", () => {
    expect(summarize().ownerFindings).toBe(1);
    const unrecorded = { surfaces: { ...visual.surfaces!, checkedSnapshot: "" } };
    expect(summarize(accepted, unrecorded)).toMatchObject({ ownerFindings: 0, staleDrafts: 1 });
    const passes = { surfaces: { ...visual.surfaces!, outcome: "pass" as const } };
    expect(summarize(accepted, passes).ownerFindings).toBe(0);
    expect(summarize(accepted, visual, "standard")).toMatchObject({ ownerFindings: 0, staleDrafts: 1 });
    expect(summarize().repairsExecuted).toBe(0);
  });

  it("can prepare a conditional owner REVIEW packet without independently verifying or granting a repair", () => {
    expect(summarize(accepted)).toMatchObject({ ownerFindings: 1, conditionalReviewPackets: 1,
      repairsAuthorized: 0, repairsExecuted: 0, independentlyVerified: false });
    expect(summarize(accepted).rows[0].gate).toBe("conditional_review_ready");
    const packet = formatDarkFinding234Packet("dark", scope, visual, { surfaces: accepted });
    expect(packet).toContain("conditional REVIEW packets 1");
    expect(packet).toContain("actual repair grants 0");
    expect(packet).toContain("NOT AUTHENTICATED");
    expect(packet).toContain("DISCONNECTED / HOLD");
  });

  it("invalidates changed source, reused identifiers, missing independent reviewer attestation and stale owner times", () => {
    expect(summarize({ ...accepted, sourceKey: "OLD-SOURCE" }).rows[0].gate).toBe("source_changed");
    const changed = { surfaces: { ...visual.surfaces!, reference: "WIN-233-NEW-FINDING",
      checkedSnapshot: dark233Snapshot("surfaces", "dark", scope, { ...visual.surfaces!, reference: "WIN-233-NEW-FINDING" }) } };
    expect(summarize(accepted, changed).rows[0].gate).toBe("source_changed");
    expect(summarize({ ...accepted, reproductionReference: observation.reference }).rows[0].gate).toBe("reproduction_gap");
    expect(summarize({ ...accepted, ownerDecisionReference: accepted.reproductionReference }).rows[0].gate).toBe("distinct_reference_gap");
    expect(summarize({ ...accepted, reviewerAttested: false }).rows[0].gate).toBe("independent_reference_gap");
    expect(summarize({ ...accepted, independentReference: "" }).rows[0].gate).toBe("independent_reference_gap");
    expect(summarize({ ...accepted, ownerReviewAttested: false }).rows[0].gate).toBe("owner_review_consent_missing");
    expect(summarize({ ...accepted, recordedAt: observation.observedAt }).rows[0].gate).toBe("fresh_owner_record_missing");
    expect(summarize({ ...accepted, priority: "p3" }).rows[0].gate).toBe("fresh_owner_record_missing");
  });

  it("blocks privileged or unsafely scoped conditional reviews but permits distinct retest and defer receipts", () => {
    expect(summarize({ ...accepted, impact: "requires_security_review" }).rows[0].gate).toBe("risk_review_required");
    expect(summarize({ ...accepted, proposedAction: "defer" }).rows[0].gate).toBe("risk_review_required");
    expect(summarize({ ...accepted, rollbackReference: "" }).rows[0].gate).toBe("safety_gap");
    const base = { ...defaultDark234Entry, sourceKey: accepted.sourceKey, priority: "p2" as const,
      ownerDecision: "request_retest" as const, ownerDecisionReference: "WIN-234-RETEST-OWNER",
      ownerReviewAttested: true, recordedAt: "2020-11-07T20:00:00Z" };
    expect(summarize({ ...base, reviewedKey: dark234DecisionKey(base) }).rows[0].gate).toBe("retest_requested");
    const defer = { ...base, ownerDecision: "defer" as const };
    expect(summarize({ ...defer, reviewedKey: dark234DecisionKey(defer) }).rows[0].gate).toBe("owner_deferred");
    expect(summarize({ ...defer, reviewedKey: dark234DecisionKey(defer) }).repairsAuthorized).toBe(0);
  });

  it("lets the owner record a safe, source-matched request locally without a network or device call", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsDarkFinding234Panel theme="dark" scope={scope} visual={visual} />);
    const card = screen.getByLabelText("Build 234 source-matched visual repair proposal cases").querySelector("article")!;
    expect(card.querySelector("button")!).toBeDisabled();
    fireEvent.change(card.querySelector("select#windows-234-priority-surfaces")!, { target: { value: "p2" } });
    fireEvent.change(card.querySelector("select#windows-234-decision-surfaces")!, { target: { value: "request_retest" } });
    fireEvent.change(card.querySelector("input#windows-234-owner-ref-surfaces")!, { target: { value: "WIN-234-RETEST-OWNER" } });
    fireEvent.click(card.querySelectorAll(".windows-dark-234-confirmations input[type=checkbox]")[1]);
    fireEvent.click(card.querySelector("button")!);
    expect(screen.getByText(/Owner follow-up timestamp recorded/)).toBeInTheDocument();
    expect(screen.getByLabelText("Build 234 Dark Mode finding triage totals")).toHaveTextContent("Repairs authorized / executed0 / 0");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads the longer Build 234 worksheet only when the owner requests it", () => {
    render(<WindowsDarkOwner233Panel theme="dark" field={{}} scope={scope} plans={{}} retests={{}}
      closure231={{}} independent232={{}} />);
    expect(screen.queryByRole("heading", { name: "Dark Mode finding triage & conditional repair authorization review" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Build 234 finding triage & conditional authorization review" }));
    expect(screen.getByRole("heading", { name: "Dark Mode finding triage & conditional repair authorization review" })).toBeInTheDocument();
  });
});
