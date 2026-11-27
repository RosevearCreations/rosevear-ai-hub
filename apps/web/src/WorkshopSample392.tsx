import { useState } from "react";
import { workshopSample392 } from "./api";

type Job = {jobId: number; revision: number; title: string; stage: string; progressPercent: number};
type Device = {deviceId: string; label: string; status: string; progressPercent: number | null};
type Receipt = {receiptId: number; observedAtMs: number; fresh: boolean; devices: Device[]};
type Link = {linkId: number; sampleReference: string; jobId: number; receiptId: number; observedAtMs: number; deviceStatus: string; ownerJobStage: string};
type History = {receiptId: number; observedAtMs: number; observedGapMs: number | null; devices: Device[]};
type Review = {link_id: number; job_id: number; expected_revision: number; sampleReference: string; disposition: string; reviewedAtMs: number};
type Board = {jobs: Job[]; receipt: Receipt | null; links: Link[]; observationHistory: History[]; recoveryReviews: Review[]};

function parseBoard(raw: unknown): Board {
  if (!raw || typeof raw !== "object") throw new Error("HOLD");
  const v = raw as Record<string, unknown>;
  if (v.physicalFitVerified !== false || v.machineControlEnabled !== false ||
      v.source !== "PREVIOUSLY_ADMITTED_SIGNED_RECEIPT_NOT_REVERIFIED" ||
      !Array.isArray(v.jobs) || v.jobs.length > 100 ||
      !Array.isArray(v.links) || v.links.length > 100 || !Array.isArray(v.observationHistory) || v.observationHistory.length > 30 || !Array.isArray(v.recoveryReviews) || v.recoveryReviews.length > 100) throw new Error("HOLD");
  for (const j of v.jobs) {
    if (!j || !Number.isSafeInteger(j.jobId) || !Number.isSafeInteger(j.revision) ||
        typeof j.title !== "string" || typeof j.stage !== "string") throw new Error("HOLD");
  }
  if (v.receipt !== null) {
    const r = v.receipt as Receipt;
    if (!r || !Number.isSafeInteger(r.receiptId) || !Number.isSafeInteger(r.observedAtMs) ||
        typeof r.fresh !== "boolean" || !Array.isArray(r.devices) || r.devices.length > 48 ||
        r.devices.some(d => !d || typeof d.deviceId !== "string" || typeof d.label !== "string" ||
          typeof d.status !== "string")) throw new Error("HOLD");
  }
  for (const l of v.links) {
    if (!l || !Number.isSafeInteger(l.linkId) || typeof l.sampleReference !== "string" || !Number.isSafeInteger(l.jobId) ||
        !Number.isSafeInteger(l.receiptId) || !Number.isSafeInteger(l.observedAtMs) ||
        typeof l.deviceStatus !== "string" || typeof l.ownerJobStage !== "string") throw new Error("HOLD");
  }
  for (const h of v.observationHistory) {
    if (!h || !Number.isSafeInteger(h.receiptId) || !Number.isSafeInteger(h.observedAtMs) ||
        (h.observedGapMs !== null && (!Number.isSafeInteger(h.observedGapMs) || h.observedGapMs < 0))) throw new Error("HOLD");
  }
  for (const r of v.recoveryReviews) {
    if (!r || !Number.isSafeInteger(r.link_id) || !Number.isSafeInteger(r.reviewedAtMs) ||
        typeof r.sampleReference !== "string" || !["hold", "continue_locally", "remake", "retire"].includes(r.disposition)) throw new Error("HOLD");
  }
  return v as unknown as Board;
}

export function WorkshopSample392() {
  const [board, setBoard] = useState<Board | null>(null);
  const [jobId, setJobId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [checks, setChecks] = useState([false, false, false, false]);
  const [decision, setDecision] = useState("hold");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No sample observation readback yet.");
  async function read() {
    if (busy) return;
    setBusy(true);
    setConfirmed(false);
    try {
      setBoard(parseBoard(await workshopSample392("read")));
      setMessage("Stored observations loaded. Physical identity and fit are not verified.");
    } catch {
      setBoard(null);
      setMessage("HOLD: sample observation evidence unavailable.");
    } finally { setBusy(false); }
  }
  async function link() {
    const job = board?.jobs.find(j => String(j.jobId) === jobId);
    const receipt = board?.receipt;
    if (busy || !confirmed || !job || !receipt?.fresh ||
        !receipt.devices.some(d => d.deviceId === deviceId) ||
        !/^DND-[A-Z0-9-]{1,48}$/.test(reference)) return;
    setBusy(true);
    try {
      const raw = await workshopSample392("link", {job_id: job.jobId, expected_revision: job.revision,
        receipt_id: receipt.receiptId, device_id: deviceId, sample_reference: reference,
        maker_association_confirmed: true});
      if (!raw || typeof raw !== "object" ||
          (raw as Record<string, unknown>).machineControlEnabled !== false ||
          (raw as Record<string, unknown>).physicalFitVerified !== false) throw new Error("HOLD");
      setBoard(parseBoard(await workshopSample392("read")));
      setReference("");
      setMessage("Local sample association recorded. No printer command or business update was sent.");
    } catch {
      setBoard(null);
      setMessage("HOLD: association could not be confirmed. Refresh before retrying.");
    } finally { setBusy(false); setConfirmed(false); }
  }
  async function recovery() {
    const association = board?.links.find(l => String(l.linkId) === reviewId);
    const job = board?.jobs.find(j => j.jobId === association?.jobId);
    if (busy || !association || !job || (decision !== "hold" && !checks.every(Boolean))) return;
    setBusy(true);
    try {
      const raw = await workshopSample392("recovery", {
        job_id: job.jobId, expected_revision: job.revision, link_id: association.linkId,
        identity_checked: checks[0], condition_checked: checks[1], fit_checked: checks[2],
        duplicate_run_checked: checks[3], disposition: decision,
      });
      if (!raw || typeof raw !== "object" ||
          (raw as Record<string, unknown>).recorded !== true ||
          (raw as Record<string, unknown>).machineControlEnabled !== false ||
          (raw as Record<string, unknown>).physicalFitVerified !== false) throw new Error("HOLD");
      setBoard(parseBoard(await workshopSample392("read")));
      setChecks([false, false, false, false]);
      setDecision("hold");
      setMessage("Maker-reported disposition saved. No job or machine was started.");
    } catch {
      setBoard(null);
      setMessage("HOLD: review not confirmed. Refresh before retrying.");
    } finally { setBusy(false); }
  }
  return <section className="panel" aria-label="Build 392 workshop sample observation">
    <h2>Devil n Dove sample observation</h2>
    <p>Link a local job and previously admitted signed printer-PC observation. Windows serial or queue enumeration does not measure print progress; only an approved local OctoPrint source can report controller progress. This is a maker-reported association, not proof of physical fit, machine identity or permission to run.</p>
    <button type="button" disabled={busy} onClick={() => void read()}>Read sample evidence</button>
    <p role="status" aria-label="Sample observation status">{message}</p>
    {board && <>
      <p>{board.receipt ? "Last observation: " + new Date(board.receipt.observedAtMs).toLocaleString() +
        (board.receipt.fresh ? " · Fresh at readback" : " · Stale") : "No enrolled printer receipt available."}</p>
      <label>Workshop job<select value={jobId} onChange={e => {setJobId(e.target.value); setConfirmed(false);}}>
        <option value="">Choose a job</option>{board.jobs.map(j => <option key={j.jobId} value={j.jobId}>{j.title} · {j.stage}</option>)}
      </select></label>
      <label>Observed device or queue<select value={deviceId} onChange={e => {setDeviceId(e.target.value); setConfirmed(false);}}>
        <option value="">Choose exact observed device or queue</option>{board.receipt?.devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label} · {d.status}</option>)}
      </select></label>
      <label>Non-customer sample reference (DND-…)<input value={reference} maxLength={52} onChange={e => {setReference(e.target.value.toUpperCase()); setConfirmed(false);}} /></label>
      <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I reviewed the association to this sample; no physical fit decision is implied.</label>
      <button type="button" disabled={busy || !confirmed || !board.receipt?.fresh || !jobId || !deviceId || !/^DND-[A-Z0-9-]{1,48}$/.test(reference)} onClick={() => void link()}>Record sample association</button>
      <h3>Observation history</h3>
      <p>Intervals between receipts are not measured equipment downtime.</p>
      {board.observationHistory.map(h => <p key={h.receiptId}>{new Date(h.observedAtMs).toLocaleString()} · {h.observedGapMs === null ? "No earlier receipt" : Math.round(h.observedGapMs / 1000) + " s since previous observation"}</p>)}
      <h3>Local sample history</h3>
      {board.links.length === 0 && <p>No association recorded.</p>}
      {board.links.map((l, i) => <p key={String(l.jobId) + ":" + l.receiptId + ":" + i}>{l.sampleReference} · Job {l.jobId} · {l.ownerJobStage} · {l.deviceStatus} · {new Date(l.observedAtMs).toLocaleString()}</p>)}
      <h3>Maker recovery checklist</h3>
      <p>Inspect the actual piece and equipment locally. This records a reported choice, not a safety check or a restart.</p>
      <label>Associated sample<select value={reviewId} onChange={e => {setReviewId(e.target.value); setChecks([false, false, false, false]); setDecision("hold");}}>
        <option value="">Select association</option>{board.links.filter(l => board.jobs.some(j => j.jobId === l.jobId)).map(l => <option key={l.linkId} value={l.linkId}>{l.sampleReference} · Job {l.jobId}</option>)}
      </select></label>
      {["I checked the sample and intended design", "I inspected its actual condition", "I checked fit or dimensions", "I checked for an existing or duplicate run"].map((label, i) => <label key={label}><input type="checkbox" checked={checks[i]} onChange={e => setChecks(old => old.map((v, n) => n === i ? e.target.checked : v))}/>{label}</label>)}
      <label>Disposition<select value={decision} onChange={e => setDecision(e.target.value)}>
        <option value="hold">Hold for inspection</option><option value="continue_locally">Continue locally (no command)</option><option value="remake">Remake (decision only)</option><option value="retire">Retire sample</option>
      </select></label>
      <button type="button" disabled={busy || !reviewId || (decision !== "hold" && !checks.every(Boolean))} onClick={() => void recovery()}>Record recovery disposition</button>
      {board.recoveryReviews.map(r => <p key={r.link_id + ":" + r.expected_revision}>{r.sampleReference} · {r.disposition} · {new Date(r.reviewedAtMs).toLocaleString()} · Maker reported</p>)}
    </>}
  </section>;
}
