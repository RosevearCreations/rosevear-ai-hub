import {useState} from "react";
import {parseOwner260, parseWitness260, type OwnerDecision260,
  type RuntimeWitness260} from "./supervisedRuntime260";
import {parseInstalledSource261, parseOriginalIssuer261, reviewInstalledSource261,
  type InstalledSource261, type OriginalIssuerMap261} from "./installedSource261";

type Review = Awaited<ReturnType<typeof reviewInstalledSource261>>;

export function InstalledSource261Panel({expectedSha, trustedIssuerKey}: {
  expectedSha: string; trustedIssuerKey: string | null;
}) {
  const [before, setBefore] = useState<InstalledSource261 | null>(null);
  const [after, setAfter] = useState<InstalledSource261 | null>(null);
  const [issuer, setIssuer] = useState<OriginalIssuerMap261 | null>(null);
  const [owner, setOwner] = useState<OwnerDecision260 | null>(null);
  const [witness, setWitness] = useState<RuntimeWitness260 | null>(null);
  const [issuerPin, setIssuerPin] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [witnessPin, setWitnessPin] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<{result: Review; token: string} | null>(null);
  const pins = [issuerPin, ownerPin, witnessPin].map(x => x.trim().toLowerCase());
  const token = [before?.observed_at, after?.observed_at, issuer?.signature_base64,
    owner?.signature_base64, witness?.signature_base64, ...pins,
    ownerKey.trim(), expectedSha, trustedIssuerKey].join("|");
  const current = Boolean(verified && verified.token === token && verified.result.signedCandidate
    && Date.now() <= Date.parse(issuer?.expires_at ?? "")
    && Date.now() >= Date.parse(issuer?.mapped_at ?? ""));

  async function read<T>(file: File | undefined, parse: (text: string) => T, set: (value: T) => void) {
    setError(""); setVerified(null);
    if (!file) return;
    if (file.size > 50000) {setError("Evidence must be 50 KB or less."); return;}
    try {set(parse(await file.text()));}
    catch (cause) {setError(cause instanceof Error ? cause.message : "Invalid signed evidence.");}
  }
  async function verify() {
    if (!before || !after || !issuer || !owner || !witness || !trustedIssuerKey) return;
    setError(""); setVerified(null);
    try {
      const result = await reviewInstalledSource261(before, after, issuer, owner, witness,
        trustedIssuerKey, pins[0], ownerKey.trim(), pins[1], pins[2], expectedSha,
        new Date().toISOString());
      setVerified({result, token});
    } catch (cause) {setError(cause instanceof Error ? cause.message : "Evidence review failed.");}
  }

  return <section aria-label="Build 261 Windows installed source and Comms TEST evidence review">
    <h4>Build 261 — Original issuer, Windows launcher and supervised restart receipt</h4>
    <p>On Ree's server, capture the existing Node/Python launch-template observations with
      <code> powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-installed-261.ps1 -Stage before</code>.
      Capture <code>-Stage after</code> only following an independently authorized, supervised restart.
      The inspector reveals no command lines, executable paths, private keys or process IDs.</p>
    <label>Original Windows baseline JSON
      <input type="file" accept=".json,application/json" onChange={e => {setBefore(null);
        void read(e.target.files?.[0], parseInstalledSource261, x => {
          if (x.stage !== "before") throw new Error("Expected before-stage Windows observation.");
          setBefore(x);
        });}} />
    </label>
    <label>Follow-up Windows observation JSON
      <input type="file" accept=".json,application/json" onChange={e => {setAfter(null);
        void read(e.target.files?.[0], parseInstalledSource261, x => {
          if (x.stage !== "after") throw new Error("Expected after-stage Windows observation.");
          setAfter(x);
        });}} />
    </label>
    <label>Original issuer's signed checkout-artifact and launch-template candidate mapping
      <input type="file" accept=".json,application/json" onChange={e => {setIssuer(null);
        void read(e.target.files?.[0], parseOriginalIssuer261, setIssuer);}} />
    </label>
    <label>Independently authenticated original-issuer public-key SHA-256 fingerprint
      <input aria-label="Build 261 issuer fingerprint" spellCheck={false} maxLength={64}
        value={issuerPin} onChange={e => {setIssuerPin(e.target.value); setVerified(null);}} />
    </label>
    <label>Owner-signed Build 260 supervised restart decision (local restart only)
      <input type="file" accept=".json,application/json" onChange={e => {setOwner(null);
        void read(e.target.files?.[0], parseOwner260, setOwner);}} />
    </label>
    <label>Separately authenticated owner Ed25519 public key (base64)
      <input aria-label="Build 261 owner public key" spellCheck={false} maxLength={44}
        value={ownerKey} onChange={e => {setOwnerKey(e.target.value); setVerified(null);}} />
    </label>
    <label>Original owner's separately authenticated public-key SHA-256 fingerprint
      <input aria-label="Build 261 owner fingerprint" spellCheck={false} maxLength={64}
        value={ownerPin} onChange={e => {setOwnerPin(e.target.value); setVerified(null);}} />
    </label>
    <label>Jack's separate signed Build 260 receiver-OFF runtime / TEST-HOLD witness
      <input type="file" accept=".json,application/json" onChange={e => {setWitness(null);
        void read(e.target.files?.[0], parseWitness260, setWitness);}} />
    </label>
    <label>Independently authenticated witness public-key SHA-256 fingerprint
      <input aria-label="Build 261 witness fingerprint" spellCheck={false} maxLength={64}
        value={witnessPin} onChange={e => {setWitnessPin(e.target.value); setVerified(null);}} />
    </label>
    <button type="button" disabled={!before || !after || !issuer || !owner || !witness
      || !trustedIssuerKey || ownerKey.trim().length !== 44
      || pins.some(x => !/^[a-f0-9]{64}$/.test(x))} onClick={() => void verify()}>
      Verify three independently pinned signed receipts locally
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Original Web / backend launcher</span><strong>{after
        ? `${after.web.template_status} / ${after.backend.template_status}` : "UNOBSERVED"}</strong></div>
      <div><span>Original issuer / owner / independent witness</span><strong>{current
        ? "Signed candidate only" : "HOLD — requires independent verification"}</strong></div>
      <div><span>Installed application-source-to-process proof</span><strong>NOT ATTESTED</strong></div>
      <div><span>Scheduled recovery task</span><strong>DO NOT MODIFY</strong></div>
      <div><span>Private Comms receiver and challenge</span><strong>OFF / NOT AUTHORIZED / HOLD</strong></div>
    </div>
    <p><strong>Readiness decision: COMMS TEST HOLD.</strong> An exact launch-template match and an original-issuer
      signed checkout hash are insufficient to prove which source files the existing processes loaded.
      The supervised restart decision authorizes neither execution here nor any network TEST.</p>
    <p><small>This screen never stops or starts services, changes scheduled tasks, signs custody receipts,
      or makes a private connection. Evidence is checked locally in the browser; never upload private keys.
      Review the Build 261 Windows operator runbook before considering any supervised activation.</small></p>
  </section>;
}
