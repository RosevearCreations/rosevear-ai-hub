import { useState } from "react";
import { prepareFieldPacket297, SOURCE_MAP_297 } from "./windowsFieldPacket297";
import { WindowsReceiptReview298Panel } from "./WindowsReceiptReview298Panel";
import type { CustodyNote295, HandoffDryRun295 } from "./windowsCustodyHandoff295";
import {
  FIELD_RECEIPT_CHECKLIST_296, deriveCustodyExceptions296,
  exportCustodyExceptions296, projectShellEvidenceReadiness296,
  recordCustodyException296, recordOwnerChecklist296,
  type ChecklistReview296, type Exception296, type ExceptionCode296,
} from "./windowsCustodyReview296";

const EXCEPTION_LABELS: Record<ExceptionCode296, string> = {
  NO_OWNER_CUSTODY_NOTE: "Missing original-Windows owner custody note",
  STALE_OWNER_CUSTODY_NOTE: "Custody note older than 30 minutes",
  NO_OPERATOR_HANDOFF_DRY_RUN: "No blocked operator handoff dry run recorded",
  UNVERIFIED_ORIGINAL_EVIDENCE: "No independently verified original Windows evidence",
};

/** Browser-only operator review. No network receiver, registry, or verifier is connected. */
export function WindowsCustodyReview296Panel({ custodyNotes, dryRuns, expectedMainSha }: {
  custodyNotes: readonly CustodyNote295[];
  dryRuns: readonly HandoffDryRun295[];
  expectedMainSha: string;
}) {
  const [issue, setIssue] = useState<ExceptionCode296>("UNVERIFIED_ORIGINAL_EVIDENCE");
  const [acknowledgeException, setAcknowledgeException] = useState(false);
  const [acknowledgeChecklist, setAcknowledgeChecklist] = useState(false);
  const [exceptions, setExceptions] = useState<Exception296[]>([]);
  const [checklists, setChecklists] = useState<ChecklistReview296[]>([]);
  const [acknowledgePacket, setAcknowledgePacket] = useState(false);
  const [status, setStatus] = useState("No independent field receipts have been verified; all authorities remain HOLD.");
  const nowMs = Date.now();
  const possibleIssues = deriveCustodyExceptions296({
    notes: custodyNotes, dryRuns, expectedMainSha, nowMs,
  });
  const selectedIssue = possibleIssues.includes(issue) ? issue : possibleIssues[0];
  const lastCustody = custodyNotes[custodyNotes.length - 1] ?? null;
  const readiness = projectShellEvidenceReadiness296({
    notes: custodyNotes, dryRuns, checklists, exceptions,
    expectedMainSha, nowMs,
  });
  function recordException() {
    const value = recordCustodyException296({
      notes: custodyNotes, dryRuns, expectedMainSha, code: selectedIssue,
      acknowledged: acknowledgeException, nowMs: Date.now(),
    });
    setAcknowledgeException(false);
    if (!value) { setStatus("Exception not recorded; no current issue or explicit HOLD acknowledgement."); return; }
    setExceptions(previous => [...previous, value].slice(-20));
    setStatus("Open owner exception noted locally. No independent evidence was accepted or resolved.");
  }
  function recordChecklist() {
    const value = recordOwnerChecklist296({
      note: lastCustody, expectedMainSha,
      acknowledged: acknowledgeChecklist, nowMs: Date.now(),
    });
    setAcknowledgeChecklist(false);
    if (!value) { setStatus("Checklist was not recorded; a current owner custody note and acknowledgement are required."); return; }
    setChecklists(previous => [...previous, value].slice(-10));
    setStatus("Owner approved checklist FOR FIELD REVIEW ONLY. No signed consent, receipt, or original-host acceptance.");
  }
  function clear() {
    setExceptions([]);
    setChecklists([]);
    setAcknowledgeException(false);
    setAcknowledgeChecklist(false);
    setAcknowledgePacket(false);
    setStatus("Build 296 local exception and checklist notes cleared; no external state changed.");
  }
  function downloadFieldPacket() {
    const packet = prepareFieldPacket297({ note: lastCustody,
      checklist: checklists[checklists.length - 1] ?? null,
      expectedMainSha, acknowledged: acknowledgePacket, nowMs: Date.now() });
    setAcknowledgePacket(false);
    if (!packet) {
      setStatus("Build 297 packet blocked: current custody, later checklist and explicit review acknowledgement are required.");
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-field-review-297-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Private Build 297 review packet exported. No receipt verified and no application contacted.");
  }
  function download() {
    if (!exceptions.length && !checklists.length) return;
    const body = exportCustodyExceptions296(exceptions, checklists);
    const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-windows-custody-296-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Private browser-only exception and checklist notes downloaded; no trusted receipt was created.");
  }

  return <section className="panel" aria-labelledby="windows-custody-review-296-title">
    <p className="eyebrow">Build 296 · Independent Windows custody review and shell readiness</p>
    <h4 id="windows-custody-review-296-title">Owner custody exception register (unverified)</h4>
    <p>Detected issues are derived from our local Build 295 notes. Recording an exception
      leaves it open and does not create independent evidence or a verified closure.</p>
    <label htmlFor="custody-issue-296">Select a currently detected exception</label>
    <select id="custody-issue-296" value={selectedIssue}
      onChange={event => { setIssue(event.target.value as ExceptionCode296);
        setAcknowledgeException(false); }}>
      {possibleIssues.map(code => <option key={code} value={code}>{EXCEPTION_LABELS[code]}</option>)}
    </select>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledgeException}
        onChange={event => setAcknowledgeException(event.target.checked)} />
      I understand this records an OPEN, unverified exception only and does not approve
      a Windows machine, signer, witness, consent, receipt or Shell publication.
    </label>
    <button type="button" disabled={!acknowledgeException} onClick={recordException}>
      Record open custody exception locally (HOLD)
    </button>
    <p role="status">{status}</p>
    <p><strong>{exceptions.length} open browser-session exception note(s); 0 verified closures.</strong></p>
    {exceptions.length > 0 && <ol aria-label="Build 296 owner custody exception history">
      {exceptions.map((entry, index) => <li key={index}>
        <time dateTime={entry.recordedAtUtc}>{entry.recordedAtUtc}</time> —
        {EXCEPTION_LABELS[entry.code]}; status OPEN — HOLD; independent verification: 0.
      </li>)}
    </ol>}

    <h4>Owner-approved field receipt checklist — review permission only</h4>
    <p>These seven independent proof requirements cannot be satisfied by checking this box.
      Approval only records our intention to conduct a separate supervised field review.</p>
    <ol aria-label="Build 296 field receipt independent checklist">
      {FIELD_RECEIPT_CHECKLIST_296.map(gate => <li key={gate.id}>
        <strong>{gate.authority}:</strong> {gate.requiredEvidence} —
        independent proof not received; HOLD.
      </li>)}
    </ol>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledgeChecklist}
        onChange={event => setAcknowledgeChecklist(event.target.checked)} />
      I approve this checklist for future field REVIEW ONLY. This is not signed owner consent,
      original-host acceptance, verification of a witness, or receipt authorization.
    </label>
    <button type="button" disabled={!lastCustody || !acknowledgeChecklist}
      onClick={recordChecklist}>Record owner field-review checklist locally (HOLD)</button>
    <p><strong>{checklists.length} checklist review note(s); 0 field receipts accepted.</strong></p>

    <h4>Master Shell evidence readiness alignment (read-only preview)</h4>
    <p>This preview is calculated from this browser session; it does not query AI Data Platform,
      Comms Hub, Windows, or an evidence registry. It cannot connect or publish anything.</p>
    <dl>
      <dt>Review metadata</dt><dd>{readiness.reviewMetadataState.replaceAll("_", " ").toLowerCase()}</dd>
      <dt>Owner custody note</dt><dd>{readiness.custodyNotePresent ? "Reported only" : "Missing"}</dd>
      <dt>Field checklist</dt><dd>{readiness.checklistOwnerReviewed ? "Approved for future review only" : "Not yet reviewed"}</dd>
      <dt>Dry-run handoff</dt><dd>{readiness.dryRunObserved ? "Reported blocked" : "No valid dry run"}</dd>
      <dt>Independent source registry</dt><dd>NOT CONNECTED</dd>
      <dt>AI Data Platform / Comms Hub</dt><dd>READ-ONLY DESIGN PREVIEW — NOT PUBLISHED</dd>
      <dt>Verified receipts / sent messages</dt><dd>0 / 0</dd>
    </dl>
    <button type="button" disabled={!exceptions.length && !checklists.length} onClick={download}>
      Download private exception and checklist metadata (JSON)
    </button>
    <button type="button" onClick={clear}>Clear Build 296 local review notes</button>
    <h4>Build 297 — Independent field receipt review packet</h4>
    <p>Cross-application mapping is a design inventory, not a connection report. The Hub supplies
      local Windows evidence candidates to the two complementary Master Shell planes. Business
      applications remain separately isolated sources, not subordinate Windows devices.</p>
    <ul aria-label="Build 297 cross-application source mapping">
      {SOURCE_MAP_297.map(source => <li key={source.application}>
        <strong>{source.application}</strong> — {source.role.replaceAll("_", " ").toLowerCase()};
        {" "}{source.lane.replaceAll("_", " ").toLowerCase()}; connection NOT VERIFIED.
      </li>)}
    </ul>
    <p>Seven original-evidence authorities remain unverified. The packet contains only a claimed
      unsigned custody digest and review requirements. It cannot prove issuer identity,
      owner consent, witness independence, Windows process identity or trusted receipt lineage.</p>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledgePacket}
        onChange={event => setAcknowledgePacket(event.target.checked)} />
      I understand this is a private owner-supervised review handoff only, with no trust
      acceptance, cross-app publication, credential enrollment or production authorization.
    </label>
    <button type="button" disabled={!acknowledgePacket || !checklists.length || !lastCustody}
      onClick={downloadFieldPacket}>Download Build 297 review packet (HOLD)</button>
    <WindowsReceiptReview298Panel key={expectedMainSha} expectedMainSha={expectedMainSha} />
    <p><strong>Original Windows host, signer, independent witness, signed consent,
      cryptographic receipt and Master Shell authority: HOLD.</strong>
      GitHub source CI cannot verify any of these.</p>
  </section>;
}


