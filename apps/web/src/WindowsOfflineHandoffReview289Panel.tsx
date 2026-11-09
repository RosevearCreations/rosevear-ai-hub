import { useRef, useState } from "react";

import {
  MAX_OFFLINE_HANDOFF_BYTES_289, reviewOfflineWindowsHandoff289,
  type OfflineHandoffReview289,
} from "./windowsOfflineHandoffReview289";

/** The file never leaves the browser. This screen does not verify a signer, issuer or device. */
export function WindowsOfflineHandoffReview289Panel() {
  const [result, setResult] = useState<OfflineHandoffReview289 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Choose a previously downloaded Build 288 JSON request to review locally.");
  const generation = useRef(0);

  async function inspect(file: File | undefined) {
    const current = ++generation.current;
    setResult(null);
    if (!file) { setBusy(false); setMessage("No file selected."); return; }
    if (file.size > MAX_OFFLINE_HANDOFF_BYTES_289) {
      setBusy(false); setMessage("File rejected: exceeds the 16 KB offline safety limit."); return;
    }
    setBusy(true); setMessage("Checking local JSON format and SHA-256 integrity…");
    try {
      const text = await file.text();
      const review = await reviewOfflineWindowsHandoff289(text, Date.now());
      if (current !== generation.current) return;
      setResult(review);
      setMessage(review.state === "REJECTED" ?
        `Request rejected (${review.reason}). No handoff evidence accepted.` :
        "SHA-256 matches the downloaded content. This is not proof of source, signature or owner identity.");
    } catch {
      if (current === generation.current) setMessage("File could not be reviewed locally. No evidence accepted.");
    } finally { if (current === generation.current) setBusy(false); }
  }

  function clear() {
    generation.current++;
    setResult(null); setBusy(false);
    setMessage("Local review cleared. No file was uploaded or stored by this screen.");
  }

  return <section className="panel" aria-labelledby="windows-offline-289-title">
    <p className="eyebrow">Build 289 · Offline evidence integrity and custody review</p>
    <h3 id="windows-offline-289-title">Check a downloaded handoff</h3>
    <p>Choose the unsigned JSON downloaded from Build 288. This screen checks its approved field shape,
      read-only Master Shell HOLD mapping and SHA-256 integrity <strong>on this device only</strong>.
      The file is not uploaded, saved, signed or published.</p>
    <label htmlFor="windows-offline-289-file">Unsigned Build 288 request JSON (maximum 16 KB)</label>
    <input id="windows-offline-289-file" type="file" accept=".json,application/json"
      aria-label="Select downloaded unsigned Windows request JSON" disabled={busy}
      onChange={event => { void inspect(event.target.files?.[0]); event.target.value = ""; }} />
    <button type="button" onClick={clear}>Clear local review</button>
    <p role="status">{message}</p>
    {result?.state === "DIGEST_MATCH_UNVERIFIED" && <div>
      <p><strong>Integrity only: digest matched; source not verified.</strong></p>
      <dl>
        <dt>SHA-256</dt><dd><code>{result.digest}</code></dd>
        <dt>Owner-reported outcome</dt><dd>{result.ownerOutcome.replaceAll("_", " ")}</dd>
        <dt>Inspector sample</dt><dd>{result.sampleAt}</dd>
        <dt>Updater / checkout candidates</dt>
        <dd><code>{result.releaseCandidate ?? "missing"}</code> / <code>{result.checkoutCandidate ?? "missing"}</code></dd>
        <dt>Drift note</dt><dd>{result.driftAcknowledged ? "Owner-reported acknowledgement, not approval" : "No drift reported"}</dd>
      </dl>
      {result.olderThanFiveMinutes && <p role="alert">This observation is older than five minutes.
        It cannot be used as current installed-host evidence; take a fresh observation on Ree's Windows machine.</p>}
      <p>Next custody steps: independently inspect the original host, identify the approved issuer key,
        secure an independent witness and signed owner consent, then verify a signed receipt using the approved
        contract before any source registry or Master Shell intake. None of those steps is completed here.</p>
    </div>}
    <p><strong>Master Shell and Windows trust: HOLD.</strong> Even a matching digest does not verify a signature,
      signer authorization, original computer, witness, or connection to AI Data Platform.</p>
  </section>;
}
