import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { getHubVersion, getReleaseObservability, type HubVersionResponse, type ReleaseObservabilityResponse } from "./api";
import { assessInstalledHub, browserBuild, createInstalledHubReceipt, parsePrivateFieldHandoff, type PrivateFieldHandoff } from "./installedHubAdoption";

type Snapshot = { backend: HubVersionResponse | null; local: ReleaseObservabilityResponse | null };

export function InstalledHubAdoptionPanel() {
  const [mainSha, setMainSha] = useState("");
  const [runUrl, setRunUrl] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [field, setField] = useState<PrivateFieldHandoff | null>(null);
  const [ownerOpenedWindowsHub, setOwnerOpenedWindowsHub] = useState(false);
  const [ownerReloadedBrowser, setOwnerReloadedBrowser] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const input = useMemo(() => ({
    expectedMainSha: mainSha, mainRunUrl: runUrl, web: browserBuild,
    api: snapshot?.backend ?? null, local: snapshot?.local ?? null, field,
    ownerOpenedWindowsHub, ownerReloadedBrowser,
  }), [mainSha, runUrl, snapshot, field, ownerOpenedWindowsHub, ownerReloadedBrowser]);
  const review = useMemo(() => assessInstalledHub(input), [input]);

  async function checkInstallation() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setNotice("");
    // An earlier session's human marks cannot validate a new observation.
    setOwnerOpenedWindowsHub(false);
    setOwnerReloadedBrowser(false);
    setField(null);
    const [backend, local] = await Promise.allSettled([
      getHubVersion(controller.signal), getReleaseObservability(controller.signal),
    ]);
    if (controller.signal.aborted || request.current !== controller) return;
    setSnapshot({
      backend: backend.status === "fulfilled" ? backend.value : null,
      local: local.status === "fulfilled" ? local.value : null,
    });
    setNotice("Read-only local evidence checked. A response is not a verified running commit or device recovery.");
    setLoading(false);
  }

  async function importField(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setField(null);
    if (file.size > 1_000_000) {
      setNotice("Private field receipt exceeds the 1 MB limit.");
      return;
    }
    try {
      const extracted = parsePrivateFieldHandoff(await file.text());
      setField(extracted);
      setNotice("Build 112 private evidence adopted for this session. Only counts and lineage are retained; no device settings changed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to import private field evidence.");
    }
  }

  function downloadReport() {
    if (!snapshot) return;
    const evidence = createInstalledHubReceipt(input);
    const href = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2) + "\n"], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `rosevear-installed-hub-adoption-${evidence.generated_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setNotice("Private, metadata-only hold report downloaded. No server install, restart or camera verification was performed.");
  }

  return (
    <section className="panel installed-hub-adoption" aria-label="Build 113 installed Windows Hub version and field adoption">
      <h2>Build 113 — Installed Windows Hub version &amp; field adoption</h2>
      <p>GitHub GREEN is a source release; a downloaded Windows artifact is not an installed service. Compare the actual local updater pointer, backend package version and the source commit stamped into these browser assets.</p>
      <p>From the official <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/workflows/foundation.yml" target="_blank" rel="noreferrer">GitHub workflow history</a>, confirm a successful <code>main</code> push run. Enter that commit and the matching run URL below. These are <strong>owner-supplied references</strong>; the Hub does not query GitHub or verify signatures.</p>
      <div className="installed-adoption-fields">
        <label>Protected main commit (40 hexadecimal characters)
          <input aria-label="Expected main commit SHA" type="text" value={mainSha} maxLength={40} spellCheck={false}
            placeholder="Paste main commit SHA" onChange={(event) => { setMainSha(event.target.value); setOwnerOpenedWindowsHub(false); setOwnerReloadedBrowser(false); }} />
        </label>
        <label>Matching GitHub Actions run URL
          <input aria-label="Expected main GitHub Actions run" type="url" value={runUrl} spellCheck={false}
            placeholder="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/…"
            onChange={(event) => { setRunUrl(event.target.value); setOwnerOpenedWindowsHub(false); setOwnerReloadedBrowser(false); }} />
        </label>
      </div>
      <button type="button" onClick={() => void checkInstallation()} disabled={loading}>
        {loading ? "Reading local evidence…" : "Check installed Hub evidence"}
      </button>
      <dl className="installed-adoption-summary">
        <dt>Browser asset source</dt><dd>{browserBuild.sha ? <code>{browserBuild.sha}</code> : "Unavailable"} · {browserBuild.clean ? "Clean build" : "Unverified tracked changes or missing Git"}</dd>
        <dt>Local backend</dt><dd>{snapshot?.backend ? `Responding, package ${snapshot.backend.version}` : "Unknown until checked or unavailable"}</dd>
        <dt>Local active release pointer</dt><dd>{snapshot?.local?.active_release ? <code>{snapshot.local.active_release}</code> : "Not recorded or unreadable"}</dd>
        <dt>Updater state</dt><dd>{snapshot?.local?.adoption_state ?? "Unknown"}</dd>
        <dt>Browser version comparison</dt><dd>{review.web_status.replaceAll("_", " ")}</dd>
        <dt>Release pointer comparison</dt><dd>{review.recorded_release_status.replaceAll("_", " ")}</dd>
        <dt>Build 112 field handoff</dt><dd>{field ? `${field.unresolved_ha} unresolved HA, ${field.unresolved_camera} unresolved cameras; historical owner evidence only` : "Not imported"}</dd>
      </dl>
      <div className="installed-adoption-fields">
        <label>Optional private Build 112 drift handoff (.json, 1 MB max)
          <input aria-label="Choose Build 112 private field handoff" type="file" accept=".json,application/json" onChange={(event) => void importField(event)} />
        </label>
        <label className="installed-adoption-check">
          <input type="checkbox" checked={ownerOpenedWindowsHub} disabled={!snapshot}
            onChange={(event) => setOwnerOpenedWindowsHub(event.target.checked)} />
          I personally opened and inspected the installed Windows Hub during this review
        </label>
        <label className="installed-adoption-check">
          <input type="checkbox" checked={ownerReloadedBrowser} disabled={!snapshot}
            onChange={(event) => setOwnerReloadedBrowser(event.target.checked)} />
          I manually reloaded the installed browser/PWA and checked the current screen
        </label>
      </div>
      <p role="status"><strong>FIELD ADOPTION HOLD</strong> · {review.holds.length} outstanding evidence conditions. No combination of these checkboxes proves process identity or working cameras.</p>
      <details>
        <summary>Show evidence holds and next checks</summary>
        <ul>{review.holds.map((hold) => <li key={hold}>{hold}</li>)}</ul>
      </details>
      <div className="release-actions">
        <button type="button" disabled={!snapshot} onClick={downloadReport}>Download private adoption hold report</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <p><small>Read-only: no updater enrollment, GitHub request, service change, database restore, camera enrollment or stream access. For independent runtime/device acceptance use the actual Windows installation and supervised Home Assistant/camera checks.</small></p>
    </section>
  );
}
