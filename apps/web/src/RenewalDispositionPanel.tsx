import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalWatchReceipt } from "./ownerExceptionRenewalWatch";
import { compareRenewalDisposition, recordRenewalDisposition,
  RENEWAL_DISPOSITION_CATEGORIES, type RenewalDispositionCategory,
  type RenewalDispositionNote } from "./ownerRenewalDisposition";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function RenewalDispositionPanel({ prior, notes, environment,
  importedRenewals, importedDispositions, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: RenewalWatchReceipt;
  notes: RenewalDispositionNote[];
  environment: TrialEnvironment;
  importedRenewals: number;
  importedDispositions: number;
  onNotesChange: (notes: RenewalDispositionNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_renewals: number;
    current_renewals: number; new_renewals: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<RenewalDispositionCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [personallyRechecked, setPersonallyRechecked] = useState(false);
  const [separateHold, setSeparateHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setPersonallyRechecked(false); setSeparateHold(false); } }, [active]);
  const comparisons = prior.renewal_watch_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.renewal_watch_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_exception_index < later.later_exception_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareRenewalDisposition(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "owner" && c.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && c.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && c.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && c.later_renewal_index < importedRenewals);
  const selected = chosen ? comparisons.find(c => c.earlier_renewal_index === chosen[0] &&
    c.later_renewal_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_LATER_OWNER_SOURCE_ORIGINALS" &&
      selected.signals.includes("REPEATED_OWNER_OR_SOURCE_GAP") ||
    category === "REQUEST_QL252_SIGNED_PROOF_AND_PIN_WITNESSES" &&
      selected.signals.includes("QL252_PUBLIC_PROOF_MISSING_OR_UNVERIFIED"));
  const canRecord = active && !!chosen && categoryMatches &&
    chosen[1] >= importedRenewals && environment.installed_windows_witnessed &&
    !!environment.installed_version && environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordRenewalDisposition(prior, notes, environment,
        { renewals: importedRenewals, dispositions: importedDispositions },
        { earlier_renewal_index: chosen[0], later_renewal_index: chosen[1],
          category, personally_rechecked: personallyRechecked,
          separate_hold_acknowledged: separateHold }));
      setPersonallyRechecked(false); setSeparateHold(false);
      setFeedback("Build 180 private disposition added (NOT SENT). Source proof, independent reviewer, owner TEST and all gateways remain HELD.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record held disposition."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 9_000_000) throw new Error("Build 179 historical receipt exceeds 9 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 179 historical prefix: ${result.previous_renewals} earlier, ${result.new_renewals} new of ${result.current_renewals}; independent review and owner approval still HOLD.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid Build 179 historical comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 180 independent renewal disposition and QL-252 original proof blocker">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Renewal disposition and QL-252 original source-proof blocker</h3>
      <p>Review later private Build 179 renewal watches. No proof is published and no network or owner approval is changed here.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT PROOF: HOLD</strong></header>
    <CardHelp title="Build 180 owner-safe evidence disposition and proof publication guard">
      A later Build 179 renewal watch must refer to a progressively later Build 178 exception for the same case/watch. Private source/owner claims cannot independently witness a gateway GET or physical Windows acceptance. QL-252 public proof returned 404 at the last verified Build 179 main SHA; the new CI source-publication guard fails closed if `docs/integration/ql246-source-proof.json` appears without a separately reviewed original custody/witness process. No synthetic seven-denial metadata, private keys, out-of-band pins, owner TEST authorization or household-network endpoints may be invented to clear the blocker.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} held renewal pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_or_source_gap).length} repeated original gap(s)</span>
      <span>{comparisons.filter(c => c.repeated_source_drift).length} source drift(s)</span>
      <span>{notes.length} private disposition(s) · {importedDispositions} imported</span>
      <span>QL-252 original proof BLOCKED · owner TEST NOT GIVEN</span>
    </div>
    <fieldset className="owner-review-entry"><legend>Genuine QL-252 proof blocker reassessment — read-only</legend>
      <p>Latest verified Build 179 `main`: <code>031a0f0cbc834f002664e08d8c331711f2ad3337</code>. Public proof at its immutable SHA: HTTP 404. Build 180 does not create a synthetic signed proof to satisfy that path.</p>
      <p>Source CI and public GitHub checks may be GREEN while integrations are DISCONNECTED. Original witness/custody/pin receipts: NOT AVAILABLE; private runner: NOT AUTHORIZED; seven actual denial observations: UNVERIFIED; owner TEST-only decision: NOT GIVEN. The source CI guard treats unexpected proof publication as a failure needing separate review.</p>
      <p>Optional operator commands (public GitHub only): <code>npm run integration:ql252:hub:check -- --public-get --main &lt;immutable-main-sha&gt;</code>. Publication guard: <code>npm run integration:ql252:publication:check</code>. No client-side background request is made.</p>
    </fieldset>
    <label>Compare earlier complete Build 179 private renewal receipt (historical-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual disposition filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All held dispositions</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {!comparisons.length && <p>Two chronological Build 179 private renewal watches with newer exception references for the same watch are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No private dispositions match the selected filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_renewal_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · renewals #{c.earlier_renewal_index + 1} → #{c.later_renewal_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>Later owner/source claims: {c.later_owner_claim ? "OWNER UNVERIFIED" : "OWNER MISSING"} / {c.later_source_claim ? "SOURCE UNVERIFIED" : "SOURCE MISSING"}.</p>
      <p>Estimated source age {c.source_age_days ?? "missing"} days · earlier renewal age {c.earlier_renewal_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_renewal_index < importedRenewals && <small>Historical claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_renewal_index, c.later_renewal_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setPersonallyRechecked(false); setSeparateHold(false); }}>
        Review renewal disposition pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Independent private disposition · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose an exact later renewal pair first."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A non-imported later renewal, re-witnessed installed Windows and two HOLD attestations are required.</p>}
      <label>Fixed HOLD-only disposition category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as RenewalDispositionCategory); setPersonallyRechecked(false); setSeparateHold(false);
        }}>{RENEWAL_DISPOSITION_CATEGORIES.map(v => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyRechecked}
        disabled={!canRecord} onChange={event => { setPersonallyRechecked(event.target.checked); setSeparateHold(false); }} />
        I personally rechecked this exact private renewal evidence on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={separateHold}
        disabled={!canRecord} onChange={event => setSeparateHold(event.target.checked)} />
        I separately acknowledge independent source/field/reviewer HOLDs, QL-252 proof unavailable, owner TEST not given, private runner not authorized and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !personallyRechecked || !separateHold} onClick={record}>
        Append Build 180 private disposition (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Disposition #{index + 1}: renewal #{note.earlier_renewal_index + 1} → #{note.later_renewal_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedDispositions ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No proof, private signing key, operator nonce, out-of-band custodian pin, owner approval, gateway GET, camera/device action or secret was produced. Source CI GREEN is separate from connected-app trust, installed-Windows field acceptance, independent review and first-party Vault 0/6 SECURITY HOLD. DISCONNECTED / HOLD.</p>
  </section>;
}
