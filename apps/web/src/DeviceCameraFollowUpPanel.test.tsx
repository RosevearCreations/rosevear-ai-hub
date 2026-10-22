import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeviceCameraFollowUpPanel } from "./DeviceCameraFollowUpPanel";
import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { OWNER_ACCEPTANCE_SCHEMA } from "./deviceRecoveryReceipts";

afterEach(cleanup);

const ownerReceipt = {
  schema: OWNER_ACCEPTANCE_SCHEMA,
  generated_at: "2026-10-21T11:00:00Z",
  previous_review_at: "2026-10-20T11:00:00Z",
  previous_snapshot_at: "2026-10-20T10:00:00Z",
  new_snapshot_at: "2026-10-21T10:00:00Z",
  identities: [{ source: "ha_device", id: "lamp", name: "Workshop lamp",
    prior_disposition: "review_integration", present_in_new_registry: false,
    operator_reviewed_current_state: false, disposition: "still_absent" }],
  camera_playback: [{ id: "front", name: "Front camera", observed_in_prior_receipt: true,
    registered_now: true, healthy_private_stream_now: true, operator_observed_moving_video_now: true }],
  summary: { previous_missing_identities: 1, reappeared_in_registry: 0,
    retired_exceptions: 0, identity_acceptance_holds: 1, camera_playback_holds: 0,
    status: "follow_up_required" },
};

const snapshot: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: new Date().toISOString(),
  home_assistant: { devices: [], entities: [] },
  cameras: [{ id: "front", name: "Front camera" }],
};
const playback = [{ id: "front", cameraId: 1, name: "Front camera", ready: true,
  reason: "Ready", lastProbeAt: new Date().toISOString() }];

function file(text: string): File {
  const item = new File([text], "acceptance.json", { type: "application/json" });
  Object.defineProperty(item, "text", { value: async () => text });
  return item;
}

describe("Build 110 device and camera follow-up workbench", () => {
  it("batch-groups HA holds, never inherits previous video, and resets marks on refresh", async () => {
    const { rerender } = render(<DeviceCameraFollowUpPanel current={snapshot} playback={playback} />);
    fireEvent.change(screen.getByLabelText("Choose Build 109 owner acceptance JSON"), {
      target: { files: [file(JSON.stringify(ownerReceipt))] },
    });
    await waitFor(() => expect(screen.getByText(/Build 109 owner receipt loaded locally/)).toBeInTheDocument());
    expect(screen.getByText(/2 open follow-ups/)).toBeInTheDocument();
    expect(screen.getByText(/Stream is ready; fresh moving video/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Select all 1 HA follow-ups/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. MQTT or Meross"), { target: { value: "MQTT" } });
    fireEvent.click(screen.getByRole("button", { name: /Group 1 selected/ }));
    expect(screen.getByText(/ha_device .* MQTT/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Viewed current moving video: Front camera" }));
    expect(screen.getByText(/1 open follow-ups/)).toBeInTheDocument();
    rerender(<DeviceCameraFollowUpPanel current={{ ...snapshot, captured_at: new Date(Date.now() + 1000).toISOString() }} playback={playback} />);
    expect(screen.getByText(/2 open follow-ups/)).toBeInTheDocument();
    expect(screen.getByText(/Integration unassigned/)).toBeInTheDocument();
  });

  it("rejects malformed receipt, holds stale source readings and does not mutate devices", async () => {
    const old = { ...snapshot, captured_at: ownerReceipt.new_snapshot_at };
    const { rerender } = render(<DeviceCameraFollowUpPanel current={old} playback={playback} />);
    fireEvent.change(screen.getByLabelText("Choose Build 109 owner acceptance JSON"), {
      target: { files: [file(JSON.stringify(ownerReceipt))] },
    });
    await screen.findByText(/Build 109 owner receipt loaded locally/);
    expect(screen.getByRole("alert")).toHaveTextContent(/not later/);
    expect(screen.getByRole("button", { name: /Download private follow-up queue/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Choose Build 109 owner acceptance JSON"), {
      target: { files: [file("invalid")] },
    });
    await screen.findByText(/must be valid JSON/);
    expect(screen.queryByText(/open follow-ups/)).not.toBeInTheDocument();
    rerender(<DeviceCameraFollowUpPanel current={null} playback={[]} />);
    expect(screen.queryByRole("button", { name: /Download private follow-up queue/ })).not.toBeInTheDocument();
  });
});
