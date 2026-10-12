import { describe, expect, test } from "vitest";
import { filterCameraEvents } from "./CameraEventTimeline";
import type { FrigateEvent, CameraEventReview } from "./api";

const make = (id: string, camera: string, label: string, time: number): FrigateEvent => ({
  event_id: id,
  camera,
  label,
  sub_label: null,
  start_time: time,
  end_time: null,
  zones: [],
  has_clip: false,
  has_snapshot: false,
  false_positive: false,
  score: null,
});
const notes: CameraEventReview[] = [{
  event_id: "B", camera_name: "door", object_label: "person", event_start_time: 20,
  review_status: "flagged", note: "Checked", reviewed_by_user_id: 1, updated_at: "2026-10-12T10:00:00Z",
}];

describe("Build 054 camera timeline", () => {
  const events = [make("A", "garage", "car", 10), make("B", "door", "person", 20),
    make("C", "door", "car", 30)];
  test("newest sorted without mutating input", () => {
    expect(filterCameraEvents(events, notes, {
      camera: "all", label: "all", review: "all", sort: "newest",
    }).map((x) => x.event_id)).toEqual(["C", "B", "A"]);
    expect(events.map((x) => x.event_id)).toEqual(["A", "B", "C"]);
  });
  test("camera, label and review filters", () => {
    expect(filterCameraEvents(events, notes, {
      camera: "door", label: "person", review: "flagged", sort: "oldest",
    }).map((x) => x.event_id)).toEqual(["B"]);
    expect(filterCameraEvents(events, notes, {
      camera: "all", label: "car", review: "unreviewed", sort: "oldest",
    }).map((x) => x.event_id)).toEqual(["A", "C"]);
  });
  test("empty input works when Frigate is unavailable", () => {
    expect(filterCameraEvents([], notes, {
      camera: "all", label: "all", review: "all", sort: "newest",
    })).toEqual([]);
  });
});
