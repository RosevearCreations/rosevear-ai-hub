import { useState } from "react";
import { fieldCustody388 } from "./api";
import { CAMPAIGN_STEP_IDS387 } from "./campaign387";

type Receipt = { challenge: string; gateId: string; decision: string | null };

function receiptList(raw: unknown): Receipt[] {
  if (!raw || typeof raw !== "object") throw new Error("HOLD");
  const record = raw as Record<string, unknown>;
  if (record.fieldCertified !== false || record.independentRecoveryClosed !== false ||
      !Array.isArray(record.receipts) || record.receipts.length > 100) throw new Error("HOLD");
  return record.receipts.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("HOLD");
    const row = item as Record<string, unknown>;
    if (typeof row.challenge !== "string" || !/^[a-f0-9]{64}$/.test(row.challenge) ||
        typeof row.gateId !== "string" ||
        !CAMPAIGN_STEP_IDS387.some(id => id === row.gateId) ||
        ![null, "reviewed", "follow_up"].includes(row.decision as string | null)) throw new Error("HOLD");
    return { challenge: row.challenge, gateId: row.gateId, decision: row.decision as string | null };
  });
}

export function FieldCustody388Panel() {
  const [gate, setGate] = useState<string>(CAMPAIGN_STEP_IDS387[0]);
  const [packet, setPacket] = useState("");
  const [challenge, setChallenge] = useState("");
  const [rows, setRows] = useState<Receipt[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Private signed metadata custody not yet checked.");
  async function run(action: "read" | "challenge" | "intake" | "review", payload?: unknown) {
    if (busy) return;
    setBusy(true);
    try {
      const raw = await fieldCustody388(action, payload);
      if (action === "read") {
        setRows(receiptList(raw));
      } else {
        if (!raw || typeof raw !== "object") throw new Error("HOLD");
        const r = raw as Record<string, unknown>;
        if (r.fieldCertified !== false) throw new Error("HOLD");
        if (action === "challenge") {
          if (typeof r.challenge !== "string" || !/^[a-f0-9]{64}$/.test(r.challenge) ||
              r.gateId !== gate || typeof r.releaseSha !== "string" ||
              !/^[a-f0-9]{40}$/.test(r.releaseSha)) throw new Error("HOLD");
          setChallenge(JSON.stringify(r, null, 2));
        } else {
          if (r.independentRecoveryClosed !== false) throw new Error("HOLD");
          if (action === "intake") setPacket("");
          setRows(receiptList(await fieldCustody388("read")));
        }
      }
      setMessage("Private metadata operation completed. Independent physical acceptance remains HOLD.");
    } catch {
      setRows([]);
      setChallenge("");
      setMessage("HOLD: custody unavailable, invalid, expired, replayed or not configured. No certification.");
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    try {
      if (packet.length > 16000) throw new Error("HOLD");
      void run("intake", JSON.parse(packet));
    } catch {
      setMessage("HOLD: invalid bounded signed metadata JSON.");
    }
  }
  return <section aria-label="Build 388 private witness review">
    <h3>Private signed witness custody · Build 388</h3>
    <p>Only redacted metadata and signed digests. Never paste keys, passwords, private logs or archive contents.
      Physical field certification and off-machine recovery remain HOLD.</p>
    <label>Witness gate <select value={gate} onChange={e => {setGate(e.target.value); setChallenge("");}}>
      {CAMPAIGN_STEP_IDS387.map(id => <option key={id}>{id}</option>)}
    </select></label>
    <button type="button" disabled={busy} onClick={() => void run("challenge", {gate_id: gate})}>Issue single-use challenge</button>
    {challenge && <pre>{challenge}</pre>}
    <label>Signed metadata packet <textarea value={packet} maxLength={16000}
      onChange={e => setPacket(e.target.value)} /></label>
    <button type="button" disabled={busy || !packet.trim()} onClick={submit}>Verify and store signed metadata</button>
    <button type="button" disabled={busy} onClick={() => void run("read")}>Read private review ledger</button>
    <p role="status" aria-label="Private witness custody status">{message}</p>
    {rows.map(row => <article key={row.challenge}>
      <p>{row.gateId} — {row.decision ?? "Owner review required"}</p>
      {!row.decision && <>
        <button type="button" disabled={busy} onClick={() => void run("review", {challenge: row.challenge, decision: "reviewed"})}>Record metadata reviewed</button>
        <button type="button" disabled={busy} onClick={() => void run("review", {challenge: row.challenge, decision: "follow_up"})}>Record follow-up required</button>
      </>}
    </article>)}
  </section>;
}
