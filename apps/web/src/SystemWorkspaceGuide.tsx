type Signal = "loading" | "online" | "offline";

/** Only distinguish live API responses from static safety policy; never invent machine telemetry. */
export function summarizeSystemSignals(backend: Signal, ollama: Signal, models: number | null) {
  return [
    {
      id: "backend", title: "Hub backend",
      value: backend === "loading" ? "Checking" : backend === "online" ? "Responding" : "Unavailable",
      source: "Session load · Hub health API",
      detail: backend === "online" ? "API replied; Windows startup and devices need separate checks."
        : backend === "loading" ? "Waiting for the health response." : "Health request failed; inspect recovery diagnostics."
    },
    {
      id: "ollama", title: "Local AI",
      value: ollama === "loading" ? "Checking" : ollama === "online" ? "Responding" : "Unavailable",
      source: "Session load · Ollama status API",
      detail: ollama === "online" ? `Status API replied${models !== null ? `; ${models} model(s) reported` : ""}. Chat readiness is separate.`
        : ollama === "loading" ? "Waiting for Ollama's response." : "AI status request failed; inspect the local service."
    },
    { id: "connection", title: "Comms integration", value: "Disconnected / HOLD", source: "Security gate · not a live probe",
      detail: "Actual authenticated source/owner approval and a live signed receipt are required before claiming a connection. Older QL-275 worksheets are historical reference, not today's activation decision." },
    { id: "relay", title: "Private relay", value: "Not authorized", source: "Release policy · not a Windows process probe",
      detail: "This screen has not inspected or started the private relay." }
  ] as const;
}

/** Real System screen directory with trustworthy at-a-glance status provenance. */
export function SystemWorkspaceGuide({ backend, ollama, models, canAdminister }: {
  backend: Signal; ollama: Signal; models: number | null; canAdminister: boolean;
}) {
  const signals = summarizeSystemSignals(backend, ollama, models);
  return <section id="hub-system-overview" className="hub-system-guide" aria-label="System source status and navigation">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Source-labelled system guide</p><h2>System at a glance</h2></div>
      <span className="hub-ql275-badge" aria-label="Current Comms activation status">Comms · DISCONNECTED / HOLD</span>
    </div>
    <p>The first two readings come from existing APIs <strong>when this Hub session loads</strong>; they are not continuous monitoring. Connection and relay indicators describe <strong>access safeguards</strong>, not a scan of the Windows computer. A responding API never proves our cameras, devices or startup tasks work.</p>
    <div className="hub-system-source-grid">
      {signals.map(item => {
        const destination = item.id === "backend" || item.id === "ollama"
          ? { href: "#hub-system-diagnostics", label: `Open ${item.title} diagnostics` }
          : { href: "#hub-system-connection", label: `Open ${item.title} safeguards` };
        return <article className="hub-system-source" key={item.id} aria-label={`${item.title} source status`}>
          <small>{item.title}</small><strong>{item.value}</strong>
          <span className="hub-system-source-origin">{item.source}</span>
          <details className="hub-system-source-detail">
            <summary>Meaning and next step</summary>
            <p>{item.detail}</p>
            {canAdminister
              ? <a href={destination.href}>{destination.label}</a>
              : <p>Detailed administrative checks are available to authorized owners or administrators.</p>}
          </details>
        </article>;
      })}
    </div>
    <section className="hub-system-current-gates" aria-label="Current checks and historical reviews">
      <h3>What still needs verification?</h3>
      <ul>
        <li><strong>Source release:</strong> confirm the current protected GitHub <code>main</code> checks; a green release does not mean it was installed on the Windows host.</li>
        <li><strong>Actual Windows installation:</strong> verify the installed version, original process identity, startup/recovery task and backup or VM state before changing the real machine.</li>
        <li><strong>Comms activation:</strong> keep the connection on HOLD until real authenticated owner approval and signed connection evidence exist.</li>
      </ul>
      <p><strong>Historical reference only:</strong> QL-275 review tracking and older Windows appearance/restart worksheets do not block ordinary navigation or the current application release. Reuse their safety steps only when actually performing the corresponding Windows change.</p>
    </section>
    <nav className="hub-system-jumps" aria-label="System page quick navigation">
      <a href="#hub-system-overview">Status overview</a>
      {canAdminister && <a href="#hub-theme-screen-review">Theme owner review</a>}
      {canAdminister && <a href="#hub-system-diagnostics">Diagnostics</a>}
      {canAdminister && <a href="#hub-system-connection">I.T. &amp; connections</a>}
      <a href="#hub-system-remote">Remote access</a>
    </nav>
    <p className="hub-system-guide-note">These shortcuts move within this System page; they do not restart services, change roles or activate integration access.</p>
  </section>;
}
