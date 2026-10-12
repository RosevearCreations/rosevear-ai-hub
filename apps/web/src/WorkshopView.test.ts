import { describe, expect, test } from "vitest";
import { readinessMessage } from "./WorkshopView";
import type { WorkshopEquipment } from "./api";

const item: WorkshopEquipment = {
  id: 2, project_key: "maker", station_id: 1, name: "Laser A",
  equipment_type: "CO2 laser", activity_type: "laser", readiness_status: "unverified",
  maintenance_due_at: null, last_inspected_at: null, notes: "", disabled: false,
  created_at: "2026-10-12T00:00:00Z",
};

describe("Build 057 safety language", () => {
  test("observed OK never becomes an authorization", () => {
    expect(readinessMessage({ ...item, readiness_status: "review_required" }, Date.now()))
      .toContain("independent safety review");
  });
  test("blocked always disallows operation", () => {
    expect(readinessMessage({ ...item, readiness_status: "blocked" }, Date.now()))
      .toContain("do not operate");
  });
  test("expired maintenance overrides observation", () => {
    expect(readinessMessage({
      ...item, readiness_status: "review_required", maintenance_due_at: "2020-01-01T00:00:00Z",
    }, Date.now())).toContain("Maintenance overdue");
  });
  test("unverified and disabled remain non-operational", () => {
    expect(readinessMessage(item, Date.now())).toContain("do not operate");
    expect(readinessMessage({ ...item, disabled: true }, Date.now())).toContain("do not operate");
  });
});
