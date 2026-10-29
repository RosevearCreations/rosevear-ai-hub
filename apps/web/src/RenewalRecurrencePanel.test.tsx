import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RenewalRecurrencePanel } from "./RenewalRecurrencePanel";
import type { RenewalDispositionReceipt, RenewalDispositionNote } from "./ownerRenewalDisposition";

const first = { case_id: "cameras", reassignment_watch_index: 0,
  later_renewal_index: 1, recorded_at: "2026-10-01T10:00:00Z",
  repeated_owner_or_source_gap: true, repeated_source_drift: true,
  source_age_days: 9 } as RenewalDispositionNote;
const second = { ...first, later_renewal_index: 2,
  recorded_at: "2026-10-10T10:00:00Z" } as RenewalDispositionNote;
const prior = { renewal_disposition_notes: [first, second] } as RenewalDispositionReceipt;
const env = { installed_version: "0.0.10-build181", installed_windows_witnessed: true,
  access: "local_console" as const };
afterEach(cleanup);
describe("Build 181 private recurrence UI and QL-253 source-proof trust boundary", () => {
  it("shows the original 404 and disabled relay/owner without making requests", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RenewalRecurrencePanel prior={prior} notes={[]} environment={env}
      importedDispositions={0} importedRecurrences={0} onNotesChange={vi.fn()} />);
    expect(screen.getByText(/QL-253 public-only provenance and 24\/7 relay readiness/)).toBeTruthy();
    expect(screen.getByText(/Its exact QL-246 proof path returned HTTP 404/)).toBeTruthy();
    expect(screen.getByText(/No owner TEST-only decision; gateway GETs NOT RUN/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
  });
  it("gates private note behind distinct HOLD attestations", () => {
    const change = vi.fn();
    render(<RenewalRecurrencePanel prior={prior} notes={[]} environment={env}
      importedDispositions={0} importedRecurrences={0} onNotesChange={change} />);
    const append = screen.getByRole("button", { name: /Append private Build 181 recurrence/ });
    expect(append.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Review recurrence" }));
    expect(append.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByLabelText(/I privately rechecked/));
    fireEvent.click(screen.getByLabelText(/I separately acknowledge QL-253/));
    expect(append.hasAttribute("disabled")).toBe(false);
    fireEvent.click(append);
    expect(change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toMatch(/NOT SENT/);
  });
  it("imported later disposition cannot be newly accepted", () => {
    render(<RenewalRecurrencePanel prior={prior} notes={[]} environment={env}
      importedDispositions={2} importedRecurrences={0} onNotesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Review recurrence" }));
    expect(screen.getByRole("button", { name: /Append private Build 181 recurrence/ })
      .hasAttribute("disabled")).toBe(true);
  });
});
