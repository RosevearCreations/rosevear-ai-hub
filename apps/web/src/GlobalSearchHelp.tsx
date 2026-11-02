import { useEffect, useRef, useState } from "react";

import { getGlobalSearch, type GlobalSearchRecord } from "./api";
import { CardHelp } from "./CommandShell";

export const guidedHelp = [
  { id: "missing-device", title: "Home Assistant device missing from Hub", section: "Devices", tags: "missing device home assistant inventory reconcile", steps: ["Check the device in Home Assistant and note its exact name and integration.", "Open Devices and inspect the Hub reconciliation review and source timestamps.", "Review duplicate, filtered or stale identities before considering any manual changes."] },
  { id: "offline-camera", title: "Camera offline or not supported", section: "Cameras", tags: "camera blink littlelf nooie netvue skybell offline playback", steps: ["Confirm local power, permitted connection path and camera provider support.", "Open Cameras and review source-specific compatibility and last observed health.", "Do not paste credentials, scrape cloud streams or assume an unsupported feed is available."] },
  { id: "startup", title: "Windows Hub startup incomplete", section: "System", tags: "windows reboot caddy ollama mqtt startup tailscale recovery", steps: ["Check the Windows Rosevear AI Server Startup task and service dependencies.", "Open System diagnostics and compare observed states with expected startup order.", "Use the documented owner runbook to recover one service at a time; never infer readiness from green source CI."] },
  { id: "maintenance", title: "Workshop maintenance follow-up", section: "Workshop", tags: "workshop equipment maintenance service safety", steps: ["Open Workshop maintenance and review due dates and recorded inspection evidence.", "Confirm physical equipment is safe before using it.", "Update only the authorized manual maintenance action; the Hub does not operate machines."] },
] as const;

export function filterGuides(query: string, allowedSections: readonly string[]) {
  const needle = query.trim().toLocaleLowerCase();
  return guidedHelp.filter(guide => allowedSections.includes(guide.section) &&
    (!needle || `${guide.title} ${guide.tags}`.toLocaleLowerCase().includes(needle)));
}

/** Explicit owner search; guide search remains purely in memory. */
export function GlobalSearchHelp({ allowedSections, canAdminister, onNavigate }: {
  allowedSections: readonly string[]; canAdminister: boolean; onNavigate: (section: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<GlobalSearchRecord[] | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function searchRecords() {
    if (!canAdminister || query.trim().length < 2) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setRecords(null);
    setSearchedFor(query.trim());
    try {
      const response = await getGlobalSearch(query.trim(), controller.signal);
      if (request.current === controller) setRecords(response.results.filter(row => allowedSections.includes(row.section)));
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Record search unavailable.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  const guides = filterGuides(query, allowedSections);
  return (
    <section className="panel hub-search-help" aria-labelledby="hub-search-title">
      <header className="hub-search-header">
        <div><p className="eyebrow">Permission-aware navigation &amp; guided recovery</p><h1 id="hub-search-title">Search &amp; Help Centre</h1></div>
        <CardHelp title="Private search">Help and screen matches are local to this browser. Only owners and administrators may request saved Hub record matches. Searches do not access cloud services, run device probes or make changes.</CardHelp>
      </header>
      <label htmlFor="hub-global-search">Search help, authorized screens and saved records</label>
      <input id="hub-global-search" type="search" value={query} onChange={event => {
        request.current?.abort(); setQuery(event.target.value); setRecords(null); setError(""); setSearchedFor("");
      }} placeholder="Try missing device, camera, Windows startup…" autoComplete="off" />
      <div className="hub-search-section">
        <h2>Available screens</h2>
        <div className="hub-search-result-grid">
          {allowedSections.filter(section => section.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(section => (
            <button type="button" key={section} onClick={() => onNavigate(section)}><strong>{section}</strong><small>Authorized workspace · open screen</small></button>
          ))}
        </div>
      </div>
      <div className="hub-search-section">
        <h2>Guided troubleshooting</h2>
        {guides.length === 0 ? <p>No matching help article. Try a shorter term.</p> : (
          <div className="hub-search-result-grid">{guides.map(guide => (
            <article key={guide.id} className="hub-search-guide">
              <h3>{guide.title}</h3><small>Built-in owner runbook · not live telemetry</small>
              <ol>{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
              <button type="button" onClick={() => onNavigate(guide.section)}>Open {guide.section}</button>
            </article>
          ))}</div>
        )}
      </div>
      {canAdminister && <div className="hub-search-section">
        <h2>Saved Hub records</h2>
        <p>Only records already saved locally in this Hub. Request a search manually; results are not a live Home Assistant or camera scan.</p>
        <button type="button" disabled={loading || query.trim().length < 2} onClick={() => void searchRecords()}>
          {loading ? "Searching saved records…" : "Search saved Hub records"}
        </button>
        {error && <p role="alert">Record search unavailable: {error}</p>}
        {records && <div role="status" aria-live="polite">
          <p>{records.length} result(s) returned for “{searchedFor}”. Results reflect saved local records only.</p>
          <ul>{records.map((record, index) => <li key={`${record.kind}-${index}`}>
            <strong>{record.title}</strong> · {record.detail} <small>({record.source})</small>{" "}
            <button type="button" onClick={() => onNavigate(record.section)}>Open {record.section}</button>
          </li>)}</ul>
        </div>}
      </div>}
    </section>
  );
}
