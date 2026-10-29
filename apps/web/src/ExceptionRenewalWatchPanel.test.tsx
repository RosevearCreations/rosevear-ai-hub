import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ExceptionRenewalWatchPanel } from "./ExceptionRenewalWatchPanel";
import type { TriageExceptionReceipt } from "./ownerTriageExceptionAging";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerExceptionRenewalWatch", () => ({
  RENEWAL_WATCH_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_QL252_ORIGINAL_OPERATOR_PROOF"],
  compareExceptionRenewal: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact watch only");
    return { earlier_exception_index: 0, later_exception_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_recorded_at: "2026-11-11T08:00:00Z",
      later_recorded_at: "2026-11-21T08:00:00Z",
      later_owner_claim: false, later_source_claim: false,
      repeated_owner_gap: true, repeated_source_gap: true,
      unresolved_source_drift: true, source_age_days: 13,
      earlier_exception_age_days: 15,
      signals: ["REPEATED_OWNER_GAP", "REPEATED_SOURCE_GAP",
        "QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED"] };
  },
  recordRenewalWatch: () => [{ state: "PRIVATE_EXCEPTION_RENEWAL_WATCH_NOT_SENT" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.10-build179",
  access: "local_console", installed_windows_witnessed: true };
const prior = { triage_exception_notes: [
  { case_id: "cameras", reassignment_watch_index: 0, later_continuity_index: 1,
    recorded_at: "2026-11-11T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, later_continuity_index: 2,
    recorded_at: "2026-11-21T08:00:00Z" },
] } as TriageExceptionReceipt;
const props = { prior, notes: [], environment: env, importedExceptions: 0,
  importedWatches: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 179 QL-252 source proof blocker and local renewal UI", () => {
  it("renders source 404 as historical observation without calling network or enabling approvals", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ExceptionRenewalWatchPanel {...props}
      environment={{ ...env, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 179 exception renewal watch and QL-252 operator provenance HOLD" });
    expect(within(panel).getByText("PROOF & INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/At that immutable revision the QL-246 proof path returned HTTP 404/))
      .toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append Build 179 private renewal watch/ }))
      .toBeDisabled();
    expect(within(panel).queryByRole("button", { name: /approve|connect|dispatch/i }))
      .not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires two explicit HOLD acknowledgements and rejects imported later exceptions", () => {
    const onNotesChange = vi.fn();
    render(<ExceptionRenewalWatchPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Review private exception renewal pair" }));
    const button = screen.getByRole("button", { name: /Append Build 179 private renewal watch/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("marks a fully imported watch as history only", () => {
    render(<ExceptionRenewalWatchPanel {...props} importedExceptions={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Review private exception renewal pair" }));
    expect(screen.getByRole("button", { name: /Append Build 179 private renewal watch/ }))
      .toBeDisabled();
  });
});
