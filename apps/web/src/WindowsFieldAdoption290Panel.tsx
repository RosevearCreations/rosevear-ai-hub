import { useEffect, useMemo, useRef, useState } from "react";

import {
  getHealth, getHubVersion, getWindowsLauncherEvidence286, getWindowsRuntimeEvidence285,
  type HubVersionResponse, type ReleaseObservabilityResponse,
} from "./api";
import { browserBuild } from "./installedHubAdoption";
import { reviewWindowsLauncherEvidence, type LauncherReview } from "./windowsLauncherEvidence286";
import { reviewWindowsRuntimeEvidence, type WindowsEvidenceReview } from "./windowsRuntimeEvidence285";
import { assessWindowsFieldAdoption290, SIGNED_RECEIPT_GATES_290 } from "./windowsFieldAdoption290";
import { WindowsRecoveryDecision291Panel } from "./WindowsRecoveryDecision291Panel";

type Adoption = { backend: HubVersionResponse | null; local: ReleaseObservabilityResponse | null;
  checkedAtMs: number } | null;

/** A guided read-only cross-check; no GitHub lookup or Windows service/device action. */
export function WindowsFieldAdoption290Panel({ expectedMainSha, mainRunUrl, adoption }: {
  expectedMainSha: string; mainRunUrl: string; adoption: Adoption;
}) {
  const [runtime, setRuntime] = useState<WindowsEvidenceReview | null>(null);
  const [launcher, setLauncher] = useState<LauncherReview | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("No Windows runtime/launcher cross-check in this session.");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  // Changing the source claim or the Build 113 readback invalidates the comparison.
  useEffect(() => {
    request.current?.abort(); request.current = null;
    setRuntime(null); setLauncher(null); setBusy(false); setNowMs(Date.now());
    setNotice("Source reference or installed snapshot changed. Take a new read-only cross-check.");
  }, [expectedMainSha, mainRunUrl, adoption]);

  // Freshness expires locally; no background request or silent revalidation.
  useEffect(() => {
    const stamps = [adoption?.checkedAtMs, runtime?.sampledAtMs, launcher?.sampledAtMs]
      .filter((value): value is number => typeof value === "number" && Number.isSafeInteger(value));
    if (stamps.length === 0) return;
    const expiry = Math.min(...stamps) + 5 * 60_000 + 1;
    if (expiry <= Date.now()) return;
    const timer = window.setTimeout(() => setNowMs(Date.now()), expiry - Date.now());
    return () => window.clearTimeout(timer);
  }, [adoption?.checkedAtMs, runtime?.sampledAtMs, launcher?.sampledAtMs]);

  const review = useMemo(() => assessWindowsFieldAdoption290({
    expectedMainSha, mainRunUrl, web: browserBuild, adoption, runtime, launcher, nowMs,
  }), [expectedMainSha, mainRunUrl, adoption, runtime, launcher, nowMs]);

  async function crossCheck() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setRuntime(null); setLauncher(null); setBusy(true);
    setNotice("Reading the responding Windows runtime and local launcher candidates…");
    const [rawRuntime, version, health, rawLauncher] = await Promise.allSettled([
      getWindowsRuntimeEvidence285(controller.signal), getHubVersion(controller.signal),
      getHealth(controller.signal), getWindowsLauncherEvidence286(controller.signal),
    ]);
    if (request.current !== controller || controller.signal.aborted) return;
    const now = Date.now();
    setNowMs(now);
    setRuntime(rawRuntime.status === "fulfilled" && version.status === "fulfilled" && health.status === "fulfilled" ?
      reviewWindowsRuntimeEvidence(rawRuntime.value, version.value, health.value, now) : null);
    setLauncher(rawLauncher.status === "fulfilled" ? reviewWindowsLauncherEvidence(rawLauncher.value, now) : null);
    setNotice("Read-only local comparison finished. Every reported candidate remains unverified until original-host proof is independently accepted.");
    setBusy(false);
  }

  return <section className="panel" aria-labelledby="windows-field-290-title">
    <p className="eyebrow">Build 290 · Original Windows field adoption walkthrough</p>
    <h3 id="windows-field-290-title">Is our Windows installation reporting the same release?</h3>
    <p>Compare the owner-entered production SHA with five separately observed source candidates.
      Matching SHAs are helpful for troubleshooting, but they do <strong>not</strong> prove which executable
      is running, which computer responded or whether a signature is valid.</p>
    <ol aria-label="Guided Windows field adoption steps">
      <li>In Build 113 above, enter the exact successful <code>main</code> commit and its production Actions run. Verify them on GitHub yourself.</li>
      <li>Select <strong>Check installed Hub evidence</strong> above to sample the updater record and backend package version.</li>
      <li>Select <strong>Cross-check Windows release candidates</strong> below to read existing Build 285/286 evidence without changing services.</li>
      <li>Review the comparison, then physically inspect Ree's original Windows server, startup task, and installed app. Record self-review in <a href="#windows-owner-287-title">Build 287</a>.</li>
      <li>If the source is still uncertain, use the <a href="#windows-offline-289-title">Build 288/289 offline request review</a>; obtain separate approved signer, witness and owner consent before any trust decision.</li>
    </ol>
    <button type="button" disabled={busy} onClick={() => void crossCheck()}>
      {busy ? "Reading local candidates…" : "Cross-check Windows release candidates (read-only)"}
    </button>
    <p role="status">{notice}</p>
    <p><strong>Candidate disposition: {review.disposition.replaceAll("_", " ").toLowerCase()}.</strong>
      {` ${review.matchCount} of 5 SHA candidates match the owner-entered reference; no candidate is independently attested.`}</p>
    <table>
      <caption>Source-to-Windows candidate comparison, not proof of running code</caption>
      <thead><tr><th scope="col">Source</th><th scope="col">Reported SHA candidate</th><th scope="col">Comparison</th></tr></thead>
      <tbody>{review.axes.map(axis => <tr key={axis.id}>
        <th scope="row">{axis.label}</th>
        <td>{axis.sha ? <code>{axis.sha.slice(0, 12)}…</code> : "Not available"}</td>
        <td>{axis.state.replaceAll("_", " ").toLowerCase()}</td>
      </tr>)}</tbody>
    </table>
    <p>Responding backend package: <strong>{review.backendVersion ?? "unavailable"}</strong>;
      package cross-check: <strong>{review.backendVersionState.replaceAll("_", " ").toLowerCase()}</strong>.
      A package version is never a Git commit identity.</p>
    <p>Windows runtime: {review.runtimeState.replaceAll("_", " ").toLowerCase()};
      launcher comparison: {review.launcherState.replaceAll("_", " ").toLowerCase()}.</p>
    <details><summary>Show release/installation blockers and safe next actions</summary>
      <ul>{review.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>
      <p>If candidates disagree, inspect the installed updater journal and the original startup task locally.
        Use only the existing owner-supervised recovery or rollback procedure after an explicit decision.</p>
    </details>
    <h4>Signed-receipt verification prerequisites</h4>
    <p><strong>0 of 7 independently verified here.</strong> The following steps require an authorized original-host issuer and separate evidence; an owner checkbox or matching SHA cannot satisfy them.</p>
    <ol aria-label="Independent signed receipt verification prerequisites">
      {SIGNED_RECEIPT_GATES_290.map(gate => <li key={gate}>{gate} — <strong>HOLD</strong></li>)}
    </ol>
    <p><strong>Installed release, signed receipt and Master Shell: HOLD.</strong> No machine identity,
      signer enrollment, independent witness, signed owner consent, webhook transmission,
      device commands, restart or remote repair is performed by this panel.</p>
    <WindowsRecoveryDecision291Panel
      key={expectedMainSha + ":" + mainRunUrl + ":" + (adoption?.checkedAtMs ?? "none")}
      review={review} expectedMainSha={expectedMainSha}
      getCurrentReview={() => assessWindowsFieldAdoption290({
        expectedMainSha, mainRunUrl, web: browserBuild, adoption, runtime, launcher,
        nowMs: Date.now(),
      })}
    />
  </section>;
}
