import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCameraDashboard, getCameras, getGo2RTCStatus, getHomeAssistantBrowser,
  getHomeAssistantStatus, getMQTTStatus,
} from "./api";
import { FieldRecoverySummaryPanel } from "./FieldRecoverySummaryPanel";

vi.mock("./api", () => ({
  getCameraDashboard: vi.fn(), getCameras: vi.fn(), getGo2RTCStatus: vi.fn(),
  getHomeAssistantBrowser: vi.fn(), getHomeAssistantStatus: vi.fn(), getMQTTStatus: vi.fn(),
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const worklist = {
  schema: "rosevear-device-camera-recovery-follow-up/v1",
  generated_at: "2026-10-22T10:01:00Z", source_registry_at: "2026-10-21T10:00:00Z", current_registry_at: "2026-10-22T10:00:00Z",
  follow_ups: [
    { source: "ha_device", id: "workshop", name: "Workshop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT" },
    { source: "hub_camera", id: "camera-1", name: "Front camera", stage: "camera_playback", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 1, ha_owner_check: 0, camera_registration: 0, camera_stream: 0, camera_playback: 1, total_open: 2, status: "follow_up_required" },
};
const ledger = {
  schema: "rosevear-device-camera-follow-up-closure-ledger/v1",
  source_worklist_at: worklist.generated_at, source_registry_at: worklist.current_registry_at, generated_at: "2026-10-22T13:01:00Z",
  entries: [{ registry_at: "2026-10-22T13:00:00Z", reviewed_at: "2026-10-22T13:01:00Z",
    decisions: [
      { source: "ha_device", id: "workshop", stage: "ha_integration", registry_present: false, private_stream_ready: null, owner_action: "pending", status: "open_hold", reopened_from_previous: false },
      { source: "hub_camera", id: "camera-1", stage: "camera_playback", registry_present: true, private_stream_ready: true, owner_action: "verified_live_video", status: "owner_attested_closed", reopened_from_previous: false },
    ],
    summary: { open_holds: 1, owner_attested_closed: 1, reopened: 0 },
  }],
};

function file(content: string) {
  const result = new File([content], "private.json", { type: "application/json" });
  Object.defineProperty(result, "text", { value: async () => content });
  return result;
}

async function loadEvidence() {
  fireEvent.change(screen.getByLabelText("Import Build 110 field worklist"), { target: { files: [file(JSON.stringify(worklist))] } });
  await screen.findByText(/Private Build 110 identities loaded/);
  fireEvent.change(screen.getByLabelText("Import matching Build 111 field ledger"), { target: { files: [file(JSON.stringify(ledger))] } });
  await screen.findByText(/Matching historical ledger imported/);
}

function mockHealthy() {
  vi.mocked(getHomeAssistantStatus).mockResolvedValue({ configured: true, available: true, base_url: "SECRET", token_configured: true, url_configured: true, message: "secret" });
  vi.mocked(getMQTTStatus).mockResolvedValue({ configured: true, available: true } as never);
  vi.mocked(getHomeAssistantBrowser).mockResolvedValue({ devices: [{ device_id: "workshop" }], entities: [{ entity_id: "switch.workshop", device_id: "workshop", state: "on" }] } as never);
  vi.mocked(getCameras).mockResolvedValue([{ id: 1, endpoint_uuid: "camera-1", enabled: true, stream: { enabled: true, encrypted: true, source_host: "local", stream_name: "front" } }] as never);
  vi.mocked(getCameraDashboard).mockImplementation(async () => ({ cameras: [{ camera_id: 1, enabled: true, configured: true, health: "healthy", last_probe_at: new Date().toISOString(), stream_name: "front", source_host: "local" }] }) as never);
  vi.mocked(getGo2RTCStatus).mockResolvedValue({ configured: true, online: true, local_api_only: true, local_rtsp_only: true } as never);
}

describe("Build 118 recovery summary owner UI", () => {
  it("never polls, probes or mutates automatically, and resets real-function claims after a fresh read", async () => {
    mockHealthy();
    const navigate = vi.fn();
    render(<FieldRecoverySummaryPanel onNavigate={navigate} />);
    expect(getHomeAssistantStatus).not.toHaveBeenCalled();
    expect(getCameraDashboard).not.toHaveBeenCalled();
    expect(screen.getByText("Installed field acceptance: HOLD")).toBeInTheDocument();
    await loadEvidence();
    expect(getCameras).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Read current authenticated registry/ }));
    await waitFor(() => expect(screen.getByText(/Read-only authenticated snapshot captured/)).toBeInTheDocument());
    expect(getHomeAssistantStatus).toHaveBeenCalledTimes(1);
    expect(getCameras).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Historically closed|owner_attested_closed/)).toBeTruthy();
    const box = screen.getByRole("checkbox", { name: "I personally verified camera-1" });
    expect(box).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Next owner for camera-1" }), { target: { value: "camera_operator" } });
    expect(box).not.toBeDisabled();
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText("Installed field acceptance: HOLD")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Read current authenticated registry/ }));
    await waitFor(() => expect(getHomeAssistantStatus).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("checkbox", { name: "I personally verified camera-1" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Review Camera Playback" }));
    expect(navigate).toHaveBeenCalledWith("Cameras");
  });

  it("rejects unrelated ledgers and prevents a fresh registry read until history matches", async () => {
    mockHealthy();
    render(<FieldRecoverySummaryPanel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import Build 110 field worklist"), { target: { files: [file(JSON.stringify(worklist))] } });
    await screen.findByText(/Private Build 110 identities loaded/);
    fireEvent.change(screen.getByLabelText("Import matching Build 111 field ledger"), {
      target: { files: [file(JSON.stringify({ ...ledger, source_worklist_at: "some-other-worklist" }))] },
    });
    await screen.findByText(/different Build 110 worklist/);
    expect(screen.getByRole("button", { name: /Read current authenticated registry/ })).toBeDisabled();
    expect(getHomeAssistantBrowser).not.toHaveBeenCalled();
  });

  it("renders read failures as explicit holds without leaking underlying service errors", async () => {
    mockHealthy();
    vi.mocked(getCameras).mockRejectedValue(new Error("password SECRET"));
    render(<FieldRecoverySummaryPanel onNavigate={vi.fn()} />);
    await loadEvidence();
    fireEvent.click(screen.getByRole("button", { name: /Read current authenticated registry/ }));
    await waitFor(() => expect(screen.getByText(/Read-only authenticated snapshot captured/)).toBeInTheDocument());
    expect(screen.getByText(/fresh registry: unverified/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SECRET");
    expect(screen.getByRole("button", { name: "Download private owner summary with holds" })).not.toBeDisabled();
  });
});
