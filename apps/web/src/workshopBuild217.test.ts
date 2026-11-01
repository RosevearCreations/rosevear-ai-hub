import { describe, expect, test } from "vitest";
import { buildWorkshopExport } from "./WorkshopMaintenancePlanner";
import type { WorkshopMaintenanceRow } from "./api";

describe("Build 217 manual export boundary", () => {
  test("preserves model, accessories, reminder and disabled status without claiming certification", () => {
    const row: WorkshopMaintenanceRow = {
      equipment_id: 3, name: "CNC 3018", project_key: "workshop", equipment_type: "CNC",
      model_reference: "3018 Pro", accessories: ["Clamp kit"], activity_type: "cnc",
      station_name: "Workbench", readiness_status: "blocked", disabled: true,
      last_inspected_at: null, due_state: "blocked", is_overdue: true,
      next_safe_check: "Keep offline", legacy_due_at: null,
      plan: { equipment_id: 3, revision: 2, interval_days: 90, reminder_days: 14,
        next_due_at: "2026-11-03T00:00:00Z", assigned_user_id: null,
        checklist: ["Guard check"], parts_refs: [], notes: "", last_completed_at: null },
    };
    const output = JSON.parse(buildWorkshopExport([row], "2026-11-01T00:00:00Z"));
    expect(output.schema).toBe("rosevear-workshop-manual-v1");
    expect(output.automatic_equipment_control).toBe(false);
    expect(output.records[0]).toMatchObject({ model_reference: "3018 Pro",
      accessories: ["Clamp kit"], disabled: true, safety_certification: false,
      plan: { reminder_days: 14 } });
  });
});
