import {useState} from "react";
import {parseRuntime260, parseOwner260, parseWitness260, reviewRuntime260,
  type Runtime260, type OwnerDecision260, type RuntimeWitness260} from "./supervisedRuntime260";

type Review = Awaited<ReturnType<typeof reviewRuntime260>>;

export function SupervisedRuntime260Panel({expectedSha, trustedOriginalKey}: {
  expectedSha: string; trustedOriginalKey: string | null;
}) {
  const [before, setBefore] = useState<Runtime260 | null>(null);
  const [after, setAfter] = useState<Runtime260 | null>(null);
  const [owner, setOwner] = useState<OwnerDecision260 | null>(null);
  const [witness, setWitness] = useState<RuntimeWitness260 | null>(null);
  const [ownerKey, setOwnerKey] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<{
    result: Review; before: Runtime260; after: Runtime260; owner: OwnerDecision260;
    witness: RuntimeWitness260; original: string | null; ownerKey: string;
    ownerPin: string; pin: string; expected: string;
  } | null>(null);
  const normalizedPin = pin.trim().toLowerCase();
  const normalizedOwnerPin = ownerPin.trim().toLowerCase();
  const current = Boolean(verified && verified.before === before && verified.after === after
    && verified.owner === owner && verified.witness === witness && verified.original === trustedOriginalKey
    && verified.ownerKey === ownerKey.trim() && verified.ownerPin === normalizedOwnerPin
    && verified.pin === normalizedPin && verified.expected === expectedSha && verified.result.signedCandidate
    && Date.now() - Date.parse(witness?.witnessed_at ?? "") >= 0
    && Date.now() - Date.parse(witness?.witnessed_at ?? "") <= 24 * 3600 * 1000);

  async function load<T>(file: File | undefined, parser: (source: string) => T, setter: (data: T) => void) {
    setError(""); setVerified(null);
    if (!file) return;
    if (file.size > 20000) { setError("Build 260 evidence exceeds 20 KB."); return; }
    try { setter(parser(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Build 260 evidence."); }
  }
  async function review() {
    if (!before || !after || !owner || !witness || !trustedOriginalKey || normalizedPin.length !== 64
      || normalizedOwnerPin.length !== 64 || ownerKey.trim().length !== 44) return;
    const result = await reviewRuntime260(before, after, owner, witness,
      ownerKey.trim(), normalizedOwnerPin, normalizedPin, expectedSha, new Date().toISOString());
    setVerified({result, before, after, owner, witness, original: trustedOriginalKey,
      ownerKey: ownerKey.trim(), ownerPin: normalizedOwnerPin, pin: normalizedPin, expected: expectedSha});
  }

  return <section aria-label="Build 260 supervised Windows release and Comms TEST handoff">
    <h4>Build 260 — Supervised release and independent post-restart evidence</h4>
    <p>Capture an on-device baseline before any owner-approved maintenance. On Ree's Windows server use
      <code> powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-runtime-260.ps1 -Stage before</code>.
      Only after separately approved, supervised activation, run the same read-only command with
      <code> -Stage after</code>. A stage label is not proof of a restart.</p>
    <label>Before-restart Windows observation (JSON)
      <input type="file" accept=".json,application/json" onChange={event => {
        setBefore(null); void load(event.target.files?.[0], parseRuntime260, value => {
          if (value.stage !== "before") throw new Error("Expected a before-stage observation.");
          setBefore(value);
        });
      }} />
    </label>
    <label>After-restart Windows observation (JSON)
      <input type="file" accept=".json,application/json" onChange={event => {
        setAfter(null); void load(event.target.files?.[0], parseRuntime260, value => {
          if (value.stage !== "after") throw new Error("Expected an after-stage observation.");
          setAfter(value);
        });
      }} />
    </label>
    <label>Original owner's independently authenticated supervised restart decision
      <input type="file" accept=".json,application/json" onChange={event => {
        setOwner(null); void load(event.target.files?.[0], parseOwner260, setOwner);
      }} />
    </label>
    <label>Original owner's separately authenticated Ed25519 public key (not automatically the issuer key)
      <input aria-label="Build 260 owner public key" value={ownerKey} maxLength={44}
        spellCheck={false} onChange={event => { setOwnerKey(event.target.value); setVerified(null); }} />
    </label>
    <label>Original owner's independently checked public-key SHA-256 fingerprint
      <input aria-label="Build 260 owner fingerprint" value={ownerPin} maxLength={64}
        spellCheck={false} onChange={event => { setOwnerPin(event.target.value); setVerified(null); }} />
    </label>
    <label>Jack's separate signed post-restart / receiver-OFF TEST handoff
      <input type="file" accept=".json,application/json" onChange={event => {
        setWitness(null); void load(event.target.files?.[0], parseWitness260, setWitness);
      }} />
    </label>
    <label>Previously authenticated independent witness public-key SHA-256 fingerprint
      <input aria-label="Build 260 witness fingerprint" value={pin} maxLength={64} spellCheck={false}
        placeholder="64 hexadecimal characters" onChange={event => { setPin(event.target.value); setVerified(null); }} />
    </label>
    <button type="button" disabled={!before || !after || !owner || !witness || !trustedOriginalKey
      || ownerKey.trim().length !== 44 || !/^[a-f0-9]{64}$/.test(normalizedOwnerPin)
      || !/^[a-f0-9]{64}$/.test(normalizedPin)} onClick={() => void review()}>
      Verify supervised runtime and signed independent TEST handoff
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Before / after runtime stage</span><strong>{before ? "Baseline observed" : "Pending"}
        {" / "}{after ? "Follow-up observed" : "Pending"}</strong></div>
      <div><span>Signed post-restart evidence</span><strong>{current ? "Candidate verified" : "HOLD"}</strong></div>
      <div><span>Installed source and runtime attestation</span><strong>NOT ATTESTED</strong></div>
      <div><span>Windows restart control</span><strong>SUPERVISED ONLY — NO APP ACTION</strong></div>
      <div><span>Comms TEST receiver</span><strong>OFF / NO CHALLENGE / HOLD</strong></div>
    </div>
    <p><strong>Decision:</strong> ORIGINAL OWNER SUPERVISED AND COMMS TEST HOLD. No button here restarts Node,
      Python, scheduled tasks, or devices. Neither a signed plan nor later process start times prove
      installed source identity or authorize a live connection.</p>
    <p><small>Evidence stays in this browser. The existing original-issuer key is not, by itself, owner consent.
      Independently authenticate the owner's separate public key and fingerprint, and the witness fingerprint,
      through trusted channels before review. Do not upload private signing keys.</small></p>
  </section>;
}
