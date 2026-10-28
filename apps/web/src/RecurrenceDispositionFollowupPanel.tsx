import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { ExceptionReceipt } from "./ownerOutcomeExceptionRecurrence";
import { compareDispositionFollowups, FOLLOWUP_CATEGORIES, recordDispositionFollowup,
  type DispositionFollowupNote, type FollowupCategory } from "./ownerRecurrenceDispositionFollowup";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function RecurrenceDispositionFollowupPanel({ prior, notes, environment,
  importedRecurrences, importedFollowups, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: ExceptionReceipt;
  notes: DispositionFollowupNote[];
  environment: TrialEnvironment;
  importedRecurrences: number;
  importedFollowups: number;
  onNotesChange: (notes: DispositionFollowupNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_recurrences: number;
    current_recurrences: number; new_recurrences: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<FollowupCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [rechecked, setRechecked] = useState(false);
  const [held, setHeld] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setRechecked(false); setHeld(false); } }, [active]);
  const reviews = prior.exception_recurrences.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.exception_recurrences.findIndex((candidate, previous) => previous < index &&
      candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.latest_outcome_index <= later.latest_outcome_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareDispositionFollowups(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = reviews.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && item.signals.some(s => s.includes("SOURCE") || s.includes("ACCESS")) ||
    filter === "overdue" && item.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && item.later_recurrence_index < importedRecurrences);
  const selected = chosen ? reviews.find(item => item.earlier_recurrence_index === chosen[0] &&
    item.later_recurrence_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && selected.signals.some(s =>
      s === "REPEATED_OWNER_GAP" || s === "OWNER_REWITNESS_MISSING") ||
    category === "REQUEST_SOURCE_REVALIDATION" && selected.signals.some(s =>
      ["REPEATED_SOURCE_GAP", "SOURCE_RECHECK_MISSING",
        "SOURCE_IDENTITY_OR_ACCESS_CONFLICT"].includes(s)) ||
    category === "REQUEST_OVERDUE_REVIEW" && selected.signals.includes("SOURCE_OVERDUE"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedRecurrences &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordDispositionFollowup(prior, notes, environment,
        { recurrences: importedRecurrences, followups: importedFollowups },
        { earlier_recurrence_index: chosen[0], later_recurrence_index: chosen[1], category,
          personally_rechecked: rechecked, independent_hold_acknowledged: held }));
      setRechecked(false); setHeld(false);
      setFeedback("Build 173 private disposition follow-up recorded. No connection, message, device command or approval occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to record private HOLD note."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 6_700_000) throw new Error("Build 172 receipt exceeds 6.7 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact historical prefix: ${result.previous_recurrences} earlier recurrence(s), ${result.new_recurrences} new of ${result.current_recurrences}. No independent source or owner verification inferred.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid Build 172 comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 173 independent recurrence disposition follow-up aging and owner source recheck">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent recurrence disposition follow-up & source recheck</h3>
      <p>Compare successive Build 172 HOLD notes. Later witnessed owner/source records remain private claims, not independently authenticated hardware proof.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 173 private source and owner follow-up">
      A new export date is not a fresh observation. Owner and source claims must each be newer than the earlier recurrence and no later than the later recurrence. A source index must actually change. Manual 3-day / 8-day aging never schedules a reminder. QL-245 still requires separately approved nonproduction tests, original audit receipts, seven independently reviewed denials and out-of-band public-key pins.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{reviews.length} same-watch pair(s)</span>
      <span>{reviews.filter(item => item.repeated_owner_gap).length} repeated owner gaps</span>
      <span>{reviews.filter(item => item.repeated_source_gap || item.source_identity_or_access_conflict).length} source exceptions</span>
      <span>{notes.length} private NOT SENT follow-up(s) · {importedFollowups} historical</span>
      <span>0 real connections, commands, messages or approvals</span>
    </div>
    <label>Compare earlier complete Build 172 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual disposition filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All disposition pairs</option><option value="owner">Owner witness</option>
        <option value="source">Source identity/freshness</option><option value="overdue">Overdue</option>
        <option value="historical">Imported historical</option>
      </select>
    </label>
    {reviews.length === 0 && <p>At least two chronological Build 172 HOLD recurrence notes for one held watch are required; no missing evidence can become an automatic pass.</p>}
    {reviews.length > 0 && visible.length === 0 && <p>No disposition follow-ups match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(item => <article key={item.later_recurrence_index}>
      <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · recurrences #{item.earlier_recurrence_index + 1} → #{item.later_recurrence_index + 1}</strong>
      <small>{item.earlier_at} → {item.later_at}</small>
      <p>Later owner witness: {item.newer_witnessed_owner_claim ? "claimed · unverified" : "MISSING"}; later distinct source check: {item.newer_distinct_source_claim ? "claimed · unverified" : "MISSING"}; source/access conflict: {item.source_identity_or_access_conflict ? "UNRESOLVED" : "not reported"}.</p>
      <p>Earlier/latest source age: {item.earlier_source_age_days ?? "missing"}/{item.later_source_age_days ?? "missing"} days; earlier recurrence age {item.earlier_recurrence_age_days} days.</p>
      <p>{item.signals.join("; ").replaceAll("_", " ")}</p>
      {item.later_recurrence_index < importedRecurrences && <small>Historical unverified operator claim.</small>}
      <button type="button" onClick={() => { setChosen([item.earlier_recurrence_index, item.later_recurrence_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setRechecked(false); setHeld(false); }}>Inspect exact disposition pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Manual disposition follow-up · NOT SENT</legend>
      <p>{selected ? `Selected ${selected.case_id}: ${selected.signals.join(", ")}` : "Choose a chronological recurrence pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A non-imported later recurrence, witnessed installed Windows and separate HOLD review are required.</p>}
      <label>Fixed HOLD-only follow-up category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as FollowupCategory); setRechecked(false); setHeld(false);
        }}>{FOLLOWUP_CATEGORIES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={rechecked} disabled={!canRecord}
        onChange={event => { setRechecked(event.target.checked); setHeld(false); }} />I personally rechecked the owner and source evidence dates on the installed Windows Hub; I understand matching aliases are not proof of device identity.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={held} disabled={!canRecord}
        onChange={event => setHeld(event.target.checked)} />I separately acknowledge the independent/field/Vault HOLDs and QL-245 DISCONNECTED state; no owner authorization is implied.</label>
      <button type="button" disabled={!canRecord || !rechecked || !held} onClick={record}>Append private Build 173 follow-up (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Follow-up #{index + 1}: recurrences #{item.earlier_recurrence_index + 1} → #{item.later_recurrence_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedFollowups ? "historical" : "local"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">QL-245: health/capabilities only, nonproduction key NOT PROVISIONED, signed real receipts UNVERIFIED, actual connection DISCONNECTED. No background schedule, cross-company request, owner approval, device action or Vault activation. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
