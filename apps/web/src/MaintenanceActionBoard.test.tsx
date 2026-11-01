import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { canCloseMaintenanceAction, MaintenanceActionBoard } from "./MaintenanceActionBoard";
import type { MaintenanceActionRow } from "./api";

const LASER: MaintenanceActionRow = {
  source_kind: "workshop_equipment", source_id: "3", title: "Workshop: Ortur laser",
  source_state: "blocked", source_stale: true, hazard_unresolved: true,
  source_due_at: "2026-10-29T12:00:00Z", revision: 0, expected_revision: 0,
  assigned_user_id: null, due_at: null, status: "open", acknowledged: false,
  decision_reason: "", manually_reviewed: false,
};
const HOUSE: MaintenanceActionRow = {
  ...LASER, source_kind: "household", source_id: "abc", title: "Replace faucet washer",
  source_state: "manual", source_stale: false, hazard_unresolved: false,
};

describe("Build 219 owner action board", () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
      calls.push({ url, method, body });
      const ok = (json: unknown) => ({ ok: true, json: async () => json });
      if (url.endsWith("/api/v1/maintenance-actions") && method === "GET") return ok({
        items: [LASER, HOUSE], as_of: "2026-11-01T12:00:00Z",
        source_scope: "bounded_local_records_only", source_limit_each: 200,
        automatic_closure: false, equipment_control: false,
      });
      if (url.endsWith("/api/v1/auth/users")) return ok([{
        id: 1, username: "owner", role: "owner", enabled: true,
      }]);
      if (url.endsWith("/workshop_equipment/3") && method === "PUT") return ok({
        ...LASER, ...body, revision: 1, manually_reviewed: true,
      });
      return { ok: false, status: 404, json: async () => ({ detail: "Missing" }) };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  test("read-only users see source hazard and no owner forms", async () => {
    render(<MaintenanceActionBoard role="read_only" />);
    expect(await screen.findByText("Workshop: Ortur laser")).toBeInTheDocument();
    expect(screen.getAllByText(/Source issue unresolved/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Review action: Workshop: Ortur laser" }));
    expect(screen.getByText(/owner decisions are unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save owner action revision/ })).not.toBeInTheDocument();
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  });

  test("owner can defer unresolved laser but closure is locked", async () => {
    render(<MaintenanceActionBoard role="owner" />);
    await screen.findByText("Workshop: Ortur laser");
    fireEvent.click(screen.getByRole("button", { name: "Review action: Workshop: Ortur laser" }));
    expect(screen.getByRole("option", { name: "Close resolved task" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Decision"), { target: { value: "deferred" } });
    fireEvent.change(screen.getByLabelText(/Decision reason/), { target: { value: "Awaiting physical inspection" } });
    fireEvent.click(screen.getByLabelText("Owner acknowledged this action"));
    fireEvent.click(screen.getByRole("button", { name: "Save owner action revision 0" }));
    await waitFor(() => expect(calls.some((call) => call.method === "PUT")).toBe(true));
    const saved = calls.find((call) => call.method === "PUT")?.body as Record<string, unknown>;
    expect(saved.status).toBe("deferred");
    expect(saved.expected_revision).toBe(0);
    expect(saved.acknowledged).toBe(true);
  });

  test("closure requires nonhazardous and fresh source evidence", () => {
    expect(canCloseMaintenanceAction(LASER)).toBe(false);
    expect(canCloseMaintenanceAction({ ...HOUSE, source_stale: true })).toBe(false);
    expect(canCloseMaintenanceAction(HOUSE)).toBe(true);
  });
});
