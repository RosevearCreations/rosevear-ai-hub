import { useRef, useState } from "react";

import type { DriftEpisode292 } from "./windowsDriftContinuity292";
import {
  MAX_OFFLINE_HANDOFF_BYTES_289, reviewOfflineWindowsHandoff289,
  type OfflineHandoffReview289,
} from "./windowsOfflineHandoffReview289";
import {
  exportIntakeReview293, RECEIPT_VERIFICATION_GATES_293,
  reviewOriginalWindowsIntake293, type IntakeNote293,
} from "./windowsEvidenceIntake293";

/** Explicit local-file intake only: no service, signer or network authority. */
export function WindowsEvidenceIntake293Panel({ episodes, expectedMainSha }: {
  episodes: readonly DriftEpisode292[];
  expectedMainSha: string;
}) {
  const [handoff, setHandoff] = useState<OfflineHandoffReview289 | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState<IntakeNote293[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("No unsigned evidence selected. Original Windows acceptance and receipt verification remain HOLD.");
  const generation = useRef(0);

  async function inspect(file: File | undefined) {
    const requestId = ++generation.current;
    setHandoff(null);
    setAcknowledged(false);
    if (!file) { setBusy(false); setStatus("No file selected. Intake remains HOLD."); return; }
    if (file.size > MAX_OFFLINE_HANDOFF_BYTES_289) {
      setBusy(false);
      setStatus("File rejected: the 16 KB limit was exceeded; no evidence accepted.");
      return;
    }
    setBusy(true);
    setStatus("Reviewing the unsigned request locally without uploading it…");
    try {
      const raw = await file.text();
      const reviewed = await reviewOfflineWindowsHandoff289(raw, Date.now());
      if (requestId !== generation.current) return;
      setHandoff(reviewed);
      setStatus(reviewed.state === "REJECTED"
        ? "Unsigned request rejected (" + reviewed.reason + "). No evidence accepted."
        : "Unsigned request checksum matched; origin and signer are NOT verified. Acknowledge before recording a local comparison.");
    } catch {
      if (requestId === generation.current) setStatus("Local review failed; no evidence accepted.");
    } finally { if (requestId === generation.current) setBusy(false); }
  }

  function record() {
    const outcome = reviewOriginalWindowsIntake293({
      handoff, episodes, expectedMainSha, acknowledged, nowMs: Date.now(),
    });
    if (outcome.state === "REJECTED") {
      setStatus("No review recorded: " + outcome.reason + ". All trust gates remain HOLD.");
      return;
    }
    setNotes(previous => [...previous, outcome.note].slice(-10));
    setAcknowledged(false);
    setStatus("Local unverified intake review recorded. No host acceptance, receipt verification, signer approval or publication occurred.");
  }

  function clear() {
    generation.current++;
    setBusy(false);
    setHandoff(null);
    setAcknowledged(false);
    setNotes([]);
    setStatus("All Build 293 browser-session review data cleared. No Windows state changed.");
  }

  function download() {
    if (!notes.length) return;
    const report = exportIntakeReview293(notes);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-windows-intake-293-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Private unverified intake-review summary downloaded. No signed receipt has been created.");
  }

  return <section className="panel" aria-labelledby="windows-intake-293-title">
    <p className="eyebrow">Build 293 · Independent original-Windows intake review design</p>
    <h4 id="windows-intake-293-title">Compare unsigned Windows evidence with reported drift episodes</h4>
    <p>Choose an existing Build 288 unsigned JSON signing request. Build 289's strict schema and SHA-256 checks
      run again on this explicit browser selection. Nothing is uploaded, stored remotely or verified as a signature.
      The source reference and Build 292 episodes are <strong>owner reports, not Windows attestation</strong>.</p>
    <label htmlFor="windows-intake-293-file">Select previously downloaded unsigned Windows request (maximum 16 KB)</label>
    <input id="windows-intake-293-file" type="file" accept=".json,application/json"
      aria-label="Select unsigned original Windows evidence for local comparison" disabled={busy}
      onChange={event => { void inspect(event.target.files?.[0]); event.target.value = ""; }} />
    <p role="status">{status}</p>
    {handoff?.state === "DIGEST_MATCH_UNVERIFIED" && <p>
      Checksum matched. Reported sample <time dateTime={handoff.sampleAt}>{handoff.sampleAt}</time>.
      Owner-reported release <code>{handoff.releaseCandidate?.slice(0, 12) ?? "missing"}</code>;
      checkout <code>{handoff.checkoutCandidate?.slice(0, 12) ?? "missing"}</code>.
      This is an unsigned, unverified source claim.
    </p>}
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged} disabled={busy || handoff?.state !== "DIGEST_MATCH_UNVERIFIED"}
        onChange={event => setAcknowledged(event.target.checked)} />
      I acknowledge that recording this review does not attest the original Windows machine,
      approve a signer, verify a signed receipt, resolve drift or authorize the Master Shell.
    </label>
    <button type="button" disabled={busy || !acknowledged || handoff?.state !== "DIGEST_MATCH_UNVERIFIED"}
      onClick={record}>Record local intake review (HOLD)</button>
    <button type="button" onClick={clear}>Clear Build 293 local review</button>
    <h4>Unsigned evidence cross-reference history (browser session only)</h4>
    <p><strong>{notes.length} local intake review(s); 0 independently verified receipts.</strong>
      A source-pointer match can relate a selected request to a Build 292 episode but cannot authenticate that request.</p>
    {notes.length > 0 && <ol aria-label="Build 293 local intake review history">
      {notes.map((note, index) => <li key={index}>
        {note.reviewedAtUtc} — {note.crossReference.replaceAll("_", " ").toLowerCase()};
        {" "}{note.relatedEpisodeCount} related reported episode(s);
        {" "}{note.historicalSample ? "historical sample" : "sample reported within five minutes"};
        {" "}receipt verification: HOLD.
      </li>)}
    </ol>}
    <button type="button" disabled={!notes.length} onClick={download}>
      Download private unverified intake review (JSON)
    </button>
    <h4>Separate receipt verification authority — design only</h4>
    <table><caption>Seven independent gates; this panel verifies none of them</caption>
      <thead><tr><th scope="col">Authority</th><th scope="col">Required independent evidence</th><th scope="col">Status</th></tr></thead>
      <tbody>{RECEIPT_VERIFICATION_GATES_293.map(gate => <tr key={gate.id}>
        <th scope="row">{gate.authority}</th><td>{gate.requirement}</td><td>HOLD</td>
      </tr>)}</tbody>
    </table>
    <p><strong>Original host: HOLD. Signed receipt: HOLD. Master Shell: HOLD.</strong>
      Operator acknowledgement records only local review metadata; it is not permission to run, sign, enroll or publish anything.</p>
  </section>;
}
