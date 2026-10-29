import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { TriageExceptionReceipt } from "./ownerTriageExceptionAging";
import { compareExceptionRenewal, recordRenewalWatch,
  RENEWAL_WATCH_CATEGORIES, type RenewalWatchCategory,
  type RenewalWatchNote } from "./ownerExceptionRenewalWatch";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function ExceptionRenewalWatchPanel({ prior, notes, environment,
  importedExceptions, importedWatches, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: TriageExceptionReceipt;
  notes: RenewalWatchNote[];
  environment: TrialEnvironment;
  importedExceptions: number;
  importedWatches: number;
  onNotesChange: (notes: RenewalWatchNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_exceptions: number;
    current_exceptions: number; new_exceptions: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<RenewalWatchCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [personallyRechecked, setPersonallyRechecked] = useState(false);
  const [separateHold, setSeparateHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setPersonallyRechecked(false); setSeparateHold(false); } }, [active]);

  const comparisons = prior.triage_exception_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.triage_exception_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_continuity_index < later.later_continuity_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareExceptionRenewal(prior, earlier, index)]; } catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "owner" && c.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && c.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && c.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && c.later_exception_index < importedExceptions);
  const selected = chosen ? comparisons.find(c => c.earlier_exception_index === chosen[0] &&
    c.later_exception_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_NEW_OWNER_WITNESS" && selected.signals.includes("REPEATED_OWNER_GAP") ||
    category === "REQUEST_NEW_SOURCE_RECHECK" && selected.signals.some(s =>
      ["REPEATED_SOURCE_GAP", "SOURCE_IDENTITY_DRIFT_UNRESOLVED",
        "SOURCE_EVIDENCE_STALE_OR_MISSING"].includes(s)) ||
    category === "REQUEST_QL252_ORIGINAL_OPERATOR_PROOF" &&
      selected.signals.includes("QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED"));
  const canRecord = active && !!chosen && categoryMatches &&
    chosen[1] >= importedExceptions && environment.installed_windows_witnessed &&
    !!environment.installed_version && environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordRenewalWatch(prior, notes, environment,
        { exceptions: importedExceptions, watches: importedWatches },
        { earlier_exception_index: chosen[0], later_exception_index: chosen[1],
          category, personally_rechecked: personallyRechecked,
          separate_hold_acknowledged: separateHold }));
      setPersonallyRechecked(false); setSeparateHold(false);
      setFeedback("Private Build 179 renewal watch appended (NOT SENT). QL-252 proof, signer pins, owner test and gateway remain HELD.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append renewal watch."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 8_500_000) throw new Error("Build 178 historical receipt exceeds 8.5 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Immutable Build 178 historical prefix: ${result.previous_exceptions} earlier, ${result.new_exceptions} later of ${result.current_exceptions}. Historical evidence is never independent approval.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid Build 178 historical comparison."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 179 exception renewal watch and QL-252 operator provenance HOLD">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent exception renewal watch & QL-252 operator provenance</h3>
      <p>Compare later private Build 178 exception follow-ups, retain overdue gaps, and track the original public-proof publication blocker.</p>
    </div><strong className="owner-trial-hold">PROOF & INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 179 private-only exception renewal and QL-252 public source evidence">
      Two Build 178 exception notes for the same watch must refer to progressively later Build 177 continuity records. Private owner/source claims and their timestamps are NOT independent proof of real devices or gateway tests. QL-252 observed 404 for the genuine immutable public QL-246 proof across six apps on 28 October 2026. Hub must stay private; no public household gateway, Vault, camera, device actuation or network details. The unsigned source revision A and later proof publication B need separate exact CI, original seven witnessed gateway denials, a secret-manager Ed25519 signer, an out-of-band trusted pin, two independent custody receipts and separate owner TEST-only approval. None can be inferred from this browser panel or a green GitHub build.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} comparable held exception pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_gap).length} repeated owner gap(s)</span>
      <span>{comparisons.filter(c => c.repeated_source_gap || c.unresolved_source_drift).length} source gap(s)</span>
      <span>{notes.length} private watch note(s) · {importedWatches} imported</span>
      <span>QL-252 public proof MISSING at observed snapshot · owner TEST NOT GIVEN</span>
    </div>
    <fieldset className="owner-review-entry"><legend>QL-252 source A → public proof B · blocker triage (no network)</legend>
      <p>Latest reported public source snapshot: `RosevearCreations/rosevear-ai-hub`, `main` at `4faac87c3ae2e4857066d9b819663d49f133b939`. At that immutable revision the QL-246 proof path returned HTTP 404. This is a historical observation, not a live status check.</p>
      <p>For an explicitly requested read-only public GitHub recheck by an authorized operator, the repository provides <code>npm run integration:ql252:hub:check -- --public-get --main &lt;full-main-sha&gt;</code>. No runner, HMAC, private endpoint or GitHub signing key is invoked. A 200 plus local cryptographic checks would still be UNTRUSTED until independent pin, actual denials, reviewer receipts and owner scope are verified.</p>
      <p>Proof B: NOT AVAILABLE · raw JSON digest: NOT AVAILABLE · out-of-band Ed25519 pin: UNVERIFIED · independent original denial receipts: NOT AVAILABLE · operator/witness attestations: NOT AVAILABLE · approved private nonproduction runner: NOT AUTHORIZED · owner TEST decision: NOT GIVEN.</p>
    </fieldset>
    <label>Compare earlier complete Build 178 private exception receipt (historical-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual renewal filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All held watches</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {!comparisons.length && <p>Two chronological Build 178 private exception follow-ups with later same-watch continuity are needed to review renewal.</p>}
    {comparisons.length > 0 && !visible.length && <p>No private renewal watches match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_exception_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · exceptions #{c.earlier_exception_index + 1} → #{c.later_exception_index + 1}</strong>
      <small>{c.earlier_recorded_at} → {c.later_recorded_at}</small>
      <p>New private owner claim: {c.later_owner_claim ? "UNVERIFIED" : "MISSING"}; source claim: {c.later_source_claim ? "UNVERIFIED" : "MISSING"}.</p>
      <p>Estimated source age {c.source_age_days ?? "missing"} days · earlier exception age {c.earlier_exception_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_exception_index < importedExceptions && <small>Imported historical evidence only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_exception_index, c.later_exception_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setPersonallyRechecked(false); setSeparateHold(false); }}>
        Review private exception renewal pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private renewal follow-up · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose a later exception pair first."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A non-imported later exception, witnessed installed Windows and two HOLD attestations are required.</p>}
      <label>Fixed HOLD-only review category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as RenewalWatchCategory); setPersonallyRechecked(false); setSeparateHold(false);
        }}>{RENEWAL_WATCH_CATEGORIES.map(v => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyRechecked}
        disabled={!canRecord} onChange={event => { setPersonallyRechecked(event.target.checked); setSeparateHold(false); }} />
        I personally compared these exact private exception records on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={separateHold}
        disabled={!canRecord} onChange={event => setSeparateHold(event.target.checked)} />
        I separately acknowledge QL-252 original proof missing, independent source/field/reviewer HOLDs, unapproved private runner, disconnected gateway and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !personallyRechecked || !separateHold} onClick={record}>
        Append Build 179 private renewal watch (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Renewal #{index + 1}: exceptions #{note.earlier_exception_index + 1} → #{note.later_exception_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedWatches ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No QL-246 signed proof was invented or committed; no secret signer, owner identity, challenge nonce, private topology, customer record, gateway GET, out-of-band pin, security acceptance or device command was created. Source CI is not integration acceptance. DISCONNECTED · FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
