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
    { id: "connection", title: "Comms integration", value: "Disconnected", source: "Security gate · not a live probe",
      detail: "QL-275 is Under Review; signed Proof-B and independent authorization are still unverified." },
    { id: "relay", title: "Private relay", value: "Not authorized", source: "Release policy · not a Windows process probe",
      detail: "This screen has not inspected or started the private relay." }
  ] as const;
}

/** Real System screen directory with trustworthy at-a-glance status provenance. */
export function SystemWorkspaceGuide({ backend, ollama, models, canAdminister }: {
  backend: Signal; ollama: Signal; models: number | null; canAdminister: boolean;
}) {
  const signals = summarizeSystemSignals(backend, ollama, models);
  return <section id="hub-system-overview" className="hub-system-guide" aria-label="Build 201 system overview and navigation">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Build 201 · System command view</p><h2>System at a glance</h2></div>
      <span className="hub-ql275-badge" aria-label="QL-275 project review status">QL-275 · Under Review</span>
    </div>
    <p>The first two readings come from existing APIs <strong>when this Hub session loads</strong>; they are not continuous monitoring. Connection and relay indicators describe <strong>access safeguards</strong>, not a scan of the Windows computer. A responding API never proves our cameras, devices or startup tasks work.</p>
    <div className="hub-system-source-grid">
      {signals.map(item => <article className="hub-system-source" key={item.id} aria-label={`${item.title} source status`}>
        <small>{item.title}</small><strong>{item.value}</strong>
        <span className="hub-system-source-origin">{item.source}</span><p>{item.detail}</p>
      </article>)}
    </div>
    <nav className="hub-system-jumps" aria-label="System page quick navigation">
      <a href="#hub-system-overview">Status overview</a>
      {canAdminister && <a href="#hub-system-owner-review">Theme owner review</a>}
      {canAdminister && <a href="#hub-system-diagnostics">Diagnostics</a>}
      {canAdminister && <a href="#hub-system-connection">I.T. &amp; connections</a>}
      <a href="#hub-system-remote">Remote access</a>
    </nav>
    <p className="hub-system-guide-note">These shortcuts move within this System page; they do not restart services, change roles or activate integration access.</p>
  </section>;
}
