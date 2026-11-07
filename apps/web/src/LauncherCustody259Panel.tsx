import {useState} from "react";
import {
  parseLauncher259, parseIssuer259, parseChallenge259, reviewLauncher259,
  type LauncherCustody259, type IssuerLauncherReceipt259, type IndependentChallenge259,
} from "./launcherCustody259";

type Review = Awaited<ReturnType<typeof reviewLauncher259>>;

export function LauncherCustody259Panel({expectedSha, trustedOriginalKey}: {
  expectedSha: string; trustedOriginalKey: string | null;
}) {
  const [observation, setObservation] = useState<LauncherCustody259 | null>(null);
  const [issuer, setIssuer] = useState<IssuerLauncherReceipt259 | null>(null);
  const [witness, setWitness] = useState<IndependentChallenge259 | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState<{
    observation: LauncherCustody259; issuer: IssuerLauncherReceipt259; witness: IndependentChallenge259;
    key: string; pin: string; expected: string; result: Review;
  } | null>(null);
  const normalizedPin = pin.trim().toLowerCase();
  const current = Boolean(verified && verified.observation === observation && verified.issuer === issuer
    && verified.witness === witness && verified.key === trustedOriginalKey
    && verified.pin === normalizedPin && verified.expected === expectedSha
    && verified.result.state === "SIGNED_OFFLINE_CHALLENGE_CANDIDATE_ONLY"
    && Date.now() - Date.parse(observation?.observed_at ?? "") >= 0
    && Date.now() - Date.parse(observation?.observed_at ?? "") <= 24 * 3600 * 1000);

  async function load<T>(file: File | undefined, parser: (text: string) => T, setter: (value: T) => void) {
    setError(""); setVerified(null);
    if (!file) return;
    if (file.size > 12000) { setError("Build 259 evidence exceeds 12 KB."); return; }
    try { setter(parser(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Build 259 receipt."); }
  }

  async function verify() {
    if (!observation || !issuer || !witness || !trustedOriginalKey || normalizedPin.length !== 64) return;
    const result = await reviewLauncher259(observation, issuer, witness,
      trustedOriginalKey, normalizedPin, expectedSha, new Date().toISOString());
    setVerified({observation, issuer, witness, key: trustedOriginalKey,
      pin: normalizedPin, expected: expectedSha, result});
  }

  return <section aria-label="Build 259 Windows launcher custody and offline TEST witness">
    <h4>Build 259 — Launcher custody and independent offline TEST challenge</h4>
    <p>On Ree's updated Windows checkout, run <code>powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-launcher-259.ps1</code>.
      It observes sanitized process-ancestry categories and compares process start times to the checkout commit.
      The disabled startup task and the working recovery task are left unchanged.</p>
    <label>On-device launcher-custody JSON (max 12 KB)
      <input type="file" accept=".json,application/json" onChange={event => {
        setObservation(null); void load(event.target.files?.[0], parseLauncher259, setObservation);
      }} />
    </label>
    <label>Original issuer's independently authenticated launcher receipt
      <input type="file" accept=".json,application/json" onChange={event => {
        setIssuer(null); void load(event.target.files?.[0], parseIssuer259, setIssuer);
      }} />
    </label>
    <label>Separate independent offline Comms TEST challenge witness receipt
      <input type="file" accept=".json,application/json" onChange={event => {
        setWitness(null); void load(event.target.files?.[0], parseChallenge259, setWitness);
      }} />
    </label>
    <label>Independently verified challenge witness public-key SHA-256 fingerprint
      <input aria-label="Build 259 witness fingerprint" value={pin} maxLength={64} spellCheck={false}
        placeholder="64 lowercase hexadecimal characters"
        onChange={event => { setPin(event.target.value); setVerified(null); }} />
    </label>
    <button type="button" disabled={!observation || !issuer || !witness || !trustedOriginalKey || normalizedPin.length !== 64}
      onClick={() => void verify()}>Verify original issuer and separate offline challenge witness</button>
    {error && <p role="alert">{error}</p>}
    {observation && <div className="hub-update-stats">
      <div><span>Web / backend process age</span><strong>{observation.web_launcher.process_predates_checkout_commit === true ? "Older" : "Not proved"}
        {" / "}{observation.backend_launcher.process_predates_checkout_commit === true ? "Older" : "Not proved"}</strong></div>
      <div><span>Launcher chain</span><strong>{observation.web_launcher.chain_status} / {observation.backend_launcher.chain_status}</strong></div>
      <div><span>Recovery / startup task</span><strong>{observation.recovery_task_state} / {observation.startup_task_state}</strong></div>
    </div>}
    <div className="hub-update-stats">
      <div><span>Signed offline evidence</span><strong>{current ? "Authenticated observation candidate only" : "HOLD"}</strong></div>
      <div><span>Installed-release and launcher attestation</span><strong>NOT ATTESTED</strong></div>
      <div><span>Windows restart authorization</span><strong>HOLD — SUPERVISED ONLY</strong></div>
      <div><span>Private TEST challenge and receiver</span><strong>NOT EXECUTED / OFF / HOLD</strong></div>
    </div>
    <p><strong>Decision:</strong> ORIGINAL LAUNCHER AND TEST OWNER HOLD. A signed offline witness is not a live Comms challenge,
      does not grant owner consent, and never changes Windows processes or tasks.</p>
    <p><small>All JSON and signature checks remain local in this browser. Original issuer and challenge witness must use
      separate, previously authenticated signing authorities.</small></p>
  </section>;
}
