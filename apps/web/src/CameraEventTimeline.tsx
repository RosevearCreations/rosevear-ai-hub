import { useEffect, useMemo, useState } from "react";

import {
  exportCameraReviewCsv,
  getCameraEventReviews,
  saveCameraEventReview,
  type CameraEventReview,
  type FrigateEvent,
} from "./api";

export type TimelineSort = "newest" | "oldest";
export type TimelineFilter = {
  camera: string;
  label: string;
  review: string;
  sort: TimelineSort;
};

export function filterCameraEvents(
  events: FrigateEvent[],
  reviews: CameraEventReview[],
  options: TimelineFilter,
): FrigateEvent[] {
  const byId = new Map(reviews.map((item) => [item.event_id, item]));
  return events
    .filter((event) => (
      (options.camera === "all" || event.camera === options.camera)
      && (options.label === "all" || event.label === options.label)
      && (options.review === "all"
        || (byId.get(event.event_id)?.review_status ?? "unreviewed") === options.review)
    ))
    .sort((a, b) => options.sort === "newest"
      ? b.start_time - a.start_time : a.start_time - b.start_time);
}

const formatTime = (seconds: number) =>
  Number.isFinite(seconds) ? new Date(seconds * 1000).toLocaleString() : "Unknown";

function EventReviewForm({
  event,
  saved,
  onSaved,
}: {
  event: FrigateEvent;
  saved?: CameraEventReview;
  onSaved: (review: CameraEventReview) => void;
}) {
  const [status, setStatus] = useState<"needs_review" | "reviewed" | "flagged">(
    saved?.review_status ?? "needs_review",
  );
  const [note, setNote] = useState(saved?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = await saveCameraEventReview(event.event_id, {
        review_status: status,
        note: note.trim(),
      });
      onSaved(result);
    } catch {
      setError("Unable to save. Verify account permissions and Frigate availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="camera-review-form">
      <summary>Review / annotate event</summary>
      <label>
        Review state
        <select aria-label={`Review status for ${event.event_id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="needs_review">Needs review</option>
          <option value="reviewed">Reviewed</option>
          <option value="flagged">Flagged</option>
        </select>
      </label>
      <label>
        Private note (500 characters maximum)
        <textarea value={note} maxLength={500}
          aria-label={`Private note for ${event.event_id}`}
          onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save local review"}
      </button>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}

export function CameraEventTimeline({
  events,
  online,
  canAdminister,
}: {
  events: FrigateEvent[];
  online: boolean;
  canAdminister: boolean;
}) {
  const [reviews, setReviews] = useState<CameraEventReview[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [camera, setCamera] = useState("all");
  const [label, setLabel] = useState("all");
  const [review, setReview] = useState("all");
  const [sort, setSort] = useState<TimelineSort>("newest");
  const [ack, setAck] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (!canAdminister) return;
    const controller = new AbortController();
    getCameraEventReviews(controller.signal)
      .then(setReviews)
      .catch(() => { if (!controller.signal.aborted) setReviewError("Saved reviews not verified."); });
    return () => controller.abort();
  }, [canAdminister]);

  const cameraOptions = useMemo(
    () => [...new Set(events.map((event) => event.camera))].sort(), [events],
  );
  const labelOptions = useMemo(
    () => [...new Set(events.map((event) => event.label))].sort(), [events],
  );
  const filtered = useMemo(
    () => filterCameraEvents(events, reviews, { camera, label, review, sort }),
    [events, reviews, camera, label, review, sort],
  );
  const byId = useMemo(() => new Map(reviews.map((item) => [item.event_id, item])), [reviews]);
  const eventIds = useMemo(() => new Set(events.map((item) => item.event_id)), [events]);
  const older = reviews.filter((item) => !eventIds.has(item.event_id));

  async function exportNotes() {
    if (!ack || !canAdminister) return;
    setExportError("");
    try {
      await exportCameraReviewCsv();
    } catch {
      setExportError("Export was not completed. Check permissions; no video was downloaded.");
    }
  }

  return (
    <section className="panel camera-event-timeline" aria-label="Camera event timeline workbench">
      <h3>Camera event timeline</h3>
      <p>
        Recent local Frigate metadata only. No recordings, snapshots or RTSP credentials
        are downloaded. Filtered results do not change Frigate's event retention.
      </p>
      <div className="camera-timeline-filters">
        <label>Camera
          <select aria-label="Filter events by camera" value={camera} onChange={(e) => setCamera(e.target.value)}>
            <option value="all">All cameras</option>
            {cameraOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Object
          <select aria-label="Filter events by object" value={label} onChange={(e) => setLabel(e.target.value)}>
            <option value="all">All objects</option>
            {labelOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>Review
          <select aria-label="Filter events by review" value={review} onChange={(e) => setReview(e.target.value)}>
            <option value="all">All states</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="needs_review">Needs review</option>
            <option value="reviewed">Reviewed</option>
            <option value="flagged">Flagged</option>
          </select>
        </label>
        <label>Order
          <select aria-label="Sort events by time" value={sort} onChange={(e) => setSort(e.target.value as TimelineSort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      <p role="status">{filtered.length} of {events.length} recent events shown.
        {!online ? " Frigate offline — recent events unavailable." : ""}
      </p>
      {filtered.length === 0 && <p>No matching recent events. Frigate is optional.</p>}
      <div className="frigate-event-list">
        {filtered.map((event) => {
          const saved = byId.get(event.event_id);
          return (
            <article className="frigate-event-card" key={event.event_id}>
              <header>
                <div>
                  <strong>{event.label}</strong>
                  <small>{event.sub_label ? event.sub_label + " · " : ""}{event.camera}</small>
                </div>
                <time>{formatTime(event.start_time)}</time>
              </header>
              <dl className="ha-meta">
                <div><dt>Zones</dt><dd>{event.zones.length ? event.zones.join(", ") : "None"}</dd></div>
                <div><dt>Snapshot</dt><dd>{event.has_snapshot ? "Available in Frigate" : "No"}</dd></div>
                <div><dt>Clip</dt><dd>{event.has_clip ? "Available in Frigate" : "No"}</dd></div>
                <div><dt>Review</dt><dd>{saved?.review_status ?? "Unreviewed"}</dd></div>
              </dl>
              {canAdminister && (
                <EventReviewForm key={event.event_id} event={event} saved={saved}
                  onSaved={(next) => setReviews((current) =>
                    [next, ...current.filter((item) => item.event_id !== next.event_id)])} />
              )}
              {canAdminister && saved?.note && <p>Saved local note: {saved.note}</p>}
            </article>
          );
        })}
      </div>
      {canAdminister && (
        <section className="camera-review-archive">
          <h4>Saved local reviews</h4>
          <p>{reviews.length} saved annotations; {older.length} are not in the current Frigate
            results. Offline records remain local metadata, not accessible recordings.</p>
          {reviewError && <p role="alert">{reviewError}</p>}
          {older.slice(0, 20).map((item) => (
            <p key={item.event_id}>
              <strong>{item.object_label}</strong> · {item.camera_name} · {formatTime(item.event_start_time)}
              {" — "}{item.review_status}
            </p>
          ))}
          <div className="camera-export-guard">
            <label>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              I understand the CSV includes private locally saved review notes. Keep it private.
            </label>
            <button type="button" disabled={!ack} onClick={() => void exportNotes()}>
              Export metadata-only CSV (maximum 100 rows)
            </button>
            {exportError && <p role="alert">{exportError}</p>}
          </div>
        </section>
      )}
      <small>Review notes are kept in the Hub SQLite database without automatic deletion.
        A video recorder's separate retention settings still apply. Export is a manual
        private-metadata download only; store or delete that copy securely.</small>
    </section>
  );
}
