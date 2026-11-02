/** Build 228: manual owner field observations, never a machine-health or CI feed. */
export const WINDOWS_FIELD_SCHEMA = "rosevear-hub-windows-field-228/v1" as const;

export const windowsFieldCases = [
  { id: "startup", area: "Startup", title: "Dependency-ordered Windows startup", section: "System", check: "Reboot under owner supervision; check backend, web, Ollama, MQTT, HA VM, Caddy and Tailscale in that order. Record partial starts rather than assuming all services recovered.", next: "Reproduce the first missing dependency and inspect its local startup log." },
  { id: "release", area: "Release", title: "Installed version and rollback identity", section: "System", check: "Compare the installed Hub/web/desktop versions and local adoption logs with the exact main release; verify that a previous version can be identified for manual rollback.", next: "Collect a redacted installed-version and adoption-log reference before proposing update or rollback." },
  { id: "ha", area: "Devices", title: "Home Assistant inventory reconciliation", section: "Devices", check: "Check a known HA entity on the installed PC, compare with the Hub inventory and identify missing, duplicate or stale identities. Do not actuate a device.", next: "Capture the mismatched device identity class and review the HA-to-Hub read-only mapping." },
  { id: "camera", area: "Cameras", title: "Representative supported camera and fallback", section: "Cameras", check: "Choose one camera with an authorized supported feed; inspect the permitted preview, failure state and masking. Record unsupported cameras honestly; do not extract cloud streams.", next: "Identify the provider and supported access boundary, then reproduce the safe playback/fallback failure." },
  { id: "mqtt", area: "MQTT", title: "MQTT session and X10 bridge boundaries", section: "MQTT", check: "Inspect read-only broker state and subscriptions; confirm there was no publish, X10 action or live rule activation.", next: "Inspect local MQTT session evidence and missing subscriptions without sending a test command." },
  { id: "theme", area: "Interface", title: "Standard theme on desktop and tablet", section: "System", check: "Review the real Home, Devices, Cameras, System, Management and I.T. screens for contrast, clipping, density and readable status labels.", next: "Record the affected screen and viewport for a Standard theme retest." },
  { id: "keyboard", area: "Accessibility", title: "Keyboard navigation and focus recovery", section: "System", check: "Use Tab, Shift+Tab, Enter and Escape on navigation, filters and dialogs; verify visible focus and return paths without a mouse.", next: "Record the exact focus sequence, screen and missing keyboard recovery." },
  { id: "roles", area: "Security", title: "Household read-only and owner role guards", section: "System", check: "Use properly authorized test sessions to confirm household users cannot access owner audit, secrets, restore or privileged operations.", next: "Escalate the failing role boundary for a deny-by-default retest; do not share credentials." },
  { id: "backup", area: "Recovery", title: "Encrypted backup and isolated restore rehearsal", section: "System", check: "Inspect local backup inventory, retention, off-machine copy and an independently reviewed restore result in disposable storage; never overwrite live data.", next: "Obtain a redacted archive-integrity and isolated-restore reference, then revisit recovery readiness." },
  { id: "rollback", area: "Recovery", title: "Manual rollback and safe-stop walkthrough", section: "System", check: "Walk through a failure/rollback plan with services stopped safely and live data preserved; document how to return to the prior version without performing production rollback.", next: "Clarify the safe-stop, rollback owner and missing previous-version artifact." },
  { id: "resources", area: "Performance", title: "Windows CPU, memory, disk and local AI budget", section: "System", check: "Read actual owner-observed CPU, memory, disk pressure and Ollama responsiveness during normal HA/camera use; distinguish not measured from normal.", next: "Capture repeatable local resource measurements and the contention scenario." },
] as const;

export type WindowsFieldCaseId = typeof windowsFieldCases[number]["id"];
export type WindowsFieldOutcome = "not_tested" | "pass" | "finding" | "blocked";
export type WindowsFieldBasis = "none" | "direct" | "local_log" | "supervised_retest";
export type WindowsFieldState = WindowsFieldOutcome | "needs_evidence";
export type WindowsFieldObservation = {
  outcome: WindowsFieldOutcome;
  basis: WindowsFieldBasis;
  reference: string;
  recordedAt: string;
};
export type WindowsFieldScope = { installedVersion: string; physicallyWitnessed: boolean };
export type WindowsFieldDraft = Partial<Record<WindowsFieldCaseId, WindowsFieldObservation>>;

const validOutcomes = new Set<WindowsFieldOutcome>(["not_tested", "pass", "finding", "blocked"]);
const validBases = new Set<WindowsFieldBasis>(["none", "direct", "local_log", "supervised_retest"]);

/** Metadata identifiers only: deliberately exclude URL, email, address and path punctuation. */
export function safeWindowsFieldReference(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}
export function safeWindowsInstalledVersion(value: string): string {
  return value.replace(/[^A-Za-z0-9._+ -]/g, "").slice(0, 60);
}

/** Parse untrusted draft entries defensively; never accept a claim of independent verification. */
export function normalizeWindowsObservation(input: unknown): WindowsFieldObservation {
  const row = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    outcome: validOutcomes.has(row.outcome as WindowsFieldOutcome) ? row.outcome as WindowsFieldOutcome : "not_tested",
    basis: validBases.has(row.basis as WindowsFieldBasis) ? row.basis as WindowsFieldBasis : "none",
    reference: typeof row.reference === "string" ? safeWindowsFieldReference(row.reference) : "",
    recordedAt: typeof row.recordedAt === "string" && !Number.isNaN(Date.parse(row.recordedAt))
      ? row.recordedAt : "",
  };
}

export function summarizeWindowsFieldReview(draft: WindowsFieldDraft, scope: WindowsFieldScope) {
  const scopeReady = scope.physicallyWitnessed && safeWindowsInstalledVersion(scope.installedVersion).trim().length >= 3;
  const rows = windowsFieldCases.map(test => {
    const entry = normalizeWindowsObservation(draft[test.id]);
    const evidenceReady = scopeReady && entry.basis !== "none" && entry.reference.length >= 4 && !!entry.recordedAt;
    const state: WindowsFieldState = entry.outcome === "pass" && !evidenceReady ? "needs_evidence" : entry.outcome;
    return { ...test, ...entry, state, evidenceReady };
  });
  const count = (state: string) => rows.filter(row => row.state === state).length;
  return {
    rows,
    ownerReportedPasses: count("pass"), findings: count("finding"), blocked: count("blocked"),
    needsEvidence: count("needs_evidence"), notTested: count("not_tested"),
    fullyOwnerReported: rows.every(row => row.state === "pass"),
    // A complete owner checklist is not an independent device or release certification.
    independentlyVerified: false as const,
    sourceCiGreen: "NOT_ASSESSED_HERE" as const,
    liveDeviceAcceptance: "OWNER_REPORTED_ONLY" as const,
    vault: "SECURITY_HOLD" as const,
    sixAppIntegration: "DISCONNECTED / HOLD" as const,
    privateRelay: "OFF" as const,
    ql275: "UNDER_REVIEW_DEFERRED" as const,
  };
}

export function windowsFieldRoadmap(draft: WindowsFieldDraft, scope: WindowsFieldScope):
  { id: string; state: WindowsFieldState; title: string; action: string }[] {
  const summary = summarizeWindowsFieldReview(draft, scope);
  const followups = summary.rows
    .filter(row => row.state === "blocked" || row.state === "finding" || row.state === "needs_evidence")
    .sort((a, b) => (a.state === "blocked" ? 0 : a.state === "finding" ? 1 : 2) -
      (b.state === "blocked" ? 0 : b.state === "finding" ? 1 : 2));
  return followups.length
    ? followups.map(row => ({ id: row.id, state: row.state, title: row.title, action: row.next }))
    : [{ id: "baseline", state: "not_tested", title: "Gather real Windows owner evidence", action: "Complete the installed-PC walkthrough before creating the next repair batch. Source CI alone is insufficient." }];
}

export function formatWindowsFieldHandoff(draft: WindowsFieldDraft, scope: WindowsFieldScope): string {
  const summary = summarizeWindowsFieldReview(draft, scope);
  return [
    "Rosevear AI Hub — Build 228 owner field regression handoff",
    `Schema: ${WINDOWS_FIELD_SCHEMA}`,
    "OWNER REPORTED ONLY — not a verified installation, CI result or independent reviewer approval.",
    `Installed version (owner-entered): ${safeWindowsInstalledVersion(scope.installedVersion).trim() || "NOT RECORDED"}`,
    `Physical Windows witness attested: ${scope.physicallyWitnessed ? "YES (owner-reported)" : "NO"}`,
    `Pass: ${summary.ownerReportedPasses}; finding: ${summary.findings}; blocked: ${summary.blocked}; evidence incomplete: ${summary.needsEvidence}; not tested: ${summary.notTested}`,
    ...summary.rows.map(row => `${row.area} / ${row.title}: ${row.state.toUpperCase()} | ${row.basis} | ${row.reference || "no local reference"} | ${row.recordedAt || "not recorded"}`),
    "Next roadmap (candidate only; no automatic build authorization):",
    ...windowsFieldRoadmap(draft, scope).map((row, i) => `${i + 1}. ${row.title}: ${row.action}`),
    "Six-app integration: DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review / Deferred; vault SECURITY HOLD.",
    "Never include credentials, URLs, local addresses, camera imagery or personal data in this handoff.",
  ].join("\n");
}
