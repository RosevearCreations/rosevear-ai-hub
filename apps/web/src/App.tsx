import { useEffect, useState } from "react";

import {
  getAuthStatus,
  HUB_AUTH_REQUIRED_EVENT,
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
import { CardHelp, CommandPalette, type ShellDensity, type ShellTheme } from "./CommandShell";
import { StandardThemeAcceptancePanel } from "./StandardThemeAcceptancePanel";
import { SystemWorkspaceGuide } from "./SystemWorkspaceGuide";
import { SystemConsoleRefresh } from "./SystemConsoleRefresh";
import { GlobalSearchHelp } from "./GlobalSearchHelp";
import { OwnerPreferencesPanel } from "./OwnerPreferencesPanel";
import { HubNavIcon } from "./HubNavIcon";
import { BusinessView } from "./BusinessView";
import { ChatView } from "./ChatView";
import { ConfirmationsView } from "./ConfirmationsView";
import { HomeAssistantView } from "./HomeAssistantView";
import { KnowledgeView } from "./KnowledgeView";
import { WorkshopView } from "./WorkshopView";
import { LocalDiagnosticsPanel } from "./LocalDiagnosticsPanel";
import { PostRebootAcceptancePanel } from "./PostRebootAcceptancePanel";
import { StartupRecoveryConsole } from "./StartupRecoveryConsole";
import { FieldRecoverySummaryPanel } from "./FieldRecoverySummaryPanel";
import { OwnerFieldTrialWorkbench } from "./OwnerFieldTrialWorkbench";
import { VaultArchitectureView } from "./VaultArchitectureView";
import { IntegrationHealthPanel } from "./IntegrationHealthPanel";
import { RestartAppsPanel } from "./RestartAppsPanel";
import { SectionHelp } from "./HelpSystem";
import { MQTTView } from "./MQTTView";
import { PwaInstallPanel } from "./PwaInstallPanel";
import { RemoteAccessPanel } from "./RemoteAccessPanel";
import { ResourceBudgetPanel } from "./ResourceBudgetPanel";
import { LocalModelHealthPanel } from "./LocalModelHealthPanel";
import { NotificationsView } from "./NotificationsView";
import { OperationsDashboard } from "./OperationsDashboard";
import { ReleaseAcceptancePanel } from "./ReleaseAcceptancePanel";
import { ReleaseObservabilityPanel } from "./ReleaseObservabilityPanel";
import { InstalledHubAdoptionPanel } from "./InstalledHubAdoptionPanel";
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
  "Vault",
  "Devices",
  "Cameras",
  "Business",
  "MQTT",
  "Notifications",
  "Search & Help",
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });
  const [ollama, setOllama] = useState<OllamaState>({ kind: "loading" });
  const [section, setSection] = useState<Section>("Home");
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("");
  const [hubVersion, setHubVersion] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [density, setDensity] = useState<ShellDensity>("comfortable");
  const [appearance, setAppearance] = useState<ShellTheme>("standard");

  useEffect(() => setMobileMenuOpen(false), [section]);

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

  // An authenticated API can reject a stale session after a backend restart,
  // cookie-origin change, revocation or expiry. Leave the broken application
  // sections and show a clear sign-in path, without changing server data.
  useEffect(() => {
    const onExpired = () => {
      setSessionExpired(true);
      setAuth({
        kind: "ready",
        status: { bootstrap_required: false, authenticated: false, user: null },
      });
      setSection("Home");
      setCommandOpen(false);
    };
    window.addEventListener(HUB_AUTH_REQUIRED_EVENT, onExpired);
    return () => window.removeEventListener(HUB_AUTH_REQUIRED_EVENT, onExpired);
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
          <RestartAppsPanel />
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
          sessionNotice={sessionExpired
            ? "Your Hub session was not accepted. Sign in again to restore protected features. Your saved data has not been changed."
            : undefined}
          status={auth.status}
          onAuthenticated={(user) => {
            setSessionExpired(false);
            setAuth({
              kind: "ready",
              status: { bootstrap_required: false, authenticated: true, user },
            });
          }}
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
      setCommandOpen(false);
      setMobileMenuOpen(false);
      setDensity("comfortable");
      setAppearance("standard");
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
    <div className="app-shell" data-density={density} data-theme={appearance}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="hub-topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">R</span>
          <div>
            <strong>Rosevear AI Hub</strong>
            <small>Home, AI &amp; operations centre</small>
          </div>
        </div>
        <div className="hub-topbar-detail" aria-label="Hub safeguards">
          <span className="hub-topbar-chip"><span className="hub-chip-dot" /> Local-first</span>
          <span className="hub-topbar-chip hub-topbar-held">Comms integration · HOLD</span>
          <span className="hub-topbar-chip">Private relay · OFF</span>
        </div>
        <nav className="hub-topnav" aria-label="Command shortcuts">
          {(["Home", "Devices", "Cameras", "Business", "System"] as const).map(target =>
            <button type="button" key={target} aria-label={`Jump to ${target} workspace`}
              aria-current={section === target ? "page" : undefined}
              className={section === target ? "hub-topnav-active" : undefined}
              onClick={() => { setSection(target); setKnowledgeQuestion(""); }}>
              <HubNavIcon section={target} /><span>{target}</span>
            </button>)}
        </nav>
        <div className="hub-topbar-account"><span><strong>{user.username}</strong> · {roleLabel(user)}</span>
          <button type="button" onClick={() => void signOut()}>Sign out</button></div>
      </header>
      <aside className="sidebar">
        <div className="sidebar-topline">
          <strong className="hub-nav-caption">Workspaces</strong>
          <button className="mobile-nav-toggle" type="button" aria-controls="hub-primary-nav"
            aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}>
            {mobileMenuOpen ? "Close menu" : "Open menu"}
          </button>
        </div>

        <nav id="hub-primary-nav" aria-label="Primary navigation" className={mobileMenuOpen ? "nav-expanded" : ""}>
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
                    setMobileMenuOpen(false);
                  }}
                >
                  <HubNavIcon section={item} /><span>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shell-utilities">
          <button className="shell-find-button" type="button" onClick={() => setCommandOpen(true)}>
            Find screen <kbd>Ctrl K</kbd>
          </button>
          <fieldset className="shell-preferences">
            <legend>Interface density</legend>
            {(["comfortable", "compact"] as const).map(value => (
              <button type="button" key={value} aria-pressed={density === value}
                onClick={() => setDensity(value)}>{value === "comfortable" ? "Comfortable" : "Compact"}</button>
            ))}
          </fieldset>
          <fieldset className="shell-preferences">
            <legend>Display contrast</legend>
            {(["standard", "high-contrast"] as const).map(value => (
              <button type="button" key={value} aria-pressed={appearance === value}
                onClick={() => setAppearance(value)}>{value === "standard" ? "Standard" : "High contrast"}</button>
            ))}
          </fieldset>
          <CardHelp title="Interface controls">Density and contrast change this session's display. Owners can save named display views in System. Find screen navigates among already-authorized modules; it cannot execute devices or search private data.</CardHelp>
        </div>

        <PwaInstallPanel />
        <p className="hub-sidebar-note">Workspace settings are local to this session. No system connection starts from navigation.</p>
      </aside>

      <main id="main-content" className="content" tabIndex={-1}>
        <div className="shell-breadcrumb" aria-label="Current workspace">
          <span>Rosevear AI Hub</span><span aria-hidden="true">/</span><strong>{section}</strong>
          <button type="button" onClick={() => setCommandOpen(true)}>Jump to another screen</button>
        </div>
        <div className="hub-hero" aria-label="Rosevear AI Hub workspace banner">
          <p className="eyebrow">Rosevear operations / {section}</p>
          <strong>Our private command centre</strong>
          <p>One place for our home, AI, cameras, workshop and connected businesses.</p>
          <span className="hub-hero-guard">Source connections: DISCONNECTED / HOLD</span>
        </div>
        <SectionHelp section={section} />
        {section === "System" && <header className="page-header">
          <div>
            <p className="eyebrow">{hubVersion ? `Version ${hubVersion}` : "System"}</p>
            <h1>System</h1>
            <p className="lede">Local health and secure tailnet access.</p>
          </div>
          <SystemHealth health={health} />
        </header>}
        {section === "System" && <HubVitalCards health={health} ollama={ollama} />}
        {section === "System" && <SystemWorkspaceGuide backend={health.kind} ollama={ollama.kind}
          models={ollama.kind === "online" ? ollama.data.model_count : null} canAdminister={canAdminister} />}
        {section === "System" && canAdminister && <SystemConsoleRefresh onNavigate={(target) => setSection(target as Section)} />}
        {/* Keep the supervised trial mounted while reviewing linked modules; it only stores session data and never polls. */}
        {canAdminister && <div id="hub-system-owner-review" hidden={section !== "System"}>
          <OwnerFieldTrialWorkbench active={section === "System"} onNavigate={(target) => setSection(target as Section)} />
        </div>}
        {/* Keep the owner visual findings mounted while opening each real destination screen. */}
        {canAdminister && <div hidden={section !== "System"}>
          <StandardThemeAcceptancePanel role={user.role as "owner" | "administrator"}
            appearance={appearance} density={density} onNavigate={target => setSection(target)} />
        </div>}
        {section === "Search & Help" ? (
          <GlobalSearchHelp allowedSections={sections} canAdminister={canAdminister}
            onNavigate={target => setSection(target as Section)} />
        ) : section === "Chat" ? (
          <ChatView onAskWithCitations={(question) => {
            setKnowledgeQuestion(question);
            setSection("Knowledge");
          }} />
        ) : section === "Knowledge" ? (
          <KnowledgeView currentUser={user} initialQuestion={knowledgeQuestion} />
        ) : section === "Vault" ? (
          <VaultArchitectureView />
        ) : section === "Workshop" ? (
          <WorkshopView role={user.role} />
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
            {canAdminister && <div id="hub-system-diagnostics"><LocalDiagnosticsPanel onNavigate={(target) => setSection(target as Section)} /></div>}
            {canAdminister && <PostRebootAcceptancePanel onNavigate={(target) => setSection(target as Section)} />}
            {canAdminister && <StartupRecoveryConsole onNavigate={(target) => setSection(target as Section)} />}
            {canAdminister && <FieldRecoverySummaryPanel onNavigate={(target) => setSection(target as Section)} />}
            {canAdminister && <div id="hub-system-release"><ReleaseAcceptancePanel onNavigate={(target) => setSection(target as Section)} /></div>}
            {canAdminister && <ReleaseObservabilityPanel />}
            {canAdminister && <InstalledHubAdoptionPanel />}
            {canAdminister && <div id="hub-system-connection"><IntegrationHealthPanel /></div>}
            {canAdminister && <RestartAppsPanel />}
            <div id="hub-system-remote"><RemoteAccessPanel /></div>
            {canAdminister && <div id="hub-system-resources"><ResourceBudgetPanel /><LocalModelHealthPanel /></div>}
            {canAdminister && <OwnerPreferencesPanel ownerId={user.id} density={density} theme={appearance}
              onApply={(view) => { setDensity(view.density); setAppearance(view.theme); setSection(view.startSection); }} />}
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
      <CommandPalette open={commandOpen} current={section} sections={sections}
        onOpen={() => setCommandOpen(true)} onClose={() => setCommandOpen(false)}
        onChoose={(target) => { setKnowledgeQuestion(""); setSection(target as Section); setMobileMenuOpen(false); }} />
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

      <HubVitalCards health={health} ollama={ollama} />

      <OperationsDashboard role={role} onNavigate={onNavigate} />
      <section className="dashboard-grid" aria-label="Local AI and knowledge shortcuts">
        <article className="panel">
          <CardHelp title="Local AI status">Ollama is a local model service. An available API reading does not prove any Windows startup task or model inference succeeded.</CardHelp>
          <h2>Local AI</h2>
          <OllamaHealth ollama={ollama} />
          <p>Local chat uses the configured models and profiles.</p>
          <button type="button" onClick={onOpenChat}>Open chat</button>
        </article>
        <article className="panel">
          <CardHelp title="Knowledge collections">Open Knowledge to search our local collections and inspect citations. This navigation does not upload files or use external providers.</CardHelp>
          <h2>Knowledge</h2>
          <p>Explore local collections and grounded sources.</p>
          <button type="button" onClick={onOpenKnowledge}>Open knowledge</button>
        </article>
      </section>
    </>
  );
}

function HubVitalCards({ health, ollama }: { health: HealthState; ollama: OllamaState }) {
  const backend = health.kind === "loading" ? "Checking" : health.kind === "online" ? "Online" : "Offline";
  const localAi = ollama.kind === "loading" ? "Checking" : ollama.kind === "online" ? "Available" : "Not detected";
  return <section className="hub-vital-grid" aria-label="Rosevear AI Hub source status cards">
    <article className="hub-vital hub-vital-cyan"><span className="hub-vital-mark">01</span><div><small>Local backend</small><strong>{backend}</strong><span>Live Hub health check</span></div></article>
    <article className="hub-vital hub-vital-purple"><span className="hub-vital-mark">02</span><div><small>Local AI</small><strong>{localAi}</strong><span>Ollama service status</span></div></article>
    <article className="hub-vital hub-vital-amber"><span className="hub-vital-mark">03</span><div><small>Comms connection</small><strong>HOLD</strong><span>Independent proof pending</span></div></article>
    <article className="hub-vital hub-vital-green"><span className="hub-vital-mark">04</span><div><small>Private relay</small><strong>OFF</strong><span>Installation not authorized</span></div></article>
  </section>;
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
