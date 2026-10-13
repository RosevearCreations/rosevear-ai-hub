import { useEffect, useState } from "react";

type Domain = "Home" | "Workshop" | "Business";
type AcceptanceItem = { id: string; title: string; evidence: string; section: string };
export const acceptanceChecks: Record<Domain, AcceptanceItem[]> = {
  Home: [
    { id: "home-api", title: "Hub and local AI respond", evidence: "Check System diagnostics and use one harmless Chat prompt.", section: "Chat" },
    { id: "home-devices", title: "Home Assistant and MQTT are classified correctly", evidence: "Inspect current status; unavailable, unconfigured and healthy must be distinct. No real device control.", section: "Devices" },
    { id: "home-cameras", title: "Camera monitoring remains safe", evidence: "Inspect registered cameras. Frigate is optional; do not change streams or secrets.", section: "Cameras" },
  ],
  Workshop: [
    { id: "workshop-knowledge", title: "Knowledge uses current evidence", evidence: "Search one local collection; change the query and verify old citations are hidden.", section: "Knowledge" },
    { id: "workshop-register", title: "Equipment readiness is visible", evidence: "Review an existing workstation and hazard notices; do not operate any equipment.", section: "Workshop" },
    { id: "workshop-conversation", title: "Chat-to-Knowledge handoff is manual", evidence: "Draft a question in Chat, hand it off and confirm Search never runs on its own.", section: "Chat" },
  ],
  Business: [
    { id: "business-connectors", title: "Multi-business connector states are clear", evidence: "Inspect each available business independently; no client records are written.", section: "Business" },
    { id: "business-knowledge", title: "Projects keep their own sources", evidence: "Select a project and review citations; no automated publication.", section: "Knowledge" },
    { id: "business-notifications", title: "Notifications are reviewable", evidence: "Inspect existing alerts only; do not send test marketing messages.", section: "Notifications" },
  ],
};

const storageKey = "rosevear-ai-hub-build-060-local-acceptance";
const allowed = new Set(Object.values(acceptanceChecks).flat().map((item) => item.id));

export function sanitizeAcceptance(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && allowed.has(item));
}

function readChecks(): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? sanitizeAcceptance(JSON.parse(raw)) : [];
  } catch { return []; }
}

export function ReleaseAcceptancePanel({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [domain, setDomain] = useState<Domain>("Home");
  const [completed, setCompleted] = useState<string[]>(readChecks);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(completed)); }
    catch { /* private mode: the checklist still works in memory */ }
  }, [completed]);

  const total = allowed.size;
  const exportReport = async () => {
    const lines = [
      "Rosevear AI Hub — Build 060 local operator acceptance",
      "Browser-only observations; not CI, deployment or automatic machine verification.",
      `Checklist confirmations: ${completed.length}/${total}`,
      ...Object.values(acceptanceChecks).flat().map((item) =>
        `[${completed.includes(item.id) ? "checked" : "not checked"}] ${item.title}`),
      "Windows release evidence: inspect logs/hub-release-adoption.json and logs/hub-release-adoption.log locally.",
      "No passwords, personal data or private network details included.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setNotice("Metadata-only checklist copied. Add your own timestamp when recording an operator review.");
    } catch {
      setNotice("Clipboard unavailable. Checklist remains in this browser only.");
    }
  };
  return (
    <section className="panel release-acceptance" aria-label="Build 060 release acceptance">
      <h2>Build 060 — Release adoption &amp; acceptance</h2>
      <p>GitHub GREEN confirms code checks, not an installed Windows release. The optional hourly updater
        requires a one-time Windows installation and only adopts verified, migration-free releases.</p>
      <p>Local update evidence: <code>logs\hub-release-adoption.json</code> and
        <code> logs\hub-release-adoption.log</code>. If an update is held or fails, read these logs and
        open Service diagnostics below. No secrets or remote PC access are required.</p>
      <div className="operations-contexts" role="group" aria-label="Acceptance area">
        {(["Home", "Workshop", "Business"] as const).map((item) => (
          <button type="button" key={item} aria-pressed={domain === item}
            onClick={() => setDomain(item)}>{item}</button>
        ))}
      </div>
      <p role="status">{completed.length} of {total} owner checks marked. These marks are not live service measurements.</p>
      <div className="release-check-list">
        {acceptanceChecks[domain].map((item) => (
          <article key={item.id} className="release-check">
            <label>
              <input type="checkbox" checked={completed.includes(item.id)}
                onChange={(event) => setCompleted((previous) =>
                  event.target.checked ? [...previous.filter((key) => key !== item.id), item.id]
                    : previous.filter((key) => key !== item.id))} />
              <strong>{item.title}</strong>
            </label>
            <p>{item.evidence}</p>
            <button type="button" onClick={() => onNavigate(item.section)}>Open {item.section}</button>
          </article>
        ))}
      </div>
      <div className="release-actions">
        <button type="button" onClick={() => void exportReport()}>Copy acceptance summary</button>
        <button type="button" onClick={() => {
          setCompleted([]);
          setNotice("Local checklist reset; no server or device settings changed.");
        }}>Reset local marks</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <p><small>Marks are stored only in this browser for Build 060; they are not an audit log,
        a backup validation, or proof that the scheduled updater is installed.</small></p>
    </section>
  );
}
