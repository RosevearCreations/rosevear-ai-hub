/** Build 236: owner-entered installed-Windows appearance review. Never a device probe or repair grant. */
import type { ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";

export const appearance236Cases = [
  { id: "signin", title: "Signed-out and loading screens", section: "Home", check: "On the installed Windows Hub, inspect sign-in, loading and unavailable-backend states for unexpected white glare and readable messages." },
  { id: "signout", title: "Dark Mode retained after sign-out", section: "Home", check: "With Dark Mode selected, sign out and return to the local sign-in screen. Confirm the low-glare choice survives without exposing a protected screen." },
  { id: "selector", title: "Top-bar and sidebar theme selection", section: "Home", check: "Switch between Dark Mode, Standard and High contrast; check synchronized selected states and return to Dark Mode before recording." },
  { id: "contrast", title: "Navigation, hero and status contrast", section: "System", check: "Read the header, sidebar, hero, HOLD labels and current workspace in Dark Mode. Look for bright flashes, clipping and unreadable text." },
  { id: "narrow", title: "Narrow-width and tablet navigation", section: "Home", check: "On an actual Windows browser at a tablet or narrow viewport, open and close navigation and use the appearance selector without horizontal clipping." },
  { id: "keyboard", title: "Keyboard focus and 200% zoom", section: "System", check: "Use Tab, Shift+Tab, Enter and the screen finder at 200% zoom. Verify visible focus, keyboard reachability and recovery." },
  { id: "persistence", title: "Reload and saved appearance consistency", section: "System", check: "Choose Dark Mode, reload the installed client and confirm the selected theme survives. Review an owner saved view if available." },
] as const;

export type Appearance236Id = typeof appearance236Cases[number]["id"];
export type Appearance236Outcome = "not_tested" | "pass" | "finding" | "blocked";
export type Appearance236Viewport = "unselected" | "windows_desktop" | "windows_tablet" | "narrow_window";
export type Appearance236Symptom = "none" | "glare" | "contrast" | "clipping" | "keyboard" | "persistence" | "other";
export type Appearance236Followup = "pending" | "request_retest" | "defer" | "request_review";
export type Appearance236Scope = { installedVersion: string; ownerWitnessed: boolean };
export type Appearance236Entry = {
  outcome: Appearance236Outcome;
  viewport: Appearance236Viewport;
  reference: string;
  symptom: Appearance236Symptom;
  observedAt: string;
  observedKey: string;
  followup: Appearance236Followup;
  followupReference: string;
  followupAttested: boolean;
  followupAt: string;
  followupKey: string;
};
export type Appearance236Draft = Partial<Record<Appearance236Id, Appearance236Entry>>;

export const defaultAppearance236Entry: Appearance236Entry = {
  outcome: "not_tested", viewport: "unselected", reference: "", symptom: "none",
  observedAt: "", observedKey: "", followup: "pending", followupReference: "",
  followupAttested: false, followupAt: "", followupKey: "",
};

export type Appearance236Gate = "not_tested" | "dark_inactive" | "scope_gap" | "viewport_gap" |
  "evidence_gap" | "duplicate_reference" | "symptom_gap" | "observation_stale" |
  "owner_pass" | "open_finding" | "followup_gap" | "followup_consent_gap" |
  "followup_stale" | "retest_requested" | "owner_deferred" | "review_requested";

export const appearance236GateLabels: Record<Appearance236Gate, string> = {
  not_tested: "Not tested on installed Windows",
  dark_inactive: "Switch to Dark Mode before recording",
  scope_gap: "Installed version and witnessed Windows check required",
  viewport_gap: "Record the actual viewport context",
  evidence_gap: "Enter a safe local reference (4+ characters)",
  duplicate_reference: "Evidence reference reused; enter a unique code",
  symptom_gap: "Classify the observed finding or blocker",
  observation_stale: "Record a fresh observation for these exact inputs",
  owner_pass: "Owner-reported pass only — not independently verified",
  open_finding: "Observed issue remains open — choose a safe follow-up",
  followup_gap: "Choose a follow-up and new distinct evidence reference",
  followup_consent_gap: "Separate owner follow-up acknowledgment required",
  followup_stale: "Record a fresh owner follow-up for the unchanged finding",
  retest_requested: "Owner requested a retest; issue remains open",
  owner_deferred: "Owner deferred; issue remains open",
  review_requested: "Review requested only; no repair authorized",
};

export function appearance236ObservationKey(id: Appearance236Id, theme: ShellTheme,
  scope: Appearance236Scope, entry: Appearance236Entry): string {
  return JSON.stringify({ id, theme, installedVersion: safeWindowsInstalledVersion(scope.installedVersion),
    witnessed: scope.ownerWitnessed, viewport: entry.viewport, outcome: entry.outcome,
    reference: entry.reference, symptom: entry.symptom });
}

export function appearance236FollowupKey(entry: Appearance236Entry): string {
  return JSON.stringify({ observedKey: entry.observedKey, observedAt: entry.observedAt,
    followup: entry.followup, reference: entry.followupReference,
    attested: entry.followupAttested });
}

export function summarizeAppearance236(theme: ShellTheme, scope: Appearance236Scope,
  draft: Appearance236Draft) {
  const references = Object.values(draft).map(entry => entry?.reference).filter(Boolean);
  const unique = new Set(references);
  const rows = appearance236Cases.map(test => {
    const entry = draft[test.id] ?? defaultAppearance236Entry;
    const observationKey = appearance236ObservationKey(test.id, theme, scope, entry);
    const scopeReady = scope.ownerWitnessed && safeWindowsInstalledVersion(scope.installedVersion).trim().length >= 3;
    const validReference = entry.reference.length >= 4 && safeWindowsFieldReference(entry.reference) === entry.reference;
    const distinctFollowup = entry.followupReference.length >= 4 &&
      safeWindowsFieldReference(entry.followupReference) === entry.followupReference &&
      entry.followupReference !== entry.reference && !references.includes(entry.followupReference);
    const observedFresh = !!entry.observedAt && Number.isFinite(Date.parse(entry.observedAt)) &&
      entry.observedKey === observationKey;
    let gate: Appearance236Gate;
    if (entry.outcome === "not_tested") gate = "not_tested";
    else if (theme !== "dark") gate = "dark_inactive";
    else if (!scopeReady) gate = "scope_gap";
    else if (entry.viewport === "unselected") gate = "viewport_gap";
    else if (test.id === "narrow" && entry.viewport === "windows_desktop") gate = "viewport_gap";
    else if (!validReference) gate = "evidence_gap";
    else if (references.length !== unique.size && references.filter(ref => ref === entry.reference).length > 1) gate = "duplicate_reference";
    else if (entry.outcome !== "pass" && entry.symptom === "none") gate = "symptom_gap";
    else if (!observedFresh) gate = "observation_stale";
    else if (entry.outcome === "pass") gate = "owner_pass";
    else if (entry.followup === "pending") gate = "open_finding";
    else if (!distinctFollowup) gate = "followup_gap";
    else if (!entry.followupAttested) gate = "followup_consent_gap";
    else if (!entry.followupAt || !Number.isFinite(Date.parse(entry.followupAt)) ||
      Date.parse(entry.followupAt) <= Date.parse(entry.observedAt) ||
      entry.followupKey !== appearance236FollowupKey(entry)) gate = "followup_stale";
    else gate = entry.followup === "request_retest" ? "retest_requested" :
      entry.followup === "defer" ? "owner_deferred" : "review_requested";
    return { ...test, entry, gate, observationKey, validReference, scopeReady };
  });
  return {
    rows, ownerPasses: rows.filter(row => row.gate === "owner_pass").length,
    openFindings: rows.filter(row => row.entry.outcome === "finding" || row.entry.outcome === "blocked").length,
    followupsRecorded: rows.filter(row => ["retest_requested", "owner_deferred", "review_requested"].includes(row.gate)).length,
    staleOrIncomplete: rows.filter(row => !["owner_pass", "not_tested", "retest_requested", "owner_deferred", "review_requested"].includes(row.gate)).length,
    verifiedWindowsAcceptance: 0 as const, authenticatedOutsideReviews: 0 as const,
    repairsAuthorized: 0 as const, repairsExecuted: 0 as const,
    sixAppIntegration: "DISCONNECTED / HOLD" as const, privateRelay: "OFF" as const,
    vault: "SECURITY HOLD" as const, ql275: "UNDER REVIEW" as const,
  };
}

export function formatAppearance236Packet(theme: ShellTheme, scope: Appearance236Scope,
  draft: Appearance236Draft): string {
  const result = summarizeAppearance236(theme, scope, draft);
  return [
    "Rosevear AI Hub — Build 236 owner Windows appearance acceptance / visual regression handoff",
    "OWNER-REPORTED SESSION DATA ONLY — NOT INDEPENDENTLY VERIFIED / NO REPAIR AUTHORIZATION",
    `Theme: ${theme}; installed version (owner-entered): ${safeWindowsInstalledVersion(scope.installedVersion) || "MISSING"}`,
    `Owner witnessed actual Windows: ${scope.ownerWitnessed ? "YES (self-reported)" : "NO"}`,
    `Owner passes: ${result.ownerPasses}/${result.rows.length}; open findings or blockers: ${result.openFindings}; separate follow-ups: ${result.followupsRecorded}`,
    ...result.rows.map(row => `${row.id}: ${row.gate} | ${row.entry.viewport} | ${row.entry.outcome} | symptom ${row.entry.symptom} | evidence ${row.entry.reference || "MISSING"} | observed ${row.entry.observedAt || "MISSING"} | follow-up ${row.entry.followup} | follow-up ref ${row.entry.followupReference || "MISSING"} | follow-up time ${row.entry.followupAt || "MISSING"}`),
    "Verified installed Windows acceptance: 0; independently authenticated reviews: 0; repairs authorized/executed: 0/0.",
    "Six apps DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD; zero gateway GETs.",
    "No installation, device/camera operation, network action, restore, external review or upload occurred. Do not include passwords, URLs, private IPs, images, logs or personal data.",
  ].join("\n");
}
