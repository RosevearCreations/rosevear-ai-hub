import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RenewalDispositionPanel } from "./RenewalDispositionPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalWatchReceipt } from "./ownerExceptionRenewalWatch";

vi.mock("./ownerRenewalDisposition", () => ({
  RENEWAL_DISPOSITION_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD",
    "REQUEST_QL252_SIGNED_PROOF_AND_PIN_WITNESSES"],
  compareRenewalDisposition: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact watch pair only");
    return { earlier_renewal_index: 0, later_renewal_index: 1,
      case_id: "cameras", reassignment_watch_index: 1,
      earlier_at: "2026-11-15T08:00:00Z", later_at: "2026-11-25T08:00:00Z",
      later_owner_claim: false, later_source_claim: false,
      repeated_owner_or_source_gap: true, repeated_source_drift: true,
      source_age_days: 12, earlier_renewal_age_days: 16,
      signals: ["REPEATED_OWNER_OR_SOURCE_GAP", "QL252_PUBLIC_PROOF_MISSING_OR_UNVERIFIED"] };
  },
  recordRenewalDisposition: () => [{ state: "PRIVATE_RENEWAL_DISPOSITION_NOT_SENT" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.10-build180",
  installed_windows_witnessed: true, access: "local_console" };
const prior = { renewal_watch_notes: [
  { case_id: "cameras", reassignment_watch_index: 1,
    later_exception_index: 2, recorded_at: "2026-11-15T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 1,
    later_exception_index: 3, recorded_at: "2026-11-25T08:00:00Z" },
] } as RenewalWatchReceipt;
const props = { prior, notes: [], environment, importedRenewals: 0,
  importedDispositions: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 180 QL-252 original proof blocker UI", () => {
  it("remains offline HOLD with no approval or gateway control", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RenewalDispositionPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 180 independent renewal disposition and QL-252 original proof blocker" });
    expect(within(panel).getByText("INDEPENDENT PROOF: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Public proof at its immutable SHA: HTTP 404/))
      .toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append Build 180 private disposition/ }))
      .toBeDisabled();
    expect(within(panel).queryByRole("button", { name: /approve|connect|dispatch/i }))
      .not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires two explicit HOLD acknowledgements", () => {
    const onNotesChange = vi.fn();
    render(<RenewalDispositionPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Review renewal disposition pair" }));
    const button = screen.getByRole("button", { name: /Append Build 180 private disposition/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled(); fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("cannot append imported later renewal as new evidence", () => {
    render(<RenewalDispositionPanel {...props} importedRenewals={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Review renewal disposition pair" }));
    expect(screen.getByRole("button", { name: /Append Build 180 private disposition/ }))
      .toBeDisabled();
  });
});
