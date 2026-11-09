import { useEffect, useState } from "react";

import type { LauncherReview } from "./windowsLauncherEvidence286";
import type { OwnerWindowsRecord } from "./windowsOwnerAcceptance287";
import { WindowsOfflineHandoffReview289Panel } from "./WindowsOfflineHandoffReview289Panel";
import {
  acknowledgeWindowsDrift288, acknowledgementMatches288, loadWindowsDriftAck288,
  prepareWindowsSigningRequest288, reviewWindowsDrift288,
  type WindowsSigningRequest288, type WindowsDriftAcknowledgement288,
} from "./windowsEvidenceHandoff288";

function localStorageOrNull(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; }
  catch { return null; }
}

/** Uses the current owner's Build 287 sample; never inspects, signs, or publishes on mount. */
export function WindowsEvidenceHandoff288Panel({ ownerId, records, review }: {
  ownerId: string; records: readonly OwnerWindowsRecord[]; review: LauncherReview | null;
}) {
  const [ack, setAck] = useState<WindowsDriftAcknowledgement288 | null>(() =>
    loadWindowsDriftAck288(localStorageOrNull(), ownerId));
  const [checked, setChecked] = useState(false);
  const [request, setRequest] = useState<WindowsSigningRequest288 | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("No signing request prepared in this session.");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // A changed owner observation or inspector sample invalidates the previous request preview.
  const referenceAtMs = records.at(-1)?.recordedAtMs ?? null;
  useEffect(() => {
    setRequest(null); setChecked(false); setAck(loadWindowsDriftAck288(localStorageOrNull(), ownerId));
    setNowMs(Date.now());
  }, [ownerId, referenceAtMs, review?.sampledAtMs]);
  useEffect(() => {
    if (review?.sampledAtMs === null || review?.sampledAtMs === undefined) return;
    const remaining = Math.max(0, review.sampledAtMs + 5 * 60_000 - Date.now());
    const timeout = window.setTimeout(() => { setNowMs(Date.now()); setRequest(null); }, remaining + 1);
    return () => window.clearTimeout(timeout);
  }, [review?.sampledAtMs]);

  const drift = reviewWindowsDrift288(records, review, nowMs);
  const acknowledged = acknowledgementMatches288(ack, records, review, nowMs);
  const readyForRequest = drift.state === "NO_DRIFT_OBSERVED_UNVERIFIED" ||
    (drift.state === "DRIFT_NEEDS_ACKNOWLEDGEMENT" && acknowledged);

  function acknowledge() {
    const result = acknowledgeWindowsDrift288(localStorageOrNull(), ownerId, records, review, checked, Date.now());
    setAck(result); setRequest(null); setChecked(false); setNowMs(Date.now());
    setNotice(result ?
      "Drift review noted in this browser. Changes are acknowledged, not approved or independently verified." :
      "No acknowledgement saved; refresh evidence and confirm the current changes first.");
  }

  async function prepare() {
    setBusy(true); setRequest(null);
    try {
      const result = await prepareWindowsSigningRequest288(records, review, ack, Date.now());
      setNowMs(Date.now()); setRequest(result);
      setNotice(result ?
        "Signing request prepared locally. It is unsigned, unpublished, and awaits approved original-host signing and independent witness review." :
        "Signing request held. Fresh owner evidence and explicit acknowledgement of any drift are required.");
    } catch {
      setNotice("Signing request unavailable. A secure SHA-256 digest could not be produced on this device.");
    } finally { setBusy(false); }
  }

  function download() {
    if (!request) return;
    const blob = new Blob([`${JSON.stringify(request, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "rosevear-ai-hub-windows-signing-request-288.json";
      anchor.click();
      setNotice("Offline request offered for download. No signed receipt or Master Shell publication was created.");
    } finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
  }

  return <><section className="panel" aria-labelledby="windows-handoff-288-title">
    <p className="eyebrow">Build 288 · Windows evidence handoff and Master Shell alignment</p>
    <h3 id="windows-handoff-288-title">Prepare a signed-evidence handoff</h3>
    <p>The current Build 287 owner observation is the source for this <strong>offline signing request</strong>. A SHA-256 digest can bind its sanitized fields, but a digest is <strong>not a signature</strong>. No private signing key is handled by this browser.</p>
    <p>Review readiness: <strong>{drift.state.replaceAll("_", " ").toLowerCase()}</strong>.</p>
    {drift.changes.length > 0 && <ul aria-label="Drift requiring owner acknowledgement">
      {drift.changes.map(code => <li key={code}>{code.replaceAll("_", " ").toLowerCase()}</li>)}
    </ul>}
    {drift.state === "DRIFT_NEEDS_ACKNOWLEDGEMENT" && <fieldset>
      <legend>Explicit device drift acknowledgement</legend>
      <label><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /> We reviewed the displayed differences on the intended Windows host; this note does not authorize deployment or approve the changed launcher.</label>
      <div className="hub-connection-actions">
        <button type="button" disabled={!checked} onClick={acknowledge}>Record browser-local drift acknowledgement</button>
      </div>
      {acknowledged && <p><strong>Acknowledged locally</strong> for this sample; still unverified.</p>}
    </fieldset>}
    <button type="button" disabled={!readyForRequest || busy} onClick={() => void prepare()}>
      {busy ? "Preparing secure local digest…" : "Prepare offline signing request"}
    </button>
    <p role="status">{notice}</p>
    {request && <>
      <p>Request digest (SHA-256): <code>{request.contentSha256}</code></p>
      <p><strong>Signing state: Awaiting approved signer and independent witness.</strong> This JSON is not a signed receipt, proof of machine origin, or valid Master Shell V1 event.</p>
      <button type="button" onClick={download}>Download unsigned signing request JSON</button>
      <details><summary>Review read-only Master Shell V1 mapping</summary>
        <p>Aligned to AI Data Platform Builds 335/337: source and shell ID, nullable tenant, audit evidence family, held state and AI Data Platform audience. All issuer, event, replay, webhook receipt and acceptance requirements remain unmet.</p>
        <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {JSON.stringify(request.masterShellContract, null, 2)}
        </pre>
      </details>
    </>}
    <p><strong>Master Shell: HOLD.</strong> No network publishing, device restart, provider enrollment, signature verification, trusted source promotion or cross-application routing is performed.</p>
  </section><WindowsOfflineHandoffReview289Panel key={ownerId} /></>;
}
