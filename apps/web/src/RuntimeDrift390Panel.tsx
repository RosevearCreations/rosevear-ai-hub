import { useState } from "react";
import { runtimeDrift390 } from "./api";

type Source = { source: string; status: string; sequence: number | null; ownerReview: string | null; targetSha: string; runtimeSha: string | null };
const masters = ["rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub"];
function parseReport(raw: unknown): Source[] {
  if (!raw || typeof raw !== "object") throw new Error("HOLD");
  const r = raw as Record<string, unknown>;
  if (r.independentThreeMasterAcceptance !== false || r.remoteRecoveryExecuted !== false ||
      r.receiverActivationAuthorized !== false || !Array.isArray(r.sources) || r.sources.length !== 3) throw new Error("HOLD");
  const seen = new Set<string>();
  return r.sources.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("HOLD");
    const v = item as Record<string, unknown>;
    if (typeof v.source !== "string" || !masters.includes(v.source) || seen.has(v.source) ||
        typeof v.status !== "string" || typeof v.targetSha !== "string" || !/^[a-f0-9]{40}$/.test(v.targetSha) ||
        (v.runtimeSha !== null && (typeof v.runtimeSha !== "string" || !/^[a-f0-9]{40}$/.test(v.runtimeSha))) ||
        (v.sequence !== null && (typeof v.sequence !== "number" || !Number.isSafeInteger(v.sequence) || v.sequence < 1)) ||
        ![null, "reviewed", "follow_up"].includes(v.ownerReview as string | null)) throw new Error("HOLD");
    seen.add(v.source);
    return v as unknown as Source;
  });
}
export function RuntimeDrift390Panel() {
  const [rows, setRows] = useState<Source[]>([]);
  const [packet, setPacket] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Signed runtime evidence not yet checked.");
  async function run(action: "read" | "observation" | "review", body?: unknown) {
    if (busy) return;
    setBusy(true);
    try {
      if (action !== "read") {
        const result = await runtimeDrift390(action, body);
        if (!result || typeof result !== "object") throw new Error("HOLD");
        const v = result as Record<string, unknown>;
        if (action === "review" ? v.recorded !== true || v.remoteRecoveryExecuted !== false
          : v.accepted !== true || v.independentThreeMasterAcceptance !== false) throw new Error("HOLD");
        if (action === "observation") setPacket("");
      }
      setRows(parseReport(await runtimeDrift390("read")));
      setMessage("Signed source readback completed; independent recovery remains unverified.");
    } catch {
      setRows([]);
      setMessage("HOLD: private runtime evidence or review unavailable, stale or invalid.");
    } finally { setBusy(false); }
  }
  function submit() {
    try { if (packet.length > 2048) throw new Error("HOLD"); void run("observation", JSON.parse(packet)); }
    catch { setMessage("HOLD: invalid bounded signed observation JSON."); }
  }
  return <section aria-label="Build 390 runtime drift review">
    <h3>Three-Master runtime drift and recovery review · Build 390</h3>
    <p>Signed source observations only. Review records a handoff, not permission to restart, deploy or control equipment.</p>
    <button type="button" disabled={busy} onClick={() => void run("read")}>Read signed runtime status</button>
    <label>Signed observation JSON (never private keys)<textarea maxLength={2048} value={packet} onChange={e => setPacket(e.target.value)} /></label>
    <button type="button" disabled={busy || !packet.trim()} onClick={submit}>Verify runtime observation</button>
    <p role="status" aria-label="Runtime drift status">{message}</p>
    {rows.map(row => <article key={row.source}>
      <h4>{row.source}</h4>
      <p>{row.status} · Review: {row.ownerReview ?? "Not recorded"}</p>
      <p>Approved: {row.targetSha} · Observed: {row.runtimeSha ?? "Unavailable"}</p>
      {row.sequence !== null && row.ownerReview === null && <>
        <button type="button" disabled={busy} onClick={() => void run("review", {source: row.source, sequence: row.sequence, decision: "follow_up"})}>Record recovery follow-up</button>
        <button type="button" disabled={busy} onClick={() => void run("review", {source: row.source, sequence: row.sequence, decision: "reviewed"})}>Record observation reviewed</button>
      </>}
    </article>)}
  </section>;
}
