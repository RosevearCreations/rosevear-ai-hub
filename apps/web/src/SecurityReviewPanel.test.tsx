import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ownerSecurityChecks, SecurityReviewPanel } from "./SecurityReviewPanel";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 225 security review", () => {
  it("does not scan or load until the owner requests a readback", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({
      sampled_at_utc: "2026-11-02T12:00:00Z", role_counts: { owner: { enabled: 1, total: 1 }, read_only: { enabled: 0, total: 1 } },
      active_session_count: 1, audit_event_count: 4, api_bind_scope: "loopback", cookie_secure_configured: false,
      cors_origin_count: 4, cors_wildcard_configured: false, session_max_hours: 168,
      findings: ["Independently review Caddy HTTPS, Tailscale ACLs and host firewall."],
    }) } as Response);
    render(<SecurityReviewPanel />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review local security posture" }));
    await waitFor(() => expect(screen.getByText("Loopback configured")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/v1/system/security-posture");
    expect(screen.getByText(/Not inspected — owner device verification required/)).toBeInTheDocument();
  });

  it("keeps review marks session-only and resets without writing", () => {
    render(<SecurityReviewPanel />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(ownerSecurityChecks.length);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/1 of 6 review steps marked locally/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset security checklist" }));
    expect(screen.getByText(/0 of 6 review steps marked locally/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
