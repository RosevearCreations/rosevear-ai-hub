import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CameraBulkRestorePanel } from "./CameraBulkRestorePanel";
import { acceptCameraDiscovery, getCameras, previewCameraDiscovery } from "./api";
import { RECOVERY_SNAPSHOT_SCHEMA } from "./deviceRecovery";

vi.mock("./api", () => ({
  getCameras: vi.fn(), previewCameraDiscovery: vi.fn(), acceptCameraDiscovery: vi.fn(),
}));
afterEach(cleanup);

function priorFile() {
  const raw = JSON.stringify({
    schema: RECOVERY_SNAPSHOT_SCHEMA,
    captured_at: new Date(Date.now() - 90_000).toISOString(),
    home_assistant: { devices: [], entities: [] },
    cameras: [{ id: "uuid-a", name: "Porch" }, { id: "uuid-b", name: "Garage" }],
  });
  const file = new File([raw], "prior.json", { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => raw });
  return file;
}

const discovery = {
  preview_token: "ticket-once", expires_in_seconds: 300, truncated: false,
  candidates: [
    { endpoint_uuid: "uuid-a", display_name: "Porch", host: "192.168.68.55", port: 80, registered: false, model_hint: "Model A" },
    { endpoint_uuid: "uuid-b", display_name: "Garage", host: "192.168.68.56", port: 80, registered: false },
    { endpoint_uuid: "uuid-c", display_name: "Unknown", host: "192.168.68.57", port: 80, registered: false },
  ],
};

function upload() {
  fireEvent.change(screen.getByLabelText("Choose prior camera inventory or worklist JSON"), { target: { files: [priorFile()] } });
}

describe("Build 115 owner camera bulk restore", () => {
  beforeEach(() => {
    vi.mocked(getCameras).mockReset().mockResolvedValue([]);
    vi.mocked(previewCameraDiscovery).mockReset().mockResolvedValue(discovery);
    vi.mocked(acceptCameraDiscovery).mockReset().mockResolvedValue({
      created: 2, already_registered: 0,
      cameras: [
        { id: 1, endpoint_uuid: "uuid-a", enabled: false, stream: null },
        { id: 2, endpoint_uuid: "uuid-b", enabled: false, stream: null },
      ],
    } as never);
  });

  it("performs no automatic scan or registration, filters unknown, and requires hardware signoff", async () => {
    render(<CameraBulkRestorePanel />);
    expect(getCameras).not.toHaveBeenCalled();
    expect(previewCameraDiscovery).not.toHaveBeenCalled();
    expect(acceptCameraDiscovery).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Compare fresh registry and ONVIF discovery" })).toBeDisabled();
    upload();
    await screen.findByText(/Imported 2 prior camera identities/);
    fireEvent.click(screen.getByRole("button", { name: "Compare fresh registry and ONVIF discovery" }));
    expect(await screen.findByText(/2 eligible exact-ID restore candidates/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select camera restore Unknown" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Select all 2 exact-ID candidates" }));
    expect(screen.getByRole("button", { name: /Register 2 owner-approved cameras disabled/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed the 2 selected physical camera/ }));
    fireEvent.click(screen.getByRole("button", { name: /Register 2 owner-approved cameras disabled/ }));
    await screen.findByText(/2 camera\(s\) registered disabled/);
    expect(getCameras).toHaveBeenCalledTimes(2);
    expect(acceptCameraDiscovery).toHaveBeenCalledWith("ticket-once", ["uuid-a", "uuid-b"]);
    expect(screen.getByRole("button", { name: "Download private disabled-registration receipt" })).toBeInTheDocument();
    expect(screen.queryByText(/RTSP URL/)).not.toBeInTheDocument();
  });

  it("rejects a newly collided endpoint at preflight without invoking registration", async () => {
    vi.mocked(getCameras).mockResolvedValueOnce([]).mockResolvedValueOnce([{
      endpoint_uuid: "someone-else", display_name: "Other Camera", host: "192.168.68.55", port: 80,
    }] as never);
    render(<CameraBulkRestorePanel />);
    upload();
    await screen.findByText(/Imported 2 prior camera identities/);
    fireEvent.click(screen.getByRole("button", { name: "Compare fresh registry and ONVIF discovery" }));
    await screen.findByText(/2 eligible exact-ID restore candidates/);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select camera restore Porch" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed the 1 selected physical camera/ }));
    fireEvent.click(screen.getByRole("button", { name: /Register 1 owner-approved camera/ }));
    await waitFor(() => expect(screen.getByText(/No registration attempted/)).toBeInTheDocument());
    expect(acceptCameraDiscovery).not.toHaveBeenCalled();
  });

  it("holds discovery failures as unknown; importing invalid evidence discards previous review", async () => {
    vi.mocked(previewCameraDiscovery).mockRejectedValueOnce(new Error("offline"));
    render(<CameraBulkRestorePanel />);
    upload();
    await screen.findByText(/Imported 2 prior camera identities/);
    fireEvent.click(screen.getByRole("button", { name: "Compare fresh registry and ONVIF discovery" }));
    await screen.findByText(/offline/);
    expect(screen.queryByText(/eligible exact-ID restore candidates/)).not.toBeInTheDocument();
    const invalid = new File(["{}"], "invalid.json", { type: "application/json" });
    Object.defineProperty(invalid, "text", { value: async () => "{}" });
    fireEvent.change(screen.getByLabelText("Choose prior camera inventory or worklist JSON"), { target: { files: [invalid] } });
    await screen.findByText(/Import a Build 107 inventory/);
    expect(screen.getByRole("button", { name: "Compare fresh registry and ONVIF discovery" })).toBeDisabled();
  });
});
