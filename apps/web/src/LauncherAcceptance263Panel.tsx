import {useState} from "react";
import {parseLauncherObservation263, parseSignedRuntime263, reviewLauncherAcceptance263,
  type LauncherObservation263, type SignedRuntime263} from "./launcherAcceptance263";

type Result = Awaited<ReturnType<typeof reviewLauncherAcceptance263>>;

export function LauncherAcceptance263Panel({expectedSha, trustedIssuerKey}: {
  expectedSha: string; trustedIssuerKey: string | null;
}) {
  const [before, setBefore] = useState<LauncherObservation263 | null>(null);
  const [after, setAfter] = useState<LauncherObservation263 | null>(null);
  const [receipt, setReceipt] = useState<SignedRuntime263 | null>(null);
  const [issuerPin, setIssuerPin] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [witnessPin, setWitnessPin] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState<{result: Result; token: string} | null>(null);
  const pins = {issuer: issuerPin.trim().toLowerCase(), owner: ownerPin.trim().toLowerCase(),
    independent_witness: witnessPin.trim().toLowerCase()};
  const token = [before?.observed_at, after?.observed_at, receipt?.issuer.signature_base64,
    receipt?.owner.signature_base64, receipt?.independent_witness.signature_base64,
    pins.issuer, pins.owner, pins.independent_witness, expectedSha, trustedIssuerKey].join("|");
  const current = Boolean(checked && checked.token === token && checked.result.signedCandidate
    && Date.now() <= Date.parse(receipt?.expires_at ?? ""));

  async function importEvidence<T>(file: File | undefined, parse: (text: string) => T,
    set: (value: T) => void) {
    setError(""); setChecked(null);
    if (!file) return;
    if (file.size > 16000) {setError("Maximum evidence size is 16 KB."); return;}
    try {set(parse(await file.text()));}
    catch (cause) {setError(cause instanceof Error ? cause.message : "Invalid local evidence.");}
  }
  async function verify() {
    if (!before || !after || !receipt || !trustedIssuerKey) return;
    setError(""); setChecked(null);
    try {
      const result = await reviewLauncherAcceptance263(before, after, receipt, trustedIssuerKey,
        pins, expectedSha, new Date().toISOString().replace(/\.\d{3}Z$/,"Z"));
      setChecked({result, token});
    } catch (cause) {setError(cause instanceof Error ? cause.message : "Cannot verify runtime receipt.");}
  }

  return <section aria-label="Build 263 signed Windows runtime acceptance and Comms TEST HOLD">
    <h4>Build 263 — Original launch commands and signed post-restart receipt</h4>
    <p>On Ree's server, inspect the original launch command evidence with
      <code> powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-launcher-263.ps1 -Stage before</code>.
      Only use <code>-Stage after</code> following an independently approved, owner-supervised restart.
      The observer does not reveal paths, process IDs or command lines, and never restarts anything.</p>
    <label>Before-restart Windows JSON
      <input type="file" accept=".json,application/json" onChange={e => {setBefore(null);
        void importEvidence(e.target.files?.[0], parseLauncherObservation263, value => {
          if (value.stage !== "before") throw new Error("Expected before-stage observation.");
          setBefore(value);
        });}} />
    </label>
    <label>After-restart Windows JSON (only if genuinely witnessed)
      <input type="file" accept=".json,application/json" onChange={e => {setAfter(null);
        void importEvidence(e.target.files?.[0], parseLauncherObservation263, value => {
          if (value.stage !== "after") throw new Error("Expected after-stage observation.");
          setAfter(value);
        });}} />
    </label>
    <label>Original issuer + owner + independent witness signed local restart receipt
      <input type="file" accept=".json,application/json" onChange={e => {setReceipt(null);
        void importEvidence(e.target.files?.[0], parseSignedRuntime263, setReceipt);}} />
    </label>
    <label>Independently authenticated original issuer fingerprint (SHA-256)
      <input aria-label="Build 263 issuer fingerprint" maxLength={64} spellCheck={false}
        value={issuerPin} onChange={e => {setIssuerPin(e.target.value); setChecked(null);}} />
    </label>
    <label>Separately authenticated owner fingerprint (SHA-256)
      <input aria-label="Build 263 owner fingerprint" maxLength={64} spellCheck={false}
        value={ownerPin} onChange={e => {setOwnerPin(e.target.value); setChecked(null);}} />
    </label>
    <label>Jack's independent witness fingerprint (SHA-256)
      <input aria-label="Build 263 witness fingerprint" maxLength={64} spellCheck={false}
        value={witnessPin} onChange={e => {setWitnessPin(e.target.value); setChecked(null);}} />
    </label>
    <button type="button" disabled={!before || !after || !receipt || !trustedIssuerKey
      || Object.values(pins).some(value => !/^[a-f0-9]{64}$/.test(value))}
      onClick={() => void verify()}>Verify signed local restart receipt without activating Comms</button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Windows launcher</span><strong>{after?.web.template_match && after?.backend.template_match
        ? "Candidate templates observed" : "HOLD / commands unverified"}</strong></div>
      <div><span>Signed receipt</span><strong>{current ? "Mathematical candidate only" : "NOT ACCEPTED / HOLD"}</strong></div>
      <div><span>Installed release</span><strong>NOT INDEPENDENTLY ATTESTED</strong></div>
      <div><span>Comms TEST</span><strong>OFF / NOT AUTHORIZED / HOLD</strong></div>
    </div>
    {checked && checked.token === token && <div className="hub-update-next-step">
      <p>Receipt review: <strong>{checked.result.state}</strong></p>
      <p>Exact release: {String(checked.result.exactRelease)}; restart timeline: {String(checked.result.afterStarted)};
        independent keys distinct: {String(checked.result.distinct)}; signatures valid:
        {String(Object.values(checked.result.signatures).every(Boolean))}.</p>
      <ul>{checked.result.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    </div>}
    <p><small>All uploaded evidence remains in this browser. A matching signature does not authenticate
      the human custodian or authorize the private receiver. No network requests, task changes,
      process starts, device actions or customer communications are performed.</small></p>
  </section>;
}
