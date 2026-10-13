import { useEffect, useState } from "react";

import {
  getAuthStatus,
  getHealth,
  getHubVersion,
  getOllamaStatus,
  logout,
  type AuthStatus,
  type AuthUser,
  type HealthResponse,
  type OllamaStatusResponse,
} from "./api";
import { AutomationView } from "./AutomationView";
import { AuditView } from "./AuditView";
import { AuthView } from "./AuthView";
import { CameraView } from "./CameraView";
import { BusinessView } from "./BusinessView";
import { ChatView } from "./ChatView";
import { ConfirmationsView } from "./ConfirmationsView";
import { HomeAssistantView } from "./HomeAssistantView";
import { KnowledgeView } from "./KnowledgeView";
import { WorkshopView } from "./WorkshopView";
import { LocalDiagnosticsPanel } from "./LocalDiagnosticsPanel";
import { SectionHelp } from "./HelpSystem";
import { MQTTView } from "./MQTTView";
import { PwaInstallPanel } from "./PwaInstallPanel";
import { RemoteAccessPanel } from "./RemoteAccessPanel";
import { ResourceBudgetPanel } from "./ResourceBudgetPanel";
import { NotificationsView } from "./NotificationsView";
import { OperationsDashboard } from "./OperationsDashboard";
import { ReleaseAcceptancePanel } from "./ReleaseAcceptancePanel";
import { SecretsView } from "./SecretsView";
import { ToolsView } from "./ToolsView";
import { UsersView } from "./UsersView";

type HealthState =
  | { kind: "loading" }
  | { kind: "online"; data: HealthResponse }
  | { kind: "offline"; message: string };

type OllamaState =
  | { kind: "loading" }
  | { kind: "online"; data: OllamaStatusResponse }
  | { kind: "offline"; message: string };

type AuthState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; status: AuthStatus };

const baseSections = [
  "Home",
  "Chat",
  "Knowledge",
  "Devices",
  "Cameras",
  "Business",
  "MQTT",
  "Notifications",
  "System",
] as const;
type Section =
  | (typeof baseSections)[number]
  | "Automations"
  | "Workshop"
  | "Users"
  | "Tools"
  | "Confirmations"
  | "Audit"
  | "Secrets";

export function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: "loading" });
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });
  const [ollama, setOllama] = useState<OllamaState>({ kind: "loading" });
  const [section, setSection] = useState<Section>("Home");
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("");
  const [hubVersion, setHubVersion] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAuthStatus(controller.signal)
      .then((status) => setAuth({ kind: "ready", status }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAuth({
          kind: "error",
          message: error instanceof Error ? error.message : "Backend unavailable",
        });
      });
    return () => controller.abort();
  }, []);

  const authenticatedUser =
    auth.kind === "ready" && auth.status.authenticated ? auth.status.user : null;

  useEffect(() => {
    if (!authenticatedUser) return;

    const controller = new AbortController();

    getHubVersion(controller.signal)
      .then((result) => setHubVersion(result.version))
      .catch(() => setHubVersion(null));

    getHealth(controller.signal)
      .then((data) => setHealth({ kind: "online", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth({
          kind: "offline",
          message: error instanceof Error ? error.message : "Backend unavailable",
        });
      });

    getOllamaStatus(controller.signal)
      .then((data) => {
        setOllama(
          data.available
            ? { kind: "online", data }
            : { kind: "offline", message: data.message },
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOllama({
          kind: "offline",
          message: error instanceof Error ? error.message : "Ollama unavailable",
        });
      });

    return () => controller.abort();
  }, [authenticatedUser]);

  if (auth.kind === "loading") {
    return (
      <main className="auth-shell">
        <section className="auth-card" role="status">
          <p className="eyebrow">Rosevear AI Hub</p>
          <h1>Checking local account…</h1>
        </section>
      </main>
    );
  }

  if (auth.kind === "error") {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Rosevear AI Hub</p>
          <h1>Backend unavailable</h1>
          <p className="auth-error">{auth.message}</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!auth.status.authenticated || !auth.status.user) {
    return (
      <AuthView
        status={auth.status}
        onAuthenticated={(user) =>
          setAuth({
            kind: "ready",
            status: { bootstrap_required: false, authenticated: true, user },
          })
        }
      />
    );
  }

  const user = auth.status.user;
  const canAdminister = user.role === "owner" || user.role === "administrator";
  const sections: Section[] = canAdminister
    ? [...baseSections, "Workshop", "Automations", "Confirmations", "Audit", "Secrets", "Tools", "Users"]
    : [...baseSections];

  async function signOut() {
    try {
      await logout();
    } finally {
      setSection("Home");
      setKnowledgeQuestion("");
      setHealth({ kind: "loading" });
      setOllama({ kind: "loading" });
      setAuth({
        kind: "ready",
        status: { bootstrap_required: false, authenticated: false, user: null },
      });
    }
  }

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
                  onClick={() => {
                    setKnowledgeQuestion("");
                    setSection(item);
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <PwaInstallPanel />
        <div className="account-card">
          <strong>{user.username}</strong>
          <small>{roleLabel(user)}</small>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main id="main-content" className="content" tabIndex={-1}>
        <SectionHelp section={section} />
        {section === "Chat" ? (
          <ChatView onAskWithCitations={(question) => {
            setKnowledgeQuestion(question);
            setSection("Knowledge");
          }} />
        ) : section === "Knowledge" ? (
          <KnowledgeView currentUser={user} initialQuestion={knowledgeQuestion} />
        ) : section === "Workshop" ? (
          <WorkshopView />
        ) : section === "Devices" ? (
          <HomeAssistantView currentUser={user} />
        ) : section === "Cameras" ? (
          <CameraView currentUser={user} />
        ) : section === "Business" ? (
          <BusinessView />
        ) : section === "MQTT" ? (
          <MQTTView currentUser={user} />
        ) : section === "Notifications" ? (
          <NotificationsView currentUser={user} />
        ) : section === "Automations" ? (
          <AutomationView />
        ) : section === "Confirmations" ? (
          <ConfirmationsView />
        ) : section === "Audit" ? (
          <AuditView />
        ) : section === "Secrets" ? (
          <SecretsView />
        ) : section === "Tools" ? (
          <ToolsView />
        ) : section === "Users" ? (
          <UsersView currentUser={user} />
        ) : section === "System" ? (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">{hubVersion ? `Version ${hubVersion}` : "System"}</p>
                <h1>System</h1>
                <p className="lede">Local health and secure tailnet access.</p>
              </div>
              <SystemHealth health={health} />
            </header>
            {canAdminister && <LocalDiagnosticsPanel onNavigate={(target) => setSection(target as Section)} />}
            {canAdminister && <ReleaseAcceptancePanel onNavigate={(target) => setSection(target as Section)} />}
            <RemoteAccessPanel />
            {canAdminister && <ResourceBudgetPanel />}
          </>
        ) : (
          <HomeView
            version={hubVersion}
            role={user.role}
            onNavigate={(target) => setSection(target as Section)}
            health={health}
            ollama={ollama}
            onOpenChat={() => setSection("Chat")}
            onOpenKnowledge={() => setSection("Knowledge")}
            onOpenDevices={() => setSection("Devices")}
            onOpenCameras={() => setSection("Cameras")}
            onOpenMQTT={() => setSection("MQTT")}
            onOpenNotifications={() => setSection("Notifications")}
          />
        )}
      </main>
    </div>
  );
}

function roleLabel(user: AuthUser): string {
  if (user.role === "owner") return "Owner";
  if (user.role === "administrator") return "Administrator";
  if (user.role === "household_user") return "Household user";
  return "Read only";
}

function HomeView({
  version,
  role,
  onNavigate,
  health,
  ollama,
  onOpenChat,
  onOpenKnowledge,
  onOpenDevices,
  onOpenCameras,
  onOpenMQTT,
  onOpenNotifications,
}: {
  version: string | null;
  role: AuthUser["role"];
  onNavigate: (target: string) => void;
  health: HealthState;
  ollama: OllamaState;
  onOpenChat: () => void;
  onOpenKnowledge: () => void;
  onOpenDevices: () => void;
  onOpenCameras: () => void;
  onOpenMQTT: () => void;
  onOpenNotifications: () => void;
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{version ? `Version ${version}` : "Rosevear AI Hub"}</p>
          <h1>Home</h1>
          <p className="lede">
            One private interface for AI, household systems, workshop knowledge,
            cameras, and business integrations.
          </p>
        </div>
        <SystemHealth health={health} />
      </header>

      <OperationsDashboard role={role} onNavigate={onNavigate} />
      <section className="dashboard-grid" aria-label="Local AI and knowledge shortcuts">
        <article className="panel">
          <h2>Local AI</h2>
          <OllamaHealth ollama={ollama} />
          <p>Local chat uses the configured models and profiles.</p>
          <button type="button" onClick={onOpenChat}>Open chat</button>
        </article>
        <article className="panel">
          <h2>Knowledge</h2>
          <p>Explore local collections and grounded sources.</p>
          <button type="button" onClick={onOpenKnowledge}>Open knowledge</button>
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
