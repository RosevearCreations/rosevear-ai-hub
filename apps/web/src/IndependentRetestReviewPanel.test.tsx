import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IndependentRetestReviewPanel } from "./IndependentRetestReviewPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.4-build150", access: "local_console", installed_windows_witnessed: true };
const history = recordTrialObservation(
  recordTrialObservation([], env, { case_id: "windows", outcome: "issue", finding: "startup", next_owner: "household_owner", witnessed: true }, "2026-10-25T08:00:00.000Z"),
  env, { case_id: "windows", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true }, "2026-10-25T12:00:00.000Z");
let handoffs = createRepairHandoff(history, [], "windows", "2026-10-25T09:00:00.000Z");
handoffs = advanceRepairHandoff(history, handoffs, "windows", 0, true, "2026-10-25T10:00:00.000Z");
handoffs = advanceRepairHandoff(history, handoffs, "windows", 0, true, "2026-10-25T11:00:00.000Z");

function Harness({ initialEvents = [], importedCount = 0 }: { initialEvents?: ReviewEvidenceEvent[]; importedCount?: number }) {
  const [events, setEvents] = useState(initialEvents);
  return <IndependentRetestReviewPanel history={history} handoffs={handoffs} environment={env}
    events={events} importedCount={importedCount} onEventsChange={setEvents} />;
}

describe("Build 150 System independent review UI", () => {
  it("keeps intake on hold if there is no prepared handoff", () => {
    render(<IndependentRetestReviewPanel history={history} handoffs={[]} environment={env} events={[]}
      importedCount={0} onEventsChange={vi.fn()} />);
    expect(screen.getByText(/No prepared handoffs yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record reviewer evidence/ })).not.toBeInTheDocument();
    expect(screen.getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
  });

  it("records explicit gap evidence, filters the register and never enables closure", () => {
    render(<Harness />);
    const panel = screen.getByRole("region", { name: "Build 150 independent retest review and evidence gap register" });
    expect(within(panel).getByText("7 unmet evidence criteria")).toBeInTheDocument();
    const button = within(panel).getByRole("button", { name: "Record reviewer evidence (no closure)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByLabelText(/I personally reviewed the exact source finding/));
    fireEvent.click(button);
    expect(within(panel).getByRole("status")).toHaveTextContent(/No closure or physical acceptance/);
    expect(within(panel).getByText(/Reviewer classification/)).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText("Gap register filter"), { target: { value: "contradictions" } });
    expect(within(panel).getByText(/No criteria match this filter/)).toBeInTheDocument();
    expect(within(panel).getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
  });

  it("requires separate reviewer attestation and reports the error without false sign-off", () => {
    render(<Harness />);
    const panel = screen.getByRole("region", { name: "Build 150 independent retest review and evidence gap register" });
    fireEvent.change(within(panel).getByLabelText("Evidence criterion"), { target: { value: "independent_witness" } });
    fireEvent.change(within(panel).getByLabelText("Observed evidence state"), { target: { value: "present_claimed" } });
    fireEvent.click(within(panel).getByLabelText(/I personally reviewed the exact source finding/));
    fireEvent.click(within(panel).getByRole("button", { name: "Record reviewer evidence (no closure)" }));
    expect(within(panel).getByRole("status")).toHaveTextContent(/separate reviewer/);
    fireEvent.click(within(panel).getByLabelText(/I attest I am a different reviewer/));
    fireEvent.click(within(panel).getByRole("button", { name: "Record reviewer evidence (no closure)" }));
    expect(within(panel).getByText("1 / 7 currently claimed present")).toBeInTheDocument();
    expect(within(panel).getByText("6 unmet evidence criteria")).toBeInTheDocument();
    expect(within(panel).getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
  });
});
