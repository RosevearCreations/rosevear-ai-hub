import { describe, expect, test } from "vitest";

import { buildEvidenceTimeline, calendarBounds, evidenceTime, type EvidenceFilters } from "./cameraEvidenceModel";
import type { CameraEventReview, FrigateEvent } from "./api";

const opts: EvidenceFilters = {
  camera: "all", label: "all", review: "all", sort: "newest", fromDate: "", throughDate: "",
};
const event = (id: string, start: number, changes: Partial<FrigateEvent> = {}): FrigateEvent => ({
  event_id: id, camera: "front", label: "person", sub_label: null, start_time: start,
  end_time: start + 2, zones: ["porch"], has_clip: true, has_snapshot: true,
  false_positive: false, score: .9, ...changes,
});
const note = (id: string, start: number): CameraEventReview => ({
  event_id: id, camera_name: "front", object_label: "person", event_start_time: start,
  review_status: "follow_up", note: "Check this manually", reviewed_by_user_id: 1,
  updated_at: "2026-10-25T10:00:00Z",
});

describe("Build 142 evidence normalization", () => {
  test("deduplicates shuffled provider rows and joins historic reviews without invented footage", () => {
    const events = [event("new", 100), event("old", 10), event("new", 100)];
    const reviews = [note("new", 100), note("older-local", 5)];
    const result = buildEvidenceTimeline(events, reviews, opts, 300);
    expect(result.duplicates).toBe(1);
    expect(result.rows.map((row) => row.event_id)).toEqual(["new", "old", "older-local"]);
    expect(result.rows[0].duplicateCount).toBe(2);
    expect(result.rows[0].review?.review_status).toBe("follow_up");
    expect(result.rows[2].source).toBe("hub_review_only");
    expect(result.rows[2].media).toBe("unverified");
    expect(events[0].event_id).toBe("new");
  });

  test("conflicting duplicate identity, future drift and reversed times hold media claims", () => {
    const rows = buildEvidenceTimeline([
      event("conflict", 100), event("conflict", 100, { camera: "other" }),
      event("future", 1000), event("broken", 50, { end_time: 40 }),
    ], [], opts, 300).rows;
    expect(rows.find((row) => row.event_id === "conflict")).toMatchObject({ conflicted: true, media: "unverified" });
    expect(rows.find((row) => row.event_id === "future")).toMatchObject({ futureDrift: true, media: "unverified" });
    expect(rows.find((row) => row.event_id === "broken")).toMatchObject({ invalidTime: true, media: "unverified" });
  });

  test("reused provider IDs with mismatching saved identity and inconsistent media flags are held", () => {
    const changedReview = note("reused", 100);
    changedReview.camera_name = "another_camera";
    const rows = buildEvidenceTimeline([
      event("reused", 100), event("disputed-media", 90),
      event("disputed-media", 90, { has_clip: false, has_snapshot: false }),
    ], [changedReview], opts, 200).rows;
    expect(rows.find((row) => row.event_id === "reused")).toMatchObject({ conflicted: true, media: "unverified" });
    expect(rows.find((row) => row.event_id === "disputed-media")).toMatchObject({ conflicted: false, media: "unverified" });
  });

  test("calendar date boundaries include the entire local final day and reject inverted range", () => {
    const d = "2026-10-25";
    const bounds = calendarBounds(d, d);
    expect(bounds.invalid).toBe(false);
    const time = new Date("2026-10-25T23:59:59").getTime() / 1000;
    expect(time).toBeGreaterThanOrEqual(bounds.from);
    expect(time).toBeLessThan(bounds.to);
    expect(buildEvidenceTimeline([event("within", time), event("after", bounds.to + 5)], [],
      { ...opts, fromDate: d, throughDate: d }, time + 10).rows.map((row) => row.event_id)).toEqual(["within"]);
    expect(calendarBounds("2026-10-26", d).invalid).toBe(true);
    expect(calendarBounds("2026-02-30", "").invalid).toBe(true);
  });

  test("filters by source identity, label, review and stable same-time ID ordering", () => {
    const rows = buildEvidenceTimeline([event("B", 100), event("A", 100, { label: "car" })],
      [note("B", 100)], { ...opts, review: "follow_up" }, 200).rows;
    expect(rows.map((row) => row.event_id)).toEqual(["B"]);
    expect(buildEvidenceTimeline([event("B", 100), event("A", 100)], [], opts, 200).rows
      .map((row) => row.event_id)).toEqual(["A", "B"]);
  });

  test("timestamp formatting labels UTC explicitly and rejects unknown time", () => {
    expect(evidenceTime(0, "utc")).toBe("Invalid source timestamp");
    expect(evidenceTime(1730000000, "utc")).toMatch(/UTC|GMT/);
  });
});
