import { useState } from "react";
import { ProcessChain257Panel } from "./ProcessChain257Panel";
import {
  parseProcessObservation256, parseProcessWitness256, reviewSignedProcess256,
  type SignedProcessWitness256, type WindowsProcessObservation256,
} from "./processEvidence256";

type Verification = Awaited<ReturnType<typeof reviewSignedProcess256>>;

export function ProcessEvidence256Panel({expectedSha, originalSignerKey}: {
  expectedSha: string; originalSignerKey: string | null;
}) {
  const [observed, setObserved] = useState<WindowsProcessObservation256 | null>(null);
  const [witness, setWitness] = useState<SignedProcessWitness256 | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<{
    result: Verification; observation: WindowsProcessObservation256 | null; witness: SignedProcessWitness256 | null;
    pin: string; expected: string; originalSigner: string | null;
  } | null>(null);
  const normalizedPin = pin.trim().toLowerCase();
  const current = Boolean(verified && verified.observation === observed && verified.witness === witness
    && verified.pin === normalizedPin && verified.expected === expectedSha && verified.originalSigner === originalSignerKey
    && verified.result.state === "SIGNED_PROCESS_EXECUTABLE_CANDIDATE_ONLY"
    && Date.now() - Date.parse(observed?.observed_at ?? "") >= 0
    && Date.now() - Date.parse(observed?.observed_at ?? "") <= 24 * 3600 * 1000);

  async function importEvidence<T>(file: File | undefined, parser: (value: string) => T, set: (x: T) => void) {
    setError("");
    setVerified(null);
    if (!file) return;
    if (file.size > 8192) { setError("Maximum evidence size is 8 KB."); return; }
    try { set(parser(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid evidence JSON."); }
  }

  async function verify() {
    if (!observed || !witness) return;
    const result = await reviewSignedProcess256(observed, witness, normalizedPin,
      originalSignerKey, expectedSha, new Date().toISOString());
    setVerified({result, observation: observed, witness, pin: normalizedPin,
      expected: expectedSha, originalSigner: originalSignerKey});
  }

  return <section aria-label="Build 256 Windows signed process evidence intake">
    <h4>Build 256 — Windows installed-source and independent signed process review</h4>
    <p>On the Windows Hub, run <code>.\scripts\inspect-hub-process-256.ps1</code> in the authorized PowerShell session.
      Its JSON observes loopback listener executable digests without publishing paths, PIDs or commands. A different,
      independently authenticated custodian must sign the exact observation; an unsigned local file is not proof.</p>
    <label>On-device read-only process observation (JSON, 8 KB maximum)
      <input type="file" accept=".json,application/json" onChange={event => {
        setObserved(null); void importEvidence(event.target.files?.[0], parseProcessObservation256, setObserved);
      }} />
    </label>
    <label>Independent signed process witness (JSON, 8 KB maximum)
      <input type="file" accept=".json,application/json" onChange={event => {
        setWitness(null); void importEvidence(event.target.files?.[0], parseProcessWitness256, setWitness);
      }} />
    </label>
    <label>Independently authenticated witness public-key SHA-256 fingerprint
      <input aria-label="Build 256 witness fingerprint" spellCheck={false} maxLength={64}
        placeholder="64 lowercase hex characters" value={pin}
        onChange={event => { setPin(event.target.value); setVerified(null); }} />
    </label>
    <button type="button" onClick={() => void verify()}
      disabled={!observed || !witness || normalizedPin.length !== 64 || !originalSignerKey}>
      Verify signed process candidate locally
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Independent signature</span><strong>{current ? "Candidate only" : "HOLD"}</strong></div>
      <div><span>Windows installed release</span><strong>NOT ATTESTED</strong></div>
      <div><span>Comms TEST receiver</span><strong>DISCONNECTED / HOLD</strong></div>
      <div><span>Remote or device actions</span><strong>NONE</strong></div>
    </div>
    <p><strong>Readiness decision:</strong> COMMS TEST RECEIVER HOLD</p>
    <ul>
      <li>Executable digest alone does not bind a generic Node or Python interpreter to the loaded application source.</li>
      <li>Original-issuer release custody and independently witnessed, installed process identity are still required.</li>
      <li>The remote receiver must remain OFF until separately authorized, signed and tested within a bounded TEST scope.</li>
    </ul>
    <p><small>All evidence stays in this browser. This review never connects a relay, modifies a task, restarts Windows services or authorizes customer/device communications.</small></p>
    <ProcessChain257Panel expectedSha={expectedSha} trustedIssuerKey={originalSignerKey} />
  </section>;
}
