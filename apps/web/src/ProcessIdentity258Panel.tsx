import { useState } from "react";
import {
  parseIdentity258, parseIssuer258, parseReceiverOff258, reviewIdentity258,
  type InstalledIdentity258, type IssuerReceipt258, type ReceiverOff258,
} from "./processIdentity258";

type Review = Awaited<ReturnType<typeof reviewIdentity258>>;

export function ProcessIdentity258Panel({expectedSha, trustedOriginalKey}: {
  expectedSha: string; trustedOriginalKey: string | null;
}) {
  const [observation, setObservation] = useState<InstalledIdentity258 | null>(null);
  const [issuer, setIssuer] = useState<IssuerReceipt258 | null>(null);
  const [receiver, setReceiver] = useState<ReceiverOff258 | null>(null);
  const [receiverPin, setReceiverPin] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState<{
    observation: InstalledIdentity258; issuer: IssuerReceipt258; receiver: ReceiverOff258;
    originalKey: string; receiverPin: string; expected: string; result: Review;
  } | null>(null);
  const pin = receiverPin.trim().toLowerCase();
  const current = Boolean(review && review.observation === observation && review.issuer === issuer
    && review.receiver === receiver && review.originalKey === trustedOriginalKey
    && review.receiverPin === pin && review.expected === expectedSha
    && review.result.state === "SIGNED_OBSERVATION_RECEIPTS_ACCEPTED_OWNER_REVIEW_ONLY"
    && Date.now() - Date.parse(observation?.observed_at ?? "") >= 0
    && Date.now() - Date.parse(observation?.observed_at ?? "") <= 24 * 3600 * 1000);

  async function read<T>(file: File | undefined, parser: (content: string) => T, update: (value: T) => void) {
    setError(""); setReview(null);
    if (!file) return;
    if (file.size > 8192) { setError("Build 258 evidence exceeds 8 KB."); return; }
    try { update(parser(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Build 258 evidence."); }
  }

  async function verify() {
    if (!observation || !issuer || !receiver || !trustedOriginalKey || pin.length !== 64) return;
    const result = await reviewIdentity258(observation, issuer, receiver, trustedOriginalKey,
      pin, expectedSha, new Date().toISOString());
    setReview({observation, issuer, receiver, originalKey: trustedOriginalKey, receiverPin: pin,
      expected: expectedSha, result});
  }

  return <section aria-label="Build 258 Windows installed-source reconciliation and TEST preflight">
    <h4>Build 258 — Installed-source identity, signed receipts and controlled TEST preflight</h4>
    <p>After updating Ree's Windows checkout, run <code>powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-identity-258.ps1</code>.
      The observation differentiates a listening Node/Python service from a missing executable path.
      It does not restart services, enable scheduled tasks or claim to authenticate the running source.</p>
    <label>Original Windows read-only identity observation (JSON, max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => {
        setObservation(null); void read(event.target.files?.[0], parseIdentity258, setObservation);
      }} />
    </label>
    <label>Original issuer's externally signed Build 258 observation receipt
      <input type="file" accept=".json,application/json" onChange={event => {
        setIssuer(null); void read(event.target.files?.[0], parseIssuer258, setIssuer);
      }} />
    </label>
    <label>Independent receiver-OFF externally signed Build 258 receipt
      <input type="file" accept=".json,application/json" onChange={event => {
        setReceiver(null); void read(event.target.files?.[0], parseReceiverOff258, setReceiver);
      }} />
    </label>
    <label>Receiver-OFF signer fingerprint verified independently (SHA-256 hexadecimal)
      <input aria-label="Build 258 independent receiver fingerprint" maxLength={64} spellCheck={false}
        placeholder="64 lowercase hex characters" value={receiverPin}
        onChange={event => { setReceiverPin(event.target.value); setReview(null); }} />
    </label>
    <button type="button" disabled={!observation || !issuer || !receiver || !trustedOriginalKey || pin.length !== 64}
      onClick={() => void verify()}>Verify independently signed Build 258 receipts</button>
    {error && <p role="alert">{error}</p>}
    {observation && <div className="hub-update-stats">
      <div><span>Web listener / executable access</span><strong>{observation.web.listener} / {observation.web.executable_path_status}</strong></div>
      <div><span>Backend listener / executable access</span><strong>{observation.backend.listener} / {observation.backend.executable_path_status}</strong></div>
      <div><span>Recovery / startup tasks</span><strong>{observation.recovery_task_state} / {observation.startup_task_state}</strong></div>
      <div><span>Checkout candidate</span><strong>{observation.checkout_sha_candidate?.slice(0, 12) ?? "unknown"}</strong></div>
    </div>}
    <div className="hub-update-stats">
      <div><span>Independent receipt verification</span><strong>{current ? "Signed observations accepted for review only" : "HOLD"}</strong></div>
      <div><span>Installed release and running-process attestation</span><strong>NOT ATTESTED</strong></div>
      <div><span>Controlled Comms TEST</span><strong>OFF / HOLD — NOT AUTHORIZED</strong></div>
      <div><span>Network/device/customer actions</span><strong>NONE</strong></div>
    </div>
    <p><strong>Decision: CONTROLLED TEST PREFLIGHT HOLD.</strong> Even two valid signed observations cannot
      establish loaded-source identity, approve an owner decision or start the private receiver.</p>
    <p><small>All evidence is checked locally in this browser. Signature verification requires a previously trusted
      original-issuer public key and a separately authenticated receiver-OFF signer fingerprint.</small></p>
  </section>;
}
