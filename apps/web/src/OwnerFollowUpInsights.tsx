import { useState } from "react";

import { safeAlertViewName } from "./alertReviewPreferences";
import { type LocalFollowUpJournal } from "./alertFollowUpJournal";
import { type FollowUpQueueFilters, type FollowUpQueueItem } from "./alertFollowUpQueue";
import {
  loadQueuePresets, localReviewReportPreview, localReviewWorkload,
  MAX_FOLLOW_UP_QUEUE_PRESETS, persistQueuePresets, saveQueuePreset,
} from "./followUpQueueInsights";

function localStorageOrNull(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function OwnerFollowUpInsights({ accountId, journal, queue, matching, filters, onApplyFilters }: {
  accountId: number;
  journal: LocalFollowUpJournal;
  queue: readonly FollowUpQueueItem[];
  matching: readonly FollowUpQueueItem[];
  filters: FollowUpQueueFilters;
  onApplyFilters: (next: FollowUpQueueFilters) => void;
}) {
  const [preferences, setPreferences] = useState(() => loadQueuePresets(localStorageOrNull(), accountId));
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [notice, setNotice] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const selectedPreset = preferences.presets.find(item => item.id === selectedPresetId) ?? null;
  const now = new Date();
  const workload = localReviewWorkload(journal, queue, now);

  function savePreset() {
    const name = safeAlertViewName(presetName);
    if (!name) {
      setNotice("Enter a name of 1–40 characters without links, email addresses or credentials.");
      return;
    }
    const next = saveQueuePreset(preferences, name, filters);
    if (!next) {
      setNotice(`Only ${MAX_FOLLOW_UP_QUEUE_PRESETS} queue presets may be saved here. Remove one first.`);
      return;
    }
    const stored = persistQueuePresets(localStorageOrNull(), accountId, next);
    setPreferences(next);
    setSelectedPresetId(next.presets.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id ?? "");
    setNotice(stored ? `Saved “${name}” in this browser for this account only.`
      : "Browser storage was unavailable. Preset is available only until this screen closes.");
  }

  function removePreset() {
    if (!selectedPreset) return;
    const next = { version: 1 as const, presets: preferences.presets.filter(item => item.id !== selectedPreset.id) };
    const stored = persistQueuePresets(localStorageOrNull(), accountId, next);
    setPreferences(next); setSelectedPresetId("");
    setNotice(stored ? "Personal queue preset removed. Notifications were not changed."
      : "Preset removed in this session only; browser storage is unavailable.");
  }

  return <section className="home-follow-up-insights" aria-label="Saved owner queue presets and local review trends">
    <h6>My queue presets</h6>
    <p>Presets store only the three personal queue filters. No notification text, note bodies or inbox data are saved in them.</p>
    <div className="home-follow-up-insights-controls">
      <label htmlFor="home-follow-up-preset-name">Preset name
        <input id="home-follow-up-preset-name" value={presetName} maxLength={40}
          onChange={event => setPresetName(event.target.value)} placeholder="e.g. Weekly overdue reviews" />
      </label>
      <button type="button" onClick={savePreset}>Save queue filters</button>
      <label htmlFor="home-follow-up-preset-list">Saved queue presets
        <select id="home-follow-up-preset-list" value={selectedPresetId}
          onChange={event => setSelectedPresetId(event.target.value)}>
          <option value="">Choose a queue preset</option>
          {preferences.presets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" disabled={!selectedPreset} onClick={() => {
        if (!selectedPreset) return;
        onApplyFilters({ ...selectedPreset.filters });
        setNotice(`Applied “${selectedPreset.name}” to this browser-local queue only.`);
      }}>Apply queue preset</button>
      <button type="button" disabled={!selectedPreset} onClick={removePreset}>Remove queue preset</button>
    </div>
    <p role="status">{notice || `${preferences.presets.length} of ${MAX_FOLLOW_UP_QUEUE_PRESETS} private queue presets saved locally.`}</p>
    <section aria-label="Personal follow-up workload trends">
      <h6>Local review workload snapshot</h6>
      <p>Only this browser's bounded local note history is counted. These are not live alert counts, workload hours or server acknowledgements.</p>
      <dl className="home-follow-up-workload">
        <div><dt>Local notes in last 7 days</dt><dd>{workload.recentNotes}</dd></div>
        <div><dt>Local notes in preceding 7 days</dt><dd>{workload.previousNotes}</dd></div>
        <div><dt>Change in local note events</dt><dd>{workload.change >= 0 ? "+" : ""}{workload.change}</dd></div>
        <div><dt>Outstanding personal reviews</dt><dd>{workload.outstanding}</dd></div>
        <div><dt>Outstanding last reviewed 14+ days ago</dt><dd>{workload.overdue}</dd></div>
      </dl>
      <p>At most 40 local notes are retained. Comparison periods may be incomplete, and these numbers must not be interpreted as a productivity or live-system trend.</p>
    </section>
    <section aria-label="Privacy-safe follow-up report preview">
      <h6>Safe report preview</h6>
      <p>Preview aggregate counts for the current filters. No data is exported, copied, transmitted or posted; private notes and notification numbers are excluded.</p>
      <button type="button" aria-expanded={showPreview} aria-controls="home-follow-up-report-preview"
        onClick={() => setShowPreview(previous => !previous)}>{showPreview ? "Hide safe report preview" : "Preview safe report"}</button>
      {showPreview && <pre id="home-follow-up-report-preview" tabIndex={0} aria-label="Private local report preview">
        {localReviewReportPreview(workload, matching, filters, now)}
      </pre>}
    </section>
  </section>;
}
