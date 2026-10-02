import { useEffect, useState } from "react";

import { getHealth, type HealthResponse } from "./api";

type HealthState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline"; message: string };

const sections = ["Home", "Chat", "Knowledge", "Devices", "System"] as const;

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then((data) => setHealth({ kind: "online", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message = error instanceof Error ? error.message : "Backend unavailable";
        setHealth({ kind: "offline", message });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <div>
            <strong>Rosevear AI Hub</strong>
            <small>Local-first control centre</small>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <ul>
            {sections.map((section, index) => (
              <li key={section}>
                <button
                  className={index === 0 ? "nav-item active" : "nav-item"}
                  type="button"
                  aria-current={index === 0 ? "page" : undefined}
                >
                  {section}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main id="main-content" className="content" tabIndex={-1}>
        <header className="page-header">
          <div>
            <p className="eyebrow">Build 004</p>
            <h1>Home</h1>
            <p className="lede">
              One private interface for AI, household systems, workshop knowledge,
              cameras, and business integrations.
            </p>
          </div>
          <SystemHealth health={health} />
        </header>

        <section className="dashboard-grid" aria-label="Hub overview">
          <article className="panel">
            <h2>Assistant</h2>
            <p>Local AI chat arrives in Builds 006–010.</p>
            <button type="button" disabled>
              Start chat
            </button>
          </article>

          <article className="panel">
            <h2>Knowledge</h2>
            <p>Private document indexing and cited answers arrive in Builds 011–015.</p>
          </article>

          <article className="panel">
            <h2>Home &amp; Workshop</h2>
            <p>Home Assistant and MQTT controls arrive in Builds 021–025.</p>
          </article>

          <article className="panel">
            <h2>Cameras</h2>
            <p>ONVIF, RTSP, and optional Frigate support arrive in Builds 031–035.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

function SystemHealth({ health }: { health: HealthState }) {
  if (health.kind === "loading") {
    return (
      <div className="health-card" role="status" aria-live="polite">
        <span className="status-dot pending" aria-hidden="true" />
        Checking backend…
      </div>
    );
  }

  if (health.kind === "offline") {
    return (
      <div className="health-card" role="status" aria-live="polite">
        <span className="status-dot offline" aria-hidden="true" />
        <span>
          Backend offline
          <small>{health.message}</small>
        </span>
      </div>
    );
  }

  return (
    <div className="health-card" role="status" aria-live="polite">
      <span className="status-dot online" aria-hidden="true" />
      <span>
        Backend online
        <small>{health.data.environment}</small>
      </span>
    </div>
  );
}
