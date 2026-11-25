import { useState } from "react";
import { masterAcceptance389 } from "./api";

type Readiness = {
  originalHostMatched: boolean;
  localRuntimeStatus: string;
  loadedIdentity: { sha: string | null; pid: number; version: string } | null;
  signedThreeMasterChallengeVerified: boolean;
};

function parseReadiness(raw: unknown): Readiness {
  if (!raw || typeof raw !== "object") throw new Error("HOLD");
  const v = raw as Record<string, unknown>;
  if (typeof v.originalHostMatched !== "boolean" ||
      typeof v.localRuntimeStatus !== "string" ||
      typeof v.signedThreeMasterChallengeVerified !== "boolean" ||
      v.independentTransportAndPhysicalAcceptance !== false ||
      v.releaseManagerGatesStillRequired !== true ||
      v.remoteRecoveryAuthorized !== false ||
      v.receiverActivationAuthorized !== false) throw new Error("HOLD");
  if (v.loadedIdentity !== null) {
    if (!v.loadedIdentity || typeof v.loadedIdentity !== "object") throw new Error("HOLD");
    const id = v.loadedIdentity as Record<string, unknown>;
    if (id.sha !== null && (typeof id.sha !== "string" || !/^[a-f0-9]{40}$/.test(id.sha))) throw new Error("HOLD");
    if (typeof id.version !== "string" || typeof id.pid !== "number" || !Number.isSafeInteger(id.pid) || id.pid <= 0) throw new Error("HOLD");
  }
  return v as unknown as Readiness;
}

export function MasterAcceptance389Panel() {
  const [report, setReport] = useState<Readiness | null>(null);
  const [challenge, setChallenge] = useState("");
  const [packet, setPacket] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Runtime readiness has not been checked.");
  async function run(action: "read" | "challenge" | "receipt") {
    if (busy) return;
    setBusy(true);
    try {
      if (action === "challenge") {
        const raw = await masterAcceptance389("challenge");
        if (!raw || typeof raw !== "object") throw new Error("HOLD");
        const v = raw as Record<string, unknown>;
        if (typeof v.challenge !== "string" || !/^[a-f0-9]{64}$/.test(v.challenge)) throw new Error("HOLD");
        setChallenge(JSON.stringify(v, null, 2));
      } else if (action === "receipt") {
        if (packet.length > 12000) throw new Error("HOLD");
        const raw = await masterAcceptance389("receipt", JSON.parse(packet));
        if (!raw || typeof raw !== "object") throw new Error("HOLD");
        const v = raw as Record<string, unknown>;
        if (v.stored !== true || v.independentTransportAndPhysicalAcceptance !== false) throw new Error("HOLD");
        setPacket("");
        setChallenge("");
      }
      setReport(parseReadiness(await masterAcceptance389("read")));
      setMessage("Readback completed. Independent transport and physical acceptance remain unverified.");
    } catch {
      setReport(null);
      setChallenge("");
      setMessage("HOLD: release readiness or private signed receipt validation unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return <section aria-label="Build 389 release readiness">
    <h3>Release readiness and Three-Master agreement · Build 389</h3>
    <p>Source signatures do not certify independent transport or physical operations. Existing release manager gates remain mandatory.</p>
    <button type="button" disabled={busy} onClick={() => void run("read")}>Check consolidated readiness</button>
    <button type="button" disabled={busy} onClick={() => void run("challenge")}>Issue Master agreement challenge</button>
    {challenge && <pre>{challenge}</pre>}
    <label>Three signed receipts (JSON only, never private keys)
      <textarea value={packet} maxLength={12000} onChange={e => setPacket(e.target.value)} />
    </label>
    <button type="button" disabled={busy || !packet.trim()} onClick={() => void run("receipt")}>Verify Master agreement receipts</button>
    <p role="status" aria-label="Release readiness status">{message}</p>
    {report && <dl>
      <dt>Original host</dt><dd>{report.originalHostMatched ? "Local name matched" : "Not verified"}</dd>
      <dt>Runtime status</dt><dd>{report.localRuntimeStatus}</dd>
      <dt>Loaded release</dt><dd>{report.loadedIdentity?.sha ?? "Not verified"}</dd>
      <dt>Loaded PID and version</dt><dd>{report.loadedIdentity ? report.loadedIdentity.pid + " / " + report.loadedIdentity.version : "Not verified"}</dd>
      <dt>Signed challenge agreement</dt><dd>{report.signedThreeMasterChallengeVerified ? "Three distinct signatures verified" : "Awaiting signed receipts"}</dd>
    </dl>}
  </section>;
}
