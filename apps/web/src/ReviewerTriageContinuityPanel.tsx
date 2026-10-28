import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalTriageReceipt } from "./ownerReviewerRenewalTriage";
import { compareTriageRenewalContinuity, inspectQl248AuditDraft,
  recordTriageContinuity, TRIAGE_CONTINUITY_CATEGORIES,
  type Ql248AuditDraft, type TriageContinuityCategory,
  type TriageContinuityNote } from "./ownerReviewerTriageContinuity";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
const blankPublicAudit: Ql248AuditDraft = {
  repository: "RosevearCreations/rosevear-ai-hub", source_sha: "", source_ci_url: "",
  proof_commit_sha: "", raw_proof_sha256: "", public_spki_sha256: "",
};
const auditLabels: { field: keyof Ql248AuditDraft; label: string }[] = [
  { field: "repository", label: "Public GitHub repository" },
  { field: "source_sha", label: "Audited source code SHA S (40 lowercase hexadecimal)" },
  { field: "source_ci_url", label: "Matching source SHA GitHub Actions run URL" },
  { field: "proof_commit_sha", label: "Later public proof-file commit SHA P (40 lowercase hexadecimal)" },
  { field: "raw_proof_sha256", label: "SHA-256 of actual raw public JSON bytes" },
  { field: "public_spki_sha256", label: "Public Ed25519 SPKI SHA-256 (pin must be authenticated out of band)" },
];

export function ReviewerTriageContinuityPanel({ prior, notes, environment,
  importedTriages, importedContinuity, onNotesChange, compareEarlierReceipt, active = true }: {
  prior: RenewalTriageReceipt;
  notes: TriageContinuityNote[];
  environment: TrialEnvironment;
  importedTriages: number;
  importedContinuity: number;
  onNotesChange: (notes: TriageContinuityNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_triages: number;
    current_triages: number; new_triages: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<TriageContinuityCategory>("CONTINUE_REVIEWER_TRIAGE_HOLD");
  const [personallyRechecked, setPersonallyRechecked] = useState(false);
  const [separateHold, setSeparateHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  const [publicAudit, setPublicAudit] = useState<Ql248AuditDraft>(blankPublicAudit);
  useEffect(() => { if (!active) { setPersonallyRechecked(false); setSeparateHold(false); } }, [active]);
  const comparisons = prior.renewal_triage_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.renewal_triage_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_reviewer_index < later.later_reviewer_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareTriageRenewalContinuity(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "owner" && c.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && c.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && c.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && c.later_triage_index < importedTriages);
  const selected = chosen ? comparisons.find(c => c.earlier_triage_index === chosen[0] &&
    c.later_triage_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_REVIEWER_TRIAGE_HOLD" ||
    category === "REQUEST_POST_TRIAGE_OWNER_REWITNESS" && selected.signals.includes("POST_TRIAGE_OWNER_WITNESS_MISSING") ||
    category === "REQUEST_POST_TRIAGE_SOURCE_RECHECK" && selected.signals.some(s =>
      ["POST_TRIAGE_SOURCE_RECHECK_MISSING", "SOURCE_IDENTITY_OR_ACCESS_DRIFT",
        "SOURCE_RECHECK_OVERDUE"].includes(s)) ||
    category === "REQUEST_QL248_TWO_SHA_OPERATOR_AUDIT" &&
      selected.signals.includes("QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedTriages &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  const audit = inspectQl248AuditDraft(publicAudit);

  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordTriageContinuity(prior, notes, environment,
        { triages: importedTriages, continuity: importedContinuity },
        { earlier_triage_index: chosen[0], later_triage_index: chosen[1], category,
          personally_rechecked: personallyRechecked, separate_hold_acknowledged: separateHold }));
      setPersonallyRechecked(false); setSeparateHold(false);
      setFeedback("Private Build 177 triage continuity appended under HOLD. Nothing sent and no reviewer, runner or connection authorized.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD continuity."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error("Build 176 historical receipt exceeds 8 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 176 historical prefix: ${result.previous_triages} earlier, ${result.new_triages} newly appended of ${result.current_triages}. Historical only; not an independent reviewer approval.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Unsafe Build 176 historical comparison."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 177 independent triage continuity and QL-248 public audit preparation">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Reviewer triage renewal continuity & QL-248 source/proof audit preparation</h3>
      <p>Compare successive private Build 176 HOLD triages, then inspect public identifier formatting without contacting GitHub, the gateway or a private runner.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 177 local-only continuity and public format inspection">
      A later triage must use a genuinely newer reviewer reference for the same original held reassignment watch. New owner/source claims after the earlier triage are still unverified; stale claims and source identity drift remain on HOLD. A source commit S and proof-bearing commit P are distinct, but a well-formed SHA, public proof digest or Ed25519 SPKI fingerprint does not verify authenticity. The AI Data Platform consumer must separately accept QL-248 and an independently authorized runner must observe original denials before any signed QL-246 proof is publishable.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} comparable triage renewal pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_gap).length} repeated owner gap(s)</span>
      <span>{comparisons.filter(c => c.source_identity_drift || c.repeated_source_gap).length} source gap(s)</span>
      <span>{notes.length} private continuity note(s) · {importedContinuity} imported</span>
      <span>QL-248: format only · consumer agreement PENDING · runner NOT AUTHORIZED</span>
    </div>
    <fieldset className="owner-review-entry"><legend>QL-248 public source/proof audit candidate · FORMAT ONLY</legend>
      <p>Optional public identifiers only. Never paste credentials, private signing keys, device information, network addresses, challenge nonces or customer data. Nothing is stored outside this browser session or transmitted.</p>
      {auditLabels.map(item => <label key={item.field}>{item.label}
        <input type="text" autoComplete="off" spellCheck={false} value={publicAudit[item.field]}
          disabled={!active} onChange={event => { const value = event.currentTarget.value.trim();
            setPublicAudit(prev => ({ ...prev, [item.field]: value })); }} />
      </label>)}
      <ul>{audit.checks.map(item => <li key={item.check}>
        <strong>{item.ready ? "FORMAT OK" : "MISSING / INVALID"}</strong> — {item.check}
      </li>)}</ul>
      <p role="note">{audit.format_complete ? "Six public identifier formats match; all provenance, pin and original denial proof remain UNVERIFIED." :
        "Public identifier format preparation incomplete. This is not a connection test."}</p>
      <p>External retrieval: NOT PERFORMED · out-of-band pin: NOT AUTHENTICATED · AI Data Platform consumer acceptance: PENDING · seven gateway denials: UNVERIFIED · pilot approval: NOT GIVEN.</p>
    </fieldset>
    <label>Compare earlier complete Build 176 private receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual triage continuity filter
      <select value={filter} onChange={e => setFilter(e.target.value as Filter)}>
        <option value="all">All held triage pairs</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {!comparisons.length && <p>Two chronological Build 176 private triages for one watch referencing progressively later Build 175 reviewer notes are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No triage continuity pairs match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_triage_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · triages #{c.earlier_triage_index + 1} → #{c.later_triage_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>Post-triage owner claim: {c.newer_owner_witness_claim ? "unverified" : "MISSING"}; source recheck: {c.newer_distinct_source_claim ? "unverified" : "MISSING"}.</p>
      <p>Source age {c.source_age_days ?? "missing"} days · earlier triage age {c.earlier_triage_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_triage_index < importedTriages && <small>Imported historical claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_triage_index, c.later_triage_index]);
        setCategory("CONTINUE_REVIEWER_TRIAGE_HOLD"); setPersonallyRechecked(false); setSeparateHold(false); }}>
        Inspect exact triage continuity pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private reviewer triage continuity · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose a chronological triage pair first."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Non-imported later triage, witnessed installed Windows and two separate HOLD acknowledgments required.</p>}
      <label>Fixed HOLD-only outcome
        <select value={category} disabled={!selected || !active} onChange={e => {
          setCategory(e.target.value as TriageContinuityCategory); setPersonallyRechecked(false); setSeparateHold(false);
        }}>{TRIAGE_CONTINUITY_CATEGORIES.map(value => <option key={value} value={value}>
          {value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyRechecked}
        disabled={!canRecord} onChange={e => { setPersonallyRechecked(e.target.checked); setSeparateHold(false); }} />
        I personally reviewed this exact later private triage and source/owner timeline on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={separateHold} disabled={!canRecord}
        onChange={e => setSeparateHold(e.target.checked)} />
        I separately acknowledge reviewer/field HOLD, QL-248 unsigned source-proof, absent private runner and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !personallyRechecked || !separateHold} onClick={record}>
        Append private Build 177 triage continuity (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Continuity #{index + 1}: triages #{note.earlier_triage_index + 1} → #{note.later_triage_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedContinuity ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No signatures generated, no public proof published, no HTTP request, no private runner/provisioning or original seven-denial evidence. Source S and proof P are separate public identifiers, not authentication; nothing here grants owner authorization. DISCONNECTED · FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
