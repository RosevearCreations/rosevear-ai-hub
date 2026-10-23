import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeviceCameraClosurePanel } from "./DeviceCameraClosurePanel";
import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { RECOVERY_FOLLOW_UP_SCHEMA } from "./deviceRecoveryFollowUps";

afterEach(cleanup);

const createdAt = "2026-10-21T10:00:00Z";
const queue = {
  schema: RECOVERY_FOLLOW_UP_SCHEMA, generated_at: "2026-10-21T10:01:00Z",
  source_registry_at: "2026-10-20T10:00:00Z", current_registry_at: createdAt,
  follow_ups: [
    { source: "ha_device", id: "workshop", name: "Workshop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT" },
    { source: "ha_entity", id: "retired", name: "Retired lamp", stage: "ha_integration", integration_group_owner_supplied: null },
    { source: "hub_camera", id: "front", name: "Front camera", stage: "camera_playback", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 2, ha_owner_check: 0, camera_registration: 0,
    camera_stream: 0, camera_playback: 1, total_open: 3, status: "follow_up_required" },
};
const snapshot: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: new Date().toISOString(),
  home_assistant: { devices: [{ id: "workshop", name: "Workshop plug" }], entities: [] },
  cameras: [{ id: "front", name: "Front camera" }],
};
const playback = [{ id: "front", cameraId: 1, name: "Front camera", ready: true,
  reason: "Ready", lastProbeAt: new Date().toISOString() }];

function file(text: string): File {
  const item = new File([text], "private.json", { type: "application/json" });
  Object.defineProperty(item, "text", { value: async () => text });
  return item;
}

describe("Build 111 supervised follow-up closure UI", () => {
  it("requires independent HA checks and moving video, resets on inventory refresh", async () => {
    const { rerender } = render(<DeviceCameraClosurePanel current={snapshot} playback={playback} />);
    fireEvent.change(screen.getByLabelText("Choose Build 110 follow-up JSON"), {
      target: { files: [file(JSON.stringify(queue))] },
    });
    await screen.findByText(/Build 110 private queue loaded/);
    expect(screen.getByText(/3 open holds/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Verified current HA function: Workshop plug" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmed intentionally retired: Retired lamp" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Observed current moving video: Front camera" }));
    expect(screen.getByText(/0 open holds/)).toBeInTheDocument();
    rerender(<DeviceCameraClosurePanel current={{ ...snapshot, captured_at: new Date(Date.now() + 1500).toISOString() }} playback={playback} />);
    expect(screen.getByText(/3 open holds/)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").every((node) => !(node as HTMLInputElement).checked)).toBe(true);
  });

  it("blocks old evidence and camera-stream holds and rejects invalid worklists", async () => {
    const { rerender } = render(<DeviceCameraClosurePanel current={{ ...snapshot, captured_at: createdAt }} playback={playback} />);
    fireEvent.change(screen.getByLabelText("Choose Build 110 follow-up JSON"), {
      target: { files: [file(JSON.stringify(queue))] },
    });
    await screen.findByText(/Build 110 private queue loaded/);
    expect(screen.getByRole("alert")).toHaveTextContent(/not later/);
    expect(screen.getByRole("button", { name: /Download private closure ledger/ })).toBeDisabled();
    rerender(<DeviceCameraClosurePanel current={snapshot} playback={[{ ...playback[0], ready: false }]} />);
    expect(screen.queryByRole("checkbox", { name: /Observed current moving video/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Held until camera registration/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose Build 110 follow-up JSON"), {
      target: { files: [file("invalid")] },
    });
    await waitFor(() => expect(screen.getByText(/must be valid JSON/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Download private closure ledger/ })).not.toBeInTheDocument();
  });
});
