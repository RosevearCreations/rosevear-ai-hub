import { useEffect, useState } from "react";
import { parseSignedRelease250, recoveryDecision250, verifySignedRelease250, type SignedInstalledRelease250 } from "./signedRelease250";

export function SignedRelease250Panel({expectedSha, recoveryAction}: {expectedSha: string; recoveryAction: string | null}) {
  const [receipt, setReceipt] = useState<SignedInstalledRelease250 | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [signatureState, setSignatureState] = useState("NOT_VERIFIED");
  const [choice, setChoice] = useState<"hold" | "inspect" | "supervised_recovery_review">("hold");
  useEffect(() => { setSignatureState("NOT_VERIFIED"); }, [expectedSha]);
  const decision = recoveryDecision250(recoveryAction, choice);

  async function importFile(file?: File) {
    setReceipt(null); setError(""); setSignatureState("NOT_VERIFIED"); setChoice("hold");
    if (!file) return;
    if (file.size > 8192) { setError("Receipt exceeds 8 KB."); return; }
    try { setReceipt(parseSignedRelease250(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid receipt."); }
  }
  async function verify() {
    if (!receipt) return;
    try { const result = await verifySignedRelease250(receipt, pin.trim().toLowerCase(), expectedSha.trim().toLowerCase(), new Date().toISOString());
      setSignatureState(result.state); }
    catch { setSignatureState("SIGNATURE_OR_CUSTODY_HOLD"); }
  }
  return <section className="hub-process-248" aria-label="Build 250 signed installed release provenance and recovery decision">
    <h3>Build 250 — Signed installed-release receipt &amp; custody</h3>
    <p>Import an independently issued Ed25519 signed receipt. The signature covers the exact release SHA, artifact SHA-256 and observation timestamp. We must obtain the signer public-key fingerprint separately from a trusted custodian; do not trust a fingerprint supplied in the same file.</p>
    <label>Signed release JSON (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => void importFile(event.target.files?.[0])} />
    </label>
    <label>Independently authenticated signer-key SHA-256 fingerprint
      <input aria-label="Trusted signer fingerprint" value={pin} maxLength={64} spellCheck={false}
        onChange={event => {setPin(event.target.value); setSignatureState("NOT_VERIFIED");}} placeholder="64 lowercase hexadecimal characters" />
    </label>
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={!receipt || pin.length !== 64} onClick={() => void verify()}>Verify detached signature locally</button>
    <p><strong>Signature and custody:</strong> {signatureState.replaceAll("_", " ")}</p>
    <p><strong>Recovery task action:</strong> {decision.decision.replaceAll("_", " ")}</p>
    <label>Owner-supervised next decision (review only)
      <select value={choice} onChange={event => setChoice(event.target.value as typeof choice)}>
        <option value="hold">Keep on HOLD</option>
        <option value="inspect">Review original Windows logs and task action</option>
        <option value="supervised_recovery_review">Prepare supervised recovery decision — no execution</option>
      </select>
    </label>
    <p><small>Signature verification is mathematical only; no signed receipt has been automatically issued. No Windows process, scheduled task, backup or database is changed. Release activation and post-reboot closure remain unverified until independently witnessed on the actual machine.</small></p>
  </section>;
}
