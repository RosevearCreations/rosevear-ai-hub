import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkshopSample392 } from "./WorkshopSample392";
import { workshopSample392 } from "./api";

vi.mock("./api", () => ({ workshopSample392: vi.fn() }));
const api = vi.mocked(workshopSample392);
const board = {
  physicalFitVerified: false, machineControlEnabled: false,
  source: "PREVIOUSLY_ADMITTED_SIGNED_RECEIPT_NOT_REVERIFIED",
  jobs: [{ jobId: 1, revision: 3, title: "Synthetic sample", stage: "hold", progressPercent: 0 }],
  receipt: { receiptId: 2, observedAtMs: 1700000000000, fresh: false,
    devices: [{ deviceId: "queue", label: "Synthetic queue", status: "observed", progressPercent: null }] },
  links: [{ linkId: 4, sampleReference: "DND-TEST", jobId: 1, receiptId: 2,
    observedAtMs: 1700000000000, deviceStatus: "observed", ownerJobStage: "hold" }],
  observationHistory: [{ receiptId: 2, observedAtMs: 1700000000000, observedGapMs: 120000, devices: [] }],
  recoveryReviews: [],
};
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function readBoard(value: unknown) {
  api.mockResolvedValueOnce(value as Awaited<ReturnType<typeof workshopSample392>>);
  render(<WorkshopSample392 />);
  fireEvent.click(screen.getByRole("button", { name: "Read sample evidence" }));
}
describe("Build 392 sample observation (synthetic jsdom)", () => {
  it("shows measured history and prevents stale association", async () => {
    await readBoard(board);
    await screen.findByText(/120 s since previous observation/);
    fireEvent.change(screen.getByLabelText("Workshop job"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Observed device or queue"), { target: { value: "queue" } });
    fireEvent.change(screen.getByLabelText(/Non-customer sample reference/), { target: { value: "DND-TEST" } });
    fireEvent.click(screen.getByLabelText(/I reviewed the association/));
    expect((screen.getByRole("button", { name: "Record sample association" }) as HTMLButtonElement).disabled).toBe(true);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("requires physical checklist before recording a non-hold disposition", async () => {
    await readBoard(board);
    await screen.findByText(/120 s since previous observation/);
    fireEvent.change(screen.getByLabelText("Associated sample"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Disposition"), { target: { value: "continue_locally" } });
    const button = screen.getByRole("button", { name: "Record recovery disposition" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    for (const label of [/I checked the sample/, /I inspected its actual condition/, /I checked fit/, /I checked for an existing/]) {
      fireEvent.click(screen.getByLabelText(label));
    }
    expect(button.disabled).toBe(false);
    api.mockResolvedValueOnce({ recorded: true, physicalFitVerified: false, machineControlEnabled: false } as Awaited<ReturnType<typeof workshopSample392>>);
    api.mockResolvedValueOnce(board as Awaited<ReturnType<typeof workshopSample392>>);
    fireEvent.click(button);
    await waitFor(() => expect(api).toHaveBeenCalledWith("recovery", {
      job_id: 1, expected_revision: 3, link_id: 4, identity_checked: true,
      condition_checked: true, fit_checked: true, duplicate_run_checked: true, disposition: "continue_locally",
    }));
    await screen.findByText(/No job or machine was started/);
  });
  it("fails closed on an unsafe response", async () => {
    await readBoard({ ...board, machineControlEnabled: true });
    await screen.findByText(/HOLD: sample observation evidence unavailable/);
    expect(screen.queryByRole("button", { name: "Record sample association" })).toBeNull();
  });
});
