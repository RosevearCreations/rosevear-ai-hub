import { useState } from "react";
import {
  parseChain257, parseIssuer257, parseReceiverOff257, reviewChain257,
  type WindowsChain257, type IssuerProcessReceipt257, type ReceiverOffReceipt257,
} from "./processChain257";

type Result = Awaited<ReturnType<typeof reviewChain257>>;

export function ProcessChain257Panel({expectedSha, trustedIssuerKey}: {
  expectedSha: string; trustedIssuerKey: string | null;
}) {
  const [chain, setChain] = useState<WindowsChain257 | null>(null);
  const [issuer, setIssuer] = useState<IssuerProcessReceipt257 | null>(null);
  const [receiver, setReceiver] = useState<ReceiverOffReceipt257 | null>(null);
  const [receiverPin, setReceiverPin] = useState("");
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<{
    chain: WindowsChain257 | null; issuer: IssuerProcessReceipt257 | null; receiver: ReceiverOffReceipt257 | null;
    expected: string; trusted: string | null; pin: string; result: Result;
  } | null>(null);
  const pin = receiverPin.trim().toLowerCase();
  const candidate = Boolean(verification && verification.chain === chain && verification.issuer === issuer
    && verification.receiver === receiver && verification.expected === expectedSha
    && verification.trusted === trustedIssuerKey && verification.pin === pin
    && verification.result.state === "DUAL_SIGNED_WINDOWS_CHAIN_CANDIDATE_ONLY"
    && Date.now() - Date.parse(chain?.observed_at ?? "") >= 0
    && Date.now() - Date.parse(chain?.observed_at ?? "") <= 24 * 3600 * 1000);

  async function read<T>(file: File | undefined, parse: (text: string) => T, set: (x: T) => void) {
    setError(""); setVerification(null);
    if (!file) return;
    if (file.size > 8192) { setError("Evidence exceeds 8 KB."); return; }
    try { set(parse(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Windows process-chain evidence."); }
  }

  async function verify() {
    if (!chain || !issuer || !receiver || !trustedIssuerKey) return;
    const result = await reviewChain257(chain, issuer, receiver, trustedIssuerKey, pin, expectedSha, new Date().toISOString());
    setVerification({chain, issuer, receiver, expected: expectedSha, trusted: trustedIssuerKey, pin, result});
  }

  return <section aria-label="Build 257 independent Windows process-chain and receiver-OFF review">
    <h4>Build 257 — Process-chain evidence and independent receiver-OFF review</h4>
    <p>On the original Windows Hub, run <code>.\scripts\inspect-hub-chain-257.ps1</code> after updating the checkout.
      It only reads process ancestry and local source hashes, and never exports command lines or paths.
      The corrected recovery-task classification uses Windows-appropriate case-insensitive path comparison.</p>
    <label>Original Windows process-chain observation (JSON, max 8 KB)
      <input type="file" accept=".json,application/json" onChange={e => {
        setChain(null); void read(e.target.files?.[0], parseChain257, setChain);
      }} />
    </label>
    <label>Original issuer's separately signed release/observation digest (JSON, max 8 KB)
      <input type="file" accept=".json,application/json" onChange={e => {
        setIssuer(null); void read(e.target.files?.[0], parseIssuer257, setIssuer);
      }} />
    </label>
    <label>Independent receiver-OFF signed witness receipt (JSON, max 8 KB)
      <input type="file" accept=".json,application/json" onChange={e => {
        setReceiver(null); void read(e.target.files?.[0], parseReceiverOff257, setReceiver);
      }} />
    </label>
    <label>Receiver-OFF witness public-key SHA-256 fingerprint, authenticated out of band
      <input aria-label="Build 257 receiver witness fingerprint" maxLength={64} spellCheck={false}
        placeholder="64 lowercase hexadecimal characters" value={receiverPin}
        onChange={e => { setReceiverPin(e.target.value); setVerification(null); }} />
    </label>
    <button type="button" disabled={!chain || !issuer || !receiver || !trustedIssuerKey || pin.length !== 64}
      onClick={() => void verify()}>Verify both signed evidence candidates locally</button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Original issuer / receiver-OFF signatures</span><strong>{candidate ? "Dual signed candidate" : "HOLD"}</strong></div>
      <div><span>Installed release/process attestation</span><strong>NOT ATTESTED</strong></div>
      <div><span>Comms TEST receiver</span><strong>OFF / HOLD</strong></div>
      <div><span>Network/device actions</span><strong>NONE</strong></div>
    </div>
    <p><strong>Decision:</strong> INDEPENDENT RECEIVER OFF — OWNER HOLD</p>
    <ul>
      <li>A checkout path in a command line or process ancestry is a source clue, never a verified running-release identity.</li>
      <li>Original issuer and independent receiver signer identities must be authenticated by separate custodians.</li>
      <li>Receiver enrollment, dual-owner consent, network handshake and operational activation remain unapproved.</li>
    </ul>
    <p><small>All JSON remains in this browser. Verification cannot start a relay, sign an original issuer's evidence,
      change scheduled tasks, restart services, dispatch messages or certify a production installation.</small></p>
  </section>;
}
