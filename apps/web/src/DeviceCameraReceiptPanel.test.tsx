import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeviceCameraReceiptPanel } from "./DeviceCameraReceiptPanel";
import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { createFieldReviewReport, type CameraPlaybackReadiness } from "./deviceFieldReconciliation";

afterEach(cleanup);

const previous: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: "2026-10-20T10:00:00Z",
  home_assistant: { devices: [{ id: "lamp", name: "Workshop Lamp" }], entities: [] },
  cameras: [{ id: "front", name: "Front camera" }],
};
const source: DeviceCameraSnapshot = {
  ...previous, captured_at: "2026-10-21T10:00:00Z",
  home_assistant: { devices: [], entities: [] }, cameras: [],
};
const later: DeviceCameraSnapshot = {
  ...previous, captured_at: "2026-10-22T10:00:00Z",
  home_assistant: { devices: [{ id: "lamp", name: "Workshop Lamp" }], entities: [] },
  cameras: [{ id: "front", name: "Front camera" }],
};
const playback: CameraPlaybackReadiness[] = [
  { id: "front", cameraId: 10, name: "Front camera", ready: true, reason: "Ready", lastProbeAt: "2026-10-22T09:59:00Z" },
];

describe("Build 109 supervised receipt import and owner acceptance", () => {
  it("requires a later registry reading and resets new observations when it changes", async () => {
    const exported = createFieldReviewReport(previous, source, {}, [], new Set(), "2026-10-21T11:00:00Z");
    const file = new File([JSON.stringify(exported)], "field-review.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(exported) });

    const { rerender } = render(<DeviceCameraReceiptPanel current={source} playback={playback} />);
    fireEvent.change(screen.getByLabelText("Choose Build 108 field review JSON"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Build 108 field review receipt loaded locally/)).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/must be later/);
    expect(screen.getByRole("button", { name: /Download owner acceptance receipt/ })).toBeDisabled();

    const freshLater = { ...later, captured_at: new Date().toISOString() };
    rerender(<DeviceCameraReceiptPanel current={freshLater} playback={playback} />);
    const lamp = screen.getByRole("checkbox", { name: "Personally verified identity: Workshop Lamp" });
    const cameraIdentity = screen.getByRole("checkbox", { name: "Personally verified identity: Front camera" });
    const camera = screen.getByRole("checkbox", { name: "Personally verified current moving video: Front camera" });
    expect(lamp).toBeEnabled();
    expect(camera).toBeEnabled();
    fireEvent.click(lamp);
    fireEvent.click(cameraIdentity);
    fireEvent.click(camera);
    expect(screen.getByText(/all listed observations acknowledged locally/)).toBeInTheDocument();

    rerender(<DeviceCameraReceiptPanel current={{ ...freshLater, captured_at: new Date(Date.now() + 1000).toISOString() }} playback={playback} />);
    expect(screen.getByRole("checkbox", { name: "Personally verified identity: Workshop Lamp" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Personally verified current moving video: Front camera" })).not.toBeChecked();
    expect(screen.getByText(/2 identity and 1 camera holds remain/)).toBeInTheDocument();
  });

  it("cannot import a malformed file, certify absent cameras, or make network mutations", async () => {
    const exported = createFieldReviewReport(previous, source, {}, [], new Set(), "2026-10-21T11:00:00Z");
    const file = new File([JSON.stringify(exported)], "field-review.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(exported) });
    const { rerender } = render(<DeviceCameraReceiptPanel current={{ ...later, captured_at: new Date().toISOString() }} playback={[{ ...playback[0], ready: false }]} />);
    fireEvent.change(screen.getByLabelText("Choose Build 108 field review JSON"), { target: { files: [file] } });
    await screen.findByText(/Build 108 field review receipt loaded locally/);
    expect(screen.getByRole("checkbox", { name: "Personally verified current moving video: Front camera" })).toBeDisabled();
    expect(screen.getByText(/camera holds remain/)).toBeInTheDocument();

    const invalid = new File(["invalid"], "invalid.json", { type: "application/json" });
    Object.defineProperty(invalid, "text", { value: async () => "invalid" });
    fireEvent.change(screen.getByLabelText("Choose Build 108 field review JSON"), { target: { files: [invalid] } });
    await screen.findByText(/must be valid JSON/);
    expect(screen.queryByRole("checkbox", { name: "Personally verified current moving video: Front camera" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose Build 108 field review JSON"), { target: { files: [file] } });
    await screen.findByText(/Build 108 field review receipt loaded locally/);
    rerender(<DeviceCameraReceiptPanel current={null} playback={[]} />);
    expect(screen.getByRole("note")).toHaveTextContent(/unavailable/);
  });
});
