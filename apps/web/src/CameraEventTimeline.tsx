import { useEffect, useMemo, useState } from "react";

import {
  exportCameraReviewCsv,
  getCameraEventReviews,
  saveCameraEventReview,
  type CameraEventReview,
  type FrigateEvent,
} from "./api";
import { buildEvidenceTimeline, evidenceTime } from "./cameraEvidenceModel";

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
  const [status, setStatus] = useState<CameraEventReview["review_status"]>(
    saved?.review_status ?? "needs_review",
  );
  const [note, setNote] = useState(saved?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(saved?.review_status ?? "needs_review");
    setNote(saved?.note ?? "");
  }, [event.event_id, saved?.updated_at, saved?.review_status, saved?.note]);

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
          <option value="follow_up">Acknowledged for follow-up</option>
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
  observedAt,
}: {
  events: FrigateEvent[];
  online: boolean;
  canAdminister: boolean;
  observedAt?: string | null;
}) {
  const [reviews, setReviews] = useState<CameraEventReview[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [camera, setCamera] = useState("all");
  const [label, setLabel] = useState("all");
  const [review, setReview] = useState("all");
  const [sort, setSort] = useState<TimelineSort>("newest");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [timezone, setTimezone] = useState<"local" | "utc">("local");
  const [source, setSource] = useState("all");
  const [ackBusy, setAckBusy] = useState("");
  const [ackError, setAckError] = useState("");
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

  const timeline = useMemo(() => buildEvidenceTimeline(events, canAdminister ? reviews : [],
    { camera, label, review, sort, fromDate, throughDate }),
    [events, reviews, canAdminister, camera, label, review, sort, fromDate, throughDate]);
  const all = useMemo(() => buildEvidenceTimeline(events, canAdminister ? reviews : [],
    { camera: "all", label: "all", review: "all", sort: "newest", fromDate: "", throughDate: "" }),
    [events, reviews, canAdminister]);
  const cameraOptions = useMemo(() => [...new Set(all.rows.map((row) => row.camera))].sort(), [all]);
  const labelOptions = useMemo(() => [...new Set(all.rows.map((row) => row.label))].sort(), [all]);
  const filtered = timeline.rows.filter((row) => source === "all" || row.source === source);
  const eventIds = useMemo(() => new Set(events.map((item) => item.event_id)), [events]);
  const older = reviews.filter((item) => !eventIds.has(item.event_id));
  const observationSeconds = observedAt ? Date.parse(observedAt) / 1000 : NaN;
  const stale = !Number.isFinite(observationSeconds) || Date.now() / 1000 - observationSeconds > 300;

  async function acknowledgeFollowUp(event: FrigateEvent, saved?: CameraEventReview) {
    if (!canAdminister || ackBusy || saved?.review_status === "follow_up") return;
    setAckBusy(event.event_id);
    setAckError("");
    try {
      const result = await saveCameraEventReview(event.event_id, {
        review_status: "follow_up", note: saved?.note ?? "",
      });
      setReviews((current) => [result, ...current.filter((item) => item.event_id !== result.event_id)]);
    } catch {
      setAckError("Follow-up acknowledgement was not saved. Recheck permissions and current Frigate evidence.");
    } finally {
      setAckBusy("");
    }
  }

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
      <h3>Build 142 — Camera events & evidence workbench</h3>
      <p>
        Combined Frigate observations and private Hub review notes. This view does not
        download footage or assert that a reported clip still exists. No Hub-authorized
        footage endpoint is configured, so playback links remain unavailable.
      </p>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">ⓘ</span> Evidence & playback help</summary>
        <ol>
          <li>Refresh Frigate for a fresh bounded sample (up to 100 recent events); older Hub reviews are notes, not source recordings.</li>
          <li>Use date, source, camera, object and review filters. Dates follow the operator's local calendar; timestamps may be displayed in UTC.</li>
          <li>Conflicting duplicates, future clock drift and invalid timestamps hold media claims. A reported clip or snapshot is not guaranteed accessible or retained.</li>
          <li>Owner/Admin can acknowledge a current event for manual follow-up. This saves local review metadata without modifying Frigate evidence or retention.</li>
          <li>For playback, use only separately authorized private media routes when implemented. Never open raw Frigate or RTSP source URLs in another browser.</li>
        </ol>
      </details>
      <p className="camera-evidence-observation">Source: local Frigate metadata · observed {observedAt
        ? new Date(observedAt).toLocaleString() : "not verified"} · {stale ? "stale/unverified" : "recent sample"}.
        Frigate {online ? "online" : "offline"}; the local review ledger is independent.</p>
      <div className="camera-timeline-filters">
        <label>Source
          <select aria-label="Filter evidence by source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            <option value="frigate_recent">Recent Frigate events</option>
            {canAdminister && <option value="hub_review_only">Hub review-only history</option>}
          </select>
        </label>
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
            <option value="follow_up">Acknowledged for follow-up</option>
          </select>
        </label>
        <label>Order
          <select aria-label="Sort events by time" value={sort} onChange={(e) => setSort(e.target.value as TimelineSort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <label>From date (local)<input type="date" aria-label="From event date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label>Through date (local)<input type="date" aria-label="Through event date" value={throughDate} onChange={(e) => setThroughDate(e.target.value)} /></label>
        <label>Display time zone
          <select aria-label="Event time zone" value={timezone} onChange={(e) => setTimezone(e.target.value as typeof timezone)}>
            <option value="local">Local time</option>
            <option value="utc">UTC</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={() => { setCamera("all"); setLabel("all"); setReview("all"); setSort("newest"); setFromDate(""); setThroughDate(""); setSource("all"); }}>Clear evidence filters</button>
      {timeline.invalidDates && <p role="alert">Invalid date range. Choose real calendar dates in chronological order.</p>}
      <p role="status">{filtered.length} evidence items shown from {all.rows.length} distinct event IDs;
        {" "}{all.duplicates} duplicate source row(s) reconciled.
        {!online ? " Frigate offline — only saved private review metadata may remain." : ""}
      </p>
      {filtered.length === 0 && <p>No matching evidence. Clear filters or refresh Frigate; absence here does not prove no recordings exist.</p>}
      <div className="frigate-event-list">
        {filtered.map((row) => {
          const event = row.event;
          const saved = row.review;
          const safeToReview = !!event && !row.conflicted && !row.invalidTime && !row.futureDrift && online && !stale;
          return (
            <article className="frigate-event-card" key={row.event_id}>
              <header>
                <div>
                  <strong>{row.label}</strong>
                  <small>{event?.sub_label ? event.sub_label + " · " : ""}{row.camera}</small>
                </div>
                <time>{evidenceTime(row.start_time, timezone)}</time>
              </header>
              <dl className="ha-meta">
                <div><dt>Source</dt><dd>{row.source === "frigate_recent" ? "Frigate recent sample" : "Hub local review only"}</dd></div>
                <div><dt>Event ID</dt><dd><code>{row.event_id}</code></dd></div>
                <div><dt>Category</dt><dd>{row.label}{event?.false_positive ? " · possible false positive" : ""}</dd></div>
                <div><dt>Zones</dt><dd>{event ? event.zones.length ? event.zones.join(", ") : "None reported" : "Not in current sample"}</dd></div>
                <div><dt>Clip / snapshot</dt><dd>{row.media === "reported" && stale
                  ? "Previously reported; source observation stale — availability unverified"
                  : row.media === "reported" ? "Reported in Frigate metadata; not playable through Hub"
                  : row.media === "none" ? "Not reported" : "Availability unverified"}</dd></div>
                <div><dt>Retention</dt><dd>Not verified; old footage may have expired</dd></div>
                <div><dt>Playback</dt><dd>On hold — no authenticated Hub media endpoint</dd></div>
                {row.duplicateCount > 1 && <div><dt>Duplicates</dt><dd>{row.duplicateCount} source rows combined</dd></div>}
                {row.conflicted && <div><dt>Identity conflict</dt><dd>Camera, label or time disagreement — review source</dd></div>}
                {row.futureDrift && <div><dt>Clock drift</dt><dd>Event is more than five minutes in the future</dd></div>}
                {row.invalidTime && <div><dt>Time error</dt><dd>Missing, invalid or reversed source time</dd></div>}
                <div><dt>Review</dt><dd>{saved?.review_status ?? "Unreviewed"}</dd></div>
              </dl>
              {canAdminister && safeToReview && event && <button type="button"
                disabled={!!ackBusy || saved?.review_status === "follow_up"}
                onClick={() => void acknowledgeFollowUp(event, saved)}>
                {saved?.review_status === "follow_up" ? "Acknowledged for follow-up" : "Acknowledge for follow-up"}
              </button>}
              {canAdminister && safeToReview && event && (
                <EventReviewForm key={event.event_id} event={event} saved={saved}
                  onSaved={(next) => setReviews((current) =>
                    [next, ...current.filter((item) => item.event_id !== next.event_id)])} />
              )}
              {canAdminister && !safeToReview && <small>Editing held: current, consistent Frigate evidence and a fresh source observation are required.</small>}
              {canAdminister && saved?.note && <p>Saved local note: {saved.note}</p>}
            </article>
          );
        })}
      </div>
      {ackError && <p role="alert">{ackError}</p>}
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
