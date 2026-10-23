import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DeviceCameraDriftPanel } from "./DeviceCameraDriftPanel";
import { RECOVERY_FOLLOW_UP_SCHEMA } from "./deviceRecoveryFollowUps";
import { RECOVERY_CLOSURE_SCHEMA } from "./deviceRecoveryClosure";

afterEach(cleanup);

const sourceAt = "2026-10-21T10:00:00Z";
const worklistAt = "2026-10-21T11:00:00Z";
const worklist = {
  schema: RECOVERY_FOLLOW_UP_SCHEMA, generated_at: worklistAt,
  source_registry_at: "2026-10-20T10:00:00Z", current_registry_at: sourceAt,
  follow_ups: [
    { source: "ha_device", id: "plug", name: "Workshop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT" },
    { source: "hub_camera", id: "front", name: "Front camera", stage: "camera_stream", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 1, ha_owner_check: 0, camera_registration: 0, camera_stream: 1,
    camera_playback: 0, total_open: 2, status: "follow_up_required" },
};
const ledger = {
  schema: RECOVERY_CLOSURE_SCHEMA,
  source_worklist_at: worklistAt, source_registry_at: sourceAt, generated_at: "2026-10-22T13:01:00Z",
  entries: [
    { registry_at: "2026-10-22T12:00:00Z", reviewed_at: "2026-10-22T12:01:00Z",
      decisions: [
        { source: "ha_device", id: "plug", stage: "ha_integration", registry_present: false, private_stream_ready: null,
          owner_action: "pending", status: "open_hold", reopened_from_previous: false },
        { source: "hub_camera", id: "front", stage: "camera_playback", registry_present: true, private_stream_ready: true,
          owner_action: "verified_live_video", status: "owner_attested_closed", reopened_from_previous: false },
      ], summary: { open_holds: 1, owner_attested_closed: 1, reopened: 0 } },
    { registry_at: "2026-10-22T13:00:00Z", reviewed_at: "2026-10-22T13:01:00Z",
      decisions: [
        { source: "ha_device", id: "plug", stage: "ha_integration", registry_present: false, private_stream_ready: null,
          owner_action: "pending", status: "open_hold", reopened_from_previous: false },
        { source: "hub_camera", id: "front", stage: "camera_stream", registry_present: true, private_stream_ready: false,
          owner_action: "pending", status: "open_hold", reopened_from_previous: true },
      ], summary: { open_holds: 2, owner_attested_closed: 0, reopened: 1 } },
  ],
};

function file(text: string): File {
  const item = new File([text], "private.json", { type: "application/json" });
  Object.defineProperty(item, "text", { value: async () => text });
  return item;
}

async function importEvidence() {
  fireEvent.change(screen.getByLabelText("Choose Build 110 worklist for drift review"), {
    target: { files: [file(JSON.stringify(worklist))] },
  });
  await screen.findByText(/Next import the matching Build 111 ledger/);
  fireEvent.change(screen.getByLabelText("Choose Build 111 closure ledger for drift review"), {
    target: { files: [file(JSON.stringify(ledger))] },
  });
  await screen.findByText(/Private Build 111 evidence chain loaded/);
}

describe("Build 112 private field recheck handoff UI", () => {
  it("shows per-identity reopened/still-held drift, chronological history and independent handoff marks", async () => {
    render(<DeviceCameraDriftPanel />);
    await importEvidence();
    expect(screen.getByText(/2 open · 1 HA identities · 1 cameras/)).toBeInTheDocument();
    expect(screen.getByText(/1 reopened · 1 still open/)).toBeInTheDocument();
    expect(screen.getByText(/camera_stream · reopened · changed from camera_playback/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed handoff: Front camera" }));
    expect(screen.getByText(/1 of 2 outstanding handoff items reviewed/)).toBeInTheDocument();
    expect(screen.getAllByText(/I reviewed this handoff item, not the physical device/)).toHaveLength(2);
    fireEvent.click(screen.getByText(/Owner evidence chain \(2 recorded reviews\)/));
    expect(screen.getByText(/Registry 2026-10-22T12:00:00Z/)).toBeInTheDocument();
  });

  it("rejects cross-worklist evidence and resets session marks on reimport", async () => {
    render(<DeviceCameraDriftPanel />);
    await importEvidence();
    fireEvent.click(screen.getByRole("checkbox", { name: "Reviewed handoff: Workshop plug" }));
    fireEvent.change(screen.getByLabelText("Choose Build 111 closure ledger for drift review"), {
      target: { files: [file(JSON.stringify({ ...ledger, source_worklist_at: "other" }))] },
    });
    await waitFor(() => expect(screen.getByText(/different Build 110 worklist/)).toBeInTheDocument());
    expect(screen.queryByRole("checkbox", { name: "Reviewed handoff: Workshop plug" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose Build 111 closure ledger for drift review"), {
      target: { files: [file(JSON.stringify(ledger))] },
    });
    await screen.findByText(/Private Build 111 evidence chain loaded/);
    expect(screen.getByRole("checkbox", { name: "Reviewed handoff: Workshop plug" })).not.toBeChecked();
  });
});
