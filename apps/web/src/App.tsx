import { useEffect, useState } from "react";

import {
  getHealth,
  getOllamaStatus,
  type HealthResponse,
  type OllamaStatusResponse,
} from "./api";
import { ChatView } from "./ChatView";

type HealthState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline"; message: string };

type OllamaState =
  | { kind: "loading" }
  | { kind: "online"; data: OllamaStatusResponse }
  | { kind: "offline"; message: string };

const sections = ["Home", "Chat", "Knowledge", "Devices", "System"] as const;
type Section = (typeof sections)[number];

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });
  const [ollama, setOllama] = useState<OllamaState>({ kind: "loading" });
  const [section, setSection] = useState<Section>("Home");

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

    getOllamaStatus(controller.signal)
      .then((data) => {
        if (data.available) {
          setOllama({ kind: "online", data });
        } else {
          setOllama({ kind: "offline", message: data.message });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message = error instanceof Error ? error.message : "Ollama unavailable";
        setOllama({ kind: "offline", message });
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
            {sections.map((item) => (
              <li key={item}>
                <button
                  className={item === section ? "nav-item active" : "nav-item"}
                  type="button"
                  aria-current={item === section ? "page" : undefined}
                  onClick={() => setSection(item)}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main id="main-content" className="content" tabIndex={-1}>
        {section === "Chat" ? (
          <ChatView />
        ) : (
          <HomeView health={health} ollama={ollama} onOpenChat={() => setSection("Chat")} />
        )}
      </main>
    </div>
  );
}

function HomeView({
  health,
  ollama,
  onOpenChat,
}: {
  health: HealthState;
  ollama: OllamaState;
  onOpenChat: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 008</p>
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
          <h2>Local AI</h2>
          <OllamaHealth ollama={ollama} />
          <p>General, Coding, Home, Workshop, and Business profiles are available.</p>
          <button type="button" onClick={onOpenChat}>
            Open chat
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
    </>
  );
}

function OllamaHealth({ ollama }: { ollama: OllamaState }) {
  if (ollama.kind === "loading") {
    return <p className="runtime-status">Checking Ollama…</p>;
  }

  if (ollama.kind === "offline") {
    return (
      <div className="runtime-status" role="status">
        <strong>Ollama not detected</strong>
        <span>{ollama.message}</span>
        <small>Install or start Ollama to enable local AI.</small>
      </div>
    );
  }

  return (
    <div className="runtime-status" role="status">
      <strong>Ollama online</strong>
      <span>
        Version {ollama.data.version ?? "unknown"} · {ollama.data.model_count} local model
        {ollama.data.model_count === 1 ? "" : "s"}
      </span>
      {ollama.data.model_count === 0 ? (
        <small>Runtime is ready; no local models are installed yet.</small>
      ) : (
        <small>Local streaming chat is available.</small>
      )}
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
