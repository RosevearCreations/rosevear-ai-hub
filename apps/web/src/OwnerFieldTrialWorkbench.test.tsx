import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OwnerFieldTrialWorkbench } from "./OwnerFieldTrialWorkbench";
import { createTrialReceipt, recordTrialObservation } from "./ownerFieldTrial";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Build 148 System owner field trial workbench", () => {
  it("starts with nine explicit holds and requires a witness before recording an owner finding", () => {
    const navigate = vi.fn();
    render(<OwnerFieldTrialWorkbench onNavigate={navigate} />);
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
    expect(screen.getByText("Home operations field trial & follow-ups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record witnessed outcome/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open Home for this check" }));
    expect(navigate).toHaveBeenCalledWith("Home");
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("Next-action owner"), { target: { value: "household_owner" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByText(/Witnessed Home room health/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up acknowledgement pending/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge follow-up" }));
    expect(screen.getByText(/still open/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("refuses field pass without installation verification, then retains earlier issue as a retest review hold", () => {
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("Next-action owner"), { target: { value: "household_owner" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));

    fireEvent.change(screen.getByLabelText("Observed outcome"), { target: { value: "passed" } });
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "none" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByRole("status")).toHaveTextContent(/witnessed installed Windows version/);

    fireEvent.change(screen.getByLabelText("Witnessed installed version label"), { target: { value: "0.0.4-b148" } });
    fireEvent.change(screen.getByLabelText("Access path personally used"), { target: { value: "private_lan" } });
    fireEvent.click(screen.getByLabelText(/I personally checked the actual installed Windows Hub/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByText(/RETEST PASS OBSERVED · INDEPENDENT REVIEW HOLD/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "retests" } });
    expect(screen.getByText(/RETEST PASS OBSERVED/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("uses only explicit read-only GETs for source classifications; failed APIs cannot create witnessed passes", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("No installed connection"));
    vi.stubGlobal("fetch", fetchMock);
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Read source service status (GET only)" }));
    await waitFor(() => expect(screen.getByText(/Five bounded read-only GET results/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const apiRows = screen.getByRole("list", { name: "Read-only API observations" }).querySelectorAll("li");
    expect(apiRows).toHaveLength(5);
    for (const row of apiRows) expect(row).toHaveTextContent(/unavailable.*at/);
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
    expect(screen.getAllByText("Not tested").length).toBeGreaterThan(0);
  });

  it("imports past private observations as historical only and resets fresh Windows attestation", async () => {
    const environment = { installed_version: "0.0.4-b148", access: "private_lan" as const, installed_windows_witnessed: true };
    const history = recordTrialObservation([], environment,
      { case_id: "home", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true },
      "2026-10-25T10:00:00.000Z");
    const receipt = createTrialReceipt(environment, [], history);
    const file = new File([JSON.stringify(receipt)], "owner-private.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(JSON.stringify(receipt)) });
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import previous private trial JSON"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Imported history is for context only/)).toBeInTheDocument());
    expect(screen.getByLabelText(/I personally checked the actual installed Windows Hub/)).not.toBeChecked();
    expect(screen.getByText(/OWNER PASS OBSERVED · INDEPENDENT FIELD HOLD/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });
});
