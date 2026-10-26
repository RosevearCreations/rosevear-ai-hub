import type { CameraEventReview, FrigateEvent } from "./api";

export type EvidenceSource = "frigate_recent" | "hub_review_only";
export type EvidenceSort = "newest" | "oldest";
export type EvidenceFilters = {
  camera: string;
  label: string;
  review: string;
  sort: EvidenceSort;
  fromDate: string;
  throughDate: string;
};

export type EvidenceRow = {
  event_id: string;
  camera: string;
  label: string;
  start_time: number;
  source: EvidenceSource;
  event: FrigateEvent | null;
  review: CameraEventReview | undefined;
  duplicateCount: number;
  conflicted: boolean;
  futureDrift: boolean;
  invalidTime: boolean;
  media: "reported" | "none" | "unverified";
};

const safeId = (value: string) => /^[A-Za-z0-9_.:-]{1,160}$/.test(value);
const validEpoch = (value: number) => Number.isFinite(value) && value > 0;

/** Calendar-day boundaries use the operator's local timezone, including DST transitions. */
export function calendarBounds(fromDate: string, throughDate: string): { from: number; to: number; invalid: boolean } {
  const parse = (value: string): Date | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()) || [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((n, i) => String(n).padStart(i === 0 ? 4 : 2, "0")).join("-") !== value) return null;
    return date;
  };
  const from = fromDate ? parse(fromDate) : null;
  const to = throughDate ? parse(throughDate) : null;
  if ((fromDate && !from) || (throughDate && !to) || (from && to && from > to)) {
    return { from: 0, to: 0, invalid: true };
  }
  if (to) to.setDate(to.getDate() + 1);
  return { from: from ? from.getTime() / 1000 : Number.NEGATIVE_INFINITY,
    to: to ? to.getTime() / 1000 : Number.POSITIVE_INFINITY, invalid: false };
}

export function evidenceTime(seconds: number, timezone: "local" | "utc"): string {
  if (!validEpoch(seconds)) return "Invalid source timestamp";
  return new Date(seconds * 1000).toLocaleString(undefined, timezone === "utc"
    ? { timeZone: "UTC", timeZoneName: "short" }
    : { timeZoneName: "short" });
}

export function buildEvidenceTimeline(
  sourceEvents: FrigateEvent[],
  reviews: CameraEventReview[],
  options: EvidenceFilters,
  nowSeconds = Date.now() / 1000,
): { rows: EvidenceRow[]; duplicates: number; invalidDates: boolean } {
  const buckets = new Map<string, FrigateEvent[]>();
  for (const event of sourceEvents.slice(0, 100)) {
    if (!safeId(event.event_id)) continue;
    buckets.set(event.event_id, [...(buckets.get(event.event_id) ?? []), event]);
  }
  const reviewById = new Map(reviews.filter((item) => safeId(item.event_id)).map((item) => [item.event_id, item]));
  const rows: EvidenceRow[] = [];
  let duplicates = 0;
  for (const [id, values] of buckets) {
    const sorted = [...values].sort((a, b) =>
      a.camera.localeCompare(b.camera) || a.start_time - b.start_time || a.label.localeCompare(b.label));
    const sample = sorted[0];
    const savedReview = reviewById.get(id);
    const conflicted = sorted.some((event) => event.camera !== sample.camera
      || event.label !== sample.label || event.start_time !== sample.start_time)
      || (!!savedReview && (savedReview.camera_name !== sample.camera
        || savedReview.object_label !== sample.label
        || Math.abs(savedReview.event_start_time - sample.start_time) > 0.001));
    const invalidTime = !validEpoch(sample.start_time) || (sample.end_time !== null
      && (!validEpoch(sample.end_time) || sample.end_time < sample.start_time));
    const futureDrift = validEpoch(sample.start_time) && sample.start_time > nowSeconds + 300;
    const mediaFlagsConflict = sorted.some((event) => event.has_clip !== sample.has_clip
      || event.has_snapshot !== sample.has_snapshot);
    const mediaReported = sample.has_clip || sample.has_snapshot;
    duplicates += sorted.length - 1;
    rows.push({
      event_id: id, camera: sample.camera, label: sample.label, start_time: sample.start_time,
      source: "frigate_recent", event: sample, review: savedReview,
      duplicateCount: sorted.length, conflicted, futureDrift, invalidTime,
      media: conflicted || invalidTime || futureDrift || mediaFlagsConflict
        ? "unverified" : mediaReported ? "reported" : "none",
    });
  }
  for (const review of reviewById.values()) {
    if (buckets.has(review.event_id)) continue;
    rows.push({
      event_id: review.event_id, camera: review.camera_name, label: review.object_label,
      start_time: review.event_start_time, source: "hub_review_only", event: null,
      review, duplicateCount: 0, conflicted: false, futureDrift: false,
      invalidTime: !validEpoch(review.event_start_time), media: "unverified",
    });
  }
  const dates = calendarBounds(options.fromDate, options.throughDate);
  if (dates.invalid) return { rows: [], duplicates, invalidDates: true };
  const filtered = rows.filter((row) =>
    (options.camera === "all" || row.camera === options.camera)
    && (options.label === "all" || row.label === options.label)
    && (options.review === "all" || (row.review?.review_status ?? "unreviewed") === options.review)
    && validEpoch(row.start_time) && row.start_time >= dates.from && row.start_time < dates.to,
  );
  filtered.sort((a, b) => (options.sort === "newest" ? b.start_time - a.start_time : a.start_time - b.start_time)
    || a.event_id.localeCompare(b.event_id));
  return { rows: filtered.slice(0, 200), duplicates, invalidDates: false };
}
