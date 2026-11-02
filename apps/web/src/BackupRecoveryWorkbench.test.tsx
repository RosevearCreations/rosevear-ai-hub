import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BackupRecoveryWorkbench, recoverySteps } from "./BackupRecoveryWorkbench";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 224 owner recovery workbench", () => {
  it("never probes automatically, calls one read-only GET and labels evidence as unverified", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({
      sampled_at_utc: "2026-11-02T12:00:00Z", source: "local_private_recovery_directory_names_only",
      expected_directory: "logs/private-recovery", directory_state: "present", archive_count: 2,
      latest_archive_modified_utc: null, evidence_file_count: 1, latest_evidence_modified_utc: null,
      archive_integrity: "not_checked", last_verified_restore: null, off_machine_copy: "not_verified",
      retention_policy: "not_configured_by_this_workbench", automatic_backup_or_restore: false,
      included_source_families: ["SQLite"], excluded: [".env"],
    }) } as Response);
    render(<BackupRecoveryWorkbench />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Check local backup inventory" }));
    await waitFor(() => expect(screen.getByText("Present; content not verified")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/system/backup-inventory");
    expect(screen.getByText("Not checked / no independently verified result")).toBeInTheDocument();
    expect(screen.getByText("Not verified / not configured by this workbench")).toBeInTheDocument();
  });

  it("keeps rehearsal checklist only in local component state", () => {
    render(<BackupRecoveryWorkbench />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(recoverySteps.length);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/1 of 7 planning steps reviewed locally/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset local checklist" }));
    expect(screen.getByText(/0 of 7 planning steps reviewed locally/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows unknown rather than zero for an unavailable backup directory", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({
      sampled_at_utc: "2026-11-02T12:00:00Z", expected_directory: "logs/private-recovery",
      directory_state: "not_found", archive_count: null, evidence_file_count: null,
      latest_archive_modified_utc: null, latest_evidence_modified_utc: null,
      included_source_families: [], excluded: [],
    }) } as Response);
    render(<BackupRecoveryWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: "Check local backup inventory" }));
    await waitFor(() => expect(screen.getByText(/Not found \/ installation path not confirmed/)).toBeInTheDocument());
    expect(screen.getAllByText("Unknown")).toHaveLength(2);
  });
});
