import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import { inspectQl248AuditDraft, type Ql248AuditDraft,
  type TriageContinuityReceipt } from "./ownerReviewerTriageContinuity";
import { QL248_MAX_PUBLIC_PROOF_BYTES,
  reviewQl248LocalPublicProof } from "./ql248PublicProofReview";
import { compareTriageExceptionAging, recordTriageException,
  TRIAGE_EXCEPTION_CATEGORIES, type TriageExceptionCategory,
  type TriageExceptionNote } from "./ownerTriageExceptionAging";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function TriageExceptionAgingPanel({ prior, notes, environment,
  importedContinuity, importedExceptions, onNotesChange, compareEarlierReceipt,
  auditDraft, active = true }: {
  prior: TriageContinuityReceipt;
  notes: TriageExceptionNote[];
  environment: TrialEnvironment;
  importedContinuity: number;
  importedExceptions: number;
  onNotesChange: (notes: TriageExceptionNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_continuity: number;
    current_continuity: number; new_continuity: number; comparison: unknown };
  auditDraft: Ql248AuditDraft;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<TriageExceptionCategory>("KEEP_INDEPENDENT_HOLD");
  const [personallyRechecked, setPersonallyRechecked] = useState(false);
  const [separateHold, setSeparateHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  const [provenance, setProvenance] = useState("");
  useEffect(() => { if (!active) { setPersonallyRechecked(false); setSeparateHold(false); setProvenance(""); } }, [active]);

  const comparisons = prior.triage_continuity_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.triage_continuity_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_triage_index < later.later_triage_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareTriageExceptionAging(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "owner" && c.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && c.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && c.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && c.later_continuity_index < importedContinuity);
  const selected = chosen ? comparisons.find(c => c.earlier_continuity_index === chosen[0] &&
    c.later_continuity_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "KEEP_INDEPENDENT_HOLD" ||
    category === "REQUEST_LATER_OWNER_EVIDENCE" && selected.signals.includes("POST_CONTINUITY_OWNER_MISSING") ||
    category === "REQUEST_LATER_SOURCE_RECHECK" && selected.signals.some(s =>
      ["POST_CONTINUITY_SOURCE_MISSING", "SOURCE_IDENTITY_OR_ACCESS_CONFLICT",
        "SOURCE_CHECK_OVERDUE"].includes(s)) ||
    category === "REQUEST_QL248_PROVENANCE_WITNESS" &&
      selected.signals.includes("QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED"));
  const canRecord = active && !!chosen && categoryMatches && chosen[1] >= importedContinuity &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  const audit = inspectQl248AuditDraft(auditDraft);
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordTriageException(prior, notes, environment,
        { continuity: importedContinuity, exceptions: importedExceptions },
        { earlier_continuity_index: chosen[0], later_continuity_index: chosen[1],
          category, personally_rechecked: personallyRechecked,
          separate_hold_acknowledged: separateHold }));
      setPersonallyRechecked(false); setSeparateHold(false);
      setFeedback("Private Build 178 exception follow-up appended under HOLD. No proof, runner or review approval was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD follow-up."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 8_300_000) throw new Error("Build 177 historical receipt exceeds 8.3 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 177 historical prefix: ${result.previous_continuity} earlier, ${result.new_continuity} newly appended of ${result.current_continuity}. This does not establish independent acceptance.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Unsafe Build 177 historical comparison."); }
  }
  async function reviewPublicProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    setProvenance("");
    if (!file) return;
    try {
      if (file.size > QL248_MAX_PUBLIC_PROOF_BYTES)
        throw new Error("Public JSON proof exceeds the 128 KB local inspection limit.");
      const result = await reviewQl248LocalPublicProof(new Uint8Array(await file.arrayBuffer()), auditDraft);
      setProvenance(`LOCAL CRYPTO MATCH — UNTRUSTED HOLD. Raw bytes, detached Ed25519 signature and typed public SPKI digest match locally. GitHub source/CI/P retrieval, independently authenticated pin, operator challenge, seven genuine denials, consumer agreement and owner approval remain UNVERIFIED. Status: ${result.connection_state}.`);
    } catch (error) {
      setProvenance(`PUBLIC PROOF NOT VERIFIED: ${error instanceof Error ? error.message : "Local proof review unavailable."} No source authentication or authorization occurred.`);
    }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 178 independent triage exception aging and QL-248 proof provenance review">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Triage exception follow-up aging & public proof provenance review</h3>
      <p>Recheck later private Build 177 continuity exceptions. Review an optional public signed JSON file locally without connecting to any service.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 178 exception recheck and public source evidence only">
      The later continuity must reference progressively newer Build 176 triage evidence for one original case/watch. Recheck owner/source events after the earlier continuity, repeated gaps, identity drift and manual 3+/8+ day aging. QL-248 accepts no proof solely because its public bytes and signature match typed identifiers: source S and later proof P require immutable GitHub retrieval; public pin needs independent authentication, and actual target-side denials and a time-limited owner-approved private runner still require separate evidence.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} held exception pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_exception).length} repeated owner exception(s)</span>
      <span>{comparisons.filter(c => c.source_identity_drift || c.repeated_source_exception).length} source exception(s)</span>
      <span>{notes.length} private follow-up(s) · {importedExceptions} imported</span>
      <span>QL-248 provenance UNVERIFIED · private runner NOT AUTHORIZED</span>
    </div>
    <fieldset className="owner-review-entry"><legend>Optional public QL-246 proof JSON · local cryptographic review only</legend>
      <p>Use the **public identifiers** typed in the preceding Build 177 QL-248 audit card, then optionally choose the actual nonsecret public JSON from immutable proof commit P. The file is read only in this browser. Never upload credentials, private signing keys, household topology, device details or an operator challenge nonce.</p>
      <p>Public metadata formats: {audit.format_complete ? "FORMAT OK — NOT AUTHENTICATED" :
        "MISSING / INVALID — no provenance review yet"}.</p>
      <label>Inspect a local public `ql246-source-proof.json` file (no upload)
        <input type="file" accept=".json,application/json" disabled={!active}
          onChange={event => void reviewPublicProof(event)} />
      </label>
      {provenance && <p role="status">{provenance}</p>}
      <p>Even a valid local signature is not an independently pinned Ed25519 signer or an authenticated GET. Immutable P retrieval, exact S CI, original seven denied requests, durable audit, AI Data Platform consumer agreement, owner test scope and pilot authorization are all unverified.</p>
    </fieldset>
    <label>Compare earlier complete Build 177 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual exception filter
      <select value={filter} onChange={e => setFilter(e.target.value as Filter)}>
        <option value="all">All held cases</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {!comparisons.length && <p>Two chronological Build 177 private continuity notes for the same watch and progressively later triage are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No exceptions match this manual filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_continuity_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · continuity #{c.earlier_continuity_index + 1} → #{c.later_continuity_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>Post-continuity owner: {c.later_owner_witness_claim ? "unverified" : "MISSING"}; source: {c.later_distinct_source_claim ? "unverified" : "MISSING"}.</p>
      <p>Source age {c.source_age_days ?? "missing"} days · earlier continuity age {c.earlier_continuity_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_continuity_index < importedContinuity && <small>Imported historical claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_continuity_index, c.later_continuity_index]);
        setCategory("KEEP_INDEPENDENT_HOLD"); setPersonallyRechecked(false); setSeparateHold(false); }}>
        Inspect exact continuity exception pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private exception follow-up · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose an exact later continuity pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A non-imported later continuity, personally witnessed installed Windows and two HOLD attestations are required.</p>}
      <label>Fixed HOLD-only exception category
        <select value={category} disabled={!selected || !active} onChange={e => {
          setCategory(e.target.value as TriageExceptionCategory); setPersonallyRechecked(false); setSeparateHold(false);
        }}>{TRIAGE_EXCEPTION_CATEGORIES.map(v => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyRechecked}
        disabled={!canRecord} onChange={e => { setPersonallyRechecked(e.target.checked); setSeparateHold(false); }} />
        I personally rechecked these two held private continuity records on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={separateHold}
        disabled={!canRecord} onChange={e => setSeparateHold(e.target.checked)} />
        I separately acknowledge independent reviewer/field HOLD, QL-248 provenance UNVERIFIED, runner NOT AUTHORIZED and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !personallyRechecked || !separateHold} onClick={record}>
        Append private Build 178 triage exception follow-up (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Follow-up #{index + 1}: continuity #{note.earlier_continuity_index + 1} → #{note.later_continuity_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedExceptions ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No signed QL-246 proof was created, no production secrets, source runner, gateway GET, application connection, device/camera command, owner approval or independent acceptance. DISCONNECTED · FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
