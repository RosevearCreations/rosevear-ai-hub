import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { WorkshopMaintenancePlan, WorkshopMaintenanceRow } from "./api";
import { maintenanceDate, WorkshopMaintenancePlanner } from "./WorkshopMaintenancePlanner";

function initialRow(): WorkshopMaintenanceRow {
  return {
    equipment_id: 12, name: "Laser engraver", project_key: "dnd", equipment_type: "CO2 laser",
    activity_type: "laser", station_name: "Jewelry bench", readiness_status: "unverified",
    disabled: false, last_inspected_at: null, due_state: "unplanned", is_overdue: false,
    next_safe_check: "No manual inspection on record; arrange independent safeguards review.",
    plan: null, legacy_due_at: null,
  };
}

describe("Build 145 maintenance calendar and manual records", () => {
  let row: WorkshopMaintenanceRow;
  let calls: { url: string; body: unknown }[];
  beforeEach(() => {
    row = initialRow();
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
      calls.push({ url: method + " " + url, body });
      const ok = (json: unknown) => ({ ok: true, json: async () => json });
      if (url.endsWith("/api/v1/workshop/maintenance/overview") && method === "GET") return ok({
        as_of: "2026-10-25T20:00:00+00:00", items: [row], overdue_count: row.is_overdue ? 1 : 0,
        scope: "manual_records_only", automatic_equipment_control: false,
        safety_certification: false, counts_limited_to_first: 200,
      });
      if (url.endsWith("/api/v1/auth/users")) return ok([{
        id: 1, username: "owner", role: "owner", enabled: true,
        created_at: "2026-10-25T00:00:00Z",
      }]);
      if (url.endsWith("/equipment/12/maintenance-events") && method === "GET") return ok([]);
      if (url.endsWith("/equipment/12/maintenance") && method === "PUT") {
        const updated: WorkshopMaintenancePlan = {
          equipment_id: 12, revision: Number(body?.expected_revision) + 1,
          interval_days: Number(body?.interval_days), next_due_at: String(body?.next_due_at),
          assigned_user_id: typeof body?.assigned_user_id === "number" ? body.assigned_user_id : null,
          checklist: body?.checklist as string[], parts_refs: body?.parts_refs as string[],
          notes: String(body?.notes), last_completed_at: null,
        };
        row = { ...row, plan: updated, due_state: "scheduled" };
        return ok(updated);
      }
      if (url.endsWith("/equipment/12/maintenance-events") && method === "POST") {
        return ok({
          id: 77, outcome: body?.outcome, note: body?.note,
          completed_checklist: body?.completed_checklist, parts_used: body?.parts_used,
          previous_due_at: row.plan?.next_due_at, next_due_at: row.plan?.next_due_at,
          schedule_updated: body?.outcome === "checked", recorded_by_user_id: 1,
          recorded_at: "2026-10-25T20:00:00Z",
        });
      }
      return { ok: false, status: 404, json: async () => ({ detail: "Missing" }) };
    }));
    vi.stubGlobal("confirm", vi.fn(() => true));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  test("read-only viewing shows uncertain safety state without mutation controls", async () => {
    render(<WorkshopMaintenancePlanner role="read_only" />);
    expect(await screen.findByText("Laser engraver")).toBeInTheDocument();
    expect(screen.getByText(/No manual inspection on record/)).toBeInTheDocument();
    expect(screen.getByText(/0 overdue among those loaded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open equipment 360 maintenance" }));
    await screen.findByRole("region", { name: "Selected workshop maintenance record" });
    expect(screen.getByText(/Only Owner\/Administrator can edit plans/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save maintenance plan/ })).not.toBeInTheDocument();
    expect(calls.every((entry) => entry.url.startsWith("GET"))).toBe(true);
  });

  test("owner filters, plans, reviews exact checklist and explicitly saves a service receipt", async () => {
    render(<WorkshopMaintenancePlanner role="owner" />);
    await screen.findByText("Laser engraver");
    fireEvent.change(screen.getByLabelText("Maintenance schedule state"), { target: { value: "overdue" } });
    expect(screen.getByText("No equipment matches these filters.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Maintenance schedule state"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "Open equipment 360 maintenance" }));
    await screen.findByText("Owner-reviewed service plan");
    fireEvent.change(screen.getByLabelText(/Repeat interval/), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText(/Checklist \(one distinct item/), { target: { value: "Review guards\nCheck ventilation" } });
    fireEvent.change(screen.getByLabelText(/Parts \/ inventory references/), { target: { value: "Filter SKU 01" } });
    fireEvent.click(screen.getByRole("button", { name: /Save maintenance plan/ }));
    await waitFor(() => expect(calls.some((entry) => entry.url.startsWith("PUT "))).toBe(true));
    const saved = calls.find((entry) => entry.url.startsWith("PUT "))?.body as Record<string, unknown>;
    expect(saved.interval_days).toBe(45);
    expect(saved.checklist).toEqual(["Review guards", "Check ventilation"]);
    expect(saved.next_due_at).toMatch(/Z$/);
    expect(calls.every((entry) => !entry.url.includes("/control"))).toBe(true);

    await screen.findByText(/Manual maintenance plan saved and audited/);
    fireEvent.change(screen.getByLabelText("Service outcome"), { target: { value: "checked" } });
    expect(screen.getByRole("button", { name: "Confirm manual service record" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Review guards"));
    fireEvent.click(screen.getByLabelText("Check ventilation"));
    fireEvent.change(screen.getByLabelText(/Service observation and actual work/), {
      target: { value: "Changed filter and checked guards" },
    });
    fireEvent.click(screen.getByLabelText(/I understand that this record/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm manual service record" }));
    await waitFor(() => expect(calls.some((entry) => entry.url.startsWith("POST "))).toBe(true));
    const event = calls.find((entry) => entry.url.startsWith("POST "))?.body as Record<string, unknown>;
    expect(event.completed_checklist).toEqual(["Review guards", "Check ventilation"]);
    expect(event.acknowledge_not_certification).toBe(true);
    expect(vi.mocked(window.confirm)).toHaveBeenCalled();
  });

  test("calendar date formatter distinguishes invalid and missing timestamps", () => {
    expect(maintenanceDate(null)).toBe("Not scheduled");
    expect(maintenanceDate("not-a-date")).toMatch(/Invalid source date/);
    expect(maintenanceDate("2026-10-25T15:00:00Z")).not.toBe("Not scheduled");
  });
});
