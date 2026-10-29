import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RecurrenceReassessmentPanel } from "./RecurrenceReassessmentPanel";
import type { RecurrenceNote, RecurrenceReceipt } from "./ownerRenewalRecurrence";

const first = { case_id: "cameras", reassignment_watch_index: 0,
  later_disposition_index: 1, recorded_at: "2026-10-01T10:00:00Z",
  source_drift_or_gap_persisted: true } as RecurrenceNote;
const later = { ...first, later_disposition_index: 2,
  recorded_at: "2026-10-10T10:00:00Z" } as RecurrenceNote;
const prior = { recurrence_notes: [first, later] } as RecurrenceReceipt;
const env = { installed_version: "0.0.10-build182", installed_windows_witnessed: true,
  access: "local_console" as const };
afterEach(cleanup);

describe("Build 182 private recurrence reassessment and QL-254 relay HOLD", () => {
  it("shows source 404 and only in-memory relay, never makes a gateway call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RecurrenceReassessmentPanel prior={prior} notes={[]} environment={env}
      importedRecurrences={0} importedReassessments={0} onNotesChange={vi.fn()} />);
    expect(screen.getByText(/Verified QL-254 Hub/)).toBeTruthy();
    expect(screen.getByText(/No gateway GET. No mini-server service installed or started/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
  });
  it("gates a held note behind two separate acknowledgements", () => {
    const changed = vi.fn();
    render(<RecurrenceReassessmentPanel prior={prior} notes={[]} environment={env}
      importedRecurrences={0} importedReassessments={0} onNotesChange={changed} />);
    const button = screen.getByRole("button", { name: /Append Build 182 private reassessment/ });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Review reassessment" }));
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByLabelText(/I freshly rechecked/));
    fireEvent.click(screen.getByLabelText(/I separately acknowledge QL-254/));
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toMatch(/NOT SENT/);
  });
  it("keeps imported later recurrence historical-only", () => {
    render(<RecurrenceReassessmentPanel prior={prior} notes={[]} environment={env}
      importedRecurrences={2} importedReassessments={0} onNotesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Review reassessment" }));
    expect(screen.getByRole("button", { name: /Append Build 182 private reassessment/ })
      .hasAttribute("disabled")).toBe(true);
  });
});
