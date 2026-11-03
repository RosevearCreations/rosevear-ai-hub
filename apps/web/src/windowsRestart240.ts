/** Build 240: supervised Windows restart evidence. No host, task or network actions. */
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";

export const restart240Dependencies = [
  { id: "tasks", title: "Existing Task Scheduler startup / recovery", next: "Inspect the existing task names, triggers and last results. Do not register duplicate tasks." },
  { id: "api", title: "Hub backend and local API", next: "Inspect local /health and /version, then the existing recovery log. Never launch a second API on an occupied port." },
  { id: "web", title: "Hub login and built web interface", next: "Check the installed PWA, or the legacy Vite client only if this host still uses it." },
  { id: "vm", title: "Original Home Assistant VirtualBox VM", next: "Check the original guest and EFI settings. Do not create or restore another VM over it." },
  { id: "mqtt", title: "Authenticated MQTT integration", next: "Inspect broker and Hub MQTT readback; a listening port alone is not a passed integration." },
  { id: "ollama", title: "Local Ollama service and model", next: "Check the loopback service and an available local model; a port alone does not prove model readiness." },
  { id: "https", title: "Caddy HTTPS / authorized private client", next: "Check a trusted authorized client and current private LAN identity. Do not bypass TLS or open router ports." },
  { id: "cameras", title: "Registered cameras and moving video", next: "Compare the existing inventory and observe an authorized live stream. Online badges alone are insufficient." },
] as const;

export type Restart240DependencyId = typeof restart240Dependencies[number]["id"];
export type Restart240Status = "not_checked" | "working" | "partial" | "failed" | "not_configured";
export type Restart240Source = "none" | "direct_screen" | "task_history" | "local_log";
export type Restart240Preflight = {
  installedVersion: string; hubBackupReference: string; haBackupReference: string;
  baselineReference: string; workPaused: boolean; tasksInspected: boolean;
  originalVmReviewed: boolean; recordedAt: string; snapshotKey: string;
};
export type Restart240Reboot = {
  witnessed: boolean; signInObserved: boolean; reference: string; waitedMinutes: number;
  recordedAt: string; snapshotKey: string;
};
export type Restart240Observation = {
  status: Restart240Status; source: Restart240Source; reference: string;
  recordedAt: string; snapshotKey: string;
};
export type Restart240Draft = {
  preflight: Restart240Preflight;
  reboot: Restart240Reboot;
  observations: Partial<Record<Restart240DependencyId, Restart240Observation>>;
};

export const restart240Schema = "rosevear-hub-supervised-restart-240/v1" as const;
export const defaultRestart240Preflight: Restart240Preflight = {
  installedVersion: "", hubBackupReference: "", haBackupReference: "",
  baselineReference: "", workPaused: false, tasksInspected: false,
  originalVmReviewed: false, recordedAt: "", snapshotKey: "",
};
export const defaultRestart240Reboot: Restart240Reboot = {
  witnessed: false, signInObserved: false, reference: "", waitedMinutes: 0,
  recordedAt: "", snapshotKey: "",
};
export const defaultRestart240Observation: Restart240Observation = {
  status: "not_checked", source: "none", reference: "", recordedAt: "", snapshotKey: "",
};
export const defaultRestart240Draft: Restart240Draft = {
  preflight: defaultRestart240Preflight, reboot: defaultRestart240Reboot, observations: {},
};

const validCode = (s: string) => /^[A-Za-z0-9_-]{4,80}$/.test(s);
const validTime = (s: string) => !!s && Number.isFinite(Date.parse(s));
const validStatus = new Set<Restart240Status>([
  "not_checked", "working", "partial", "failed", "not_configured",
]);
const validSource = new Set<Restart240Source>(["none", "direct_screen", "task_history", "local_log"]);
const safeTime = (s: unknown) => typeof s === "string" && validTime(s) ? s.slice(0, 40) : "";
const safeSnapshot = (s: unknown) => typeof s === "string" ? s.slice(0, 5000) : "";
const safeVersion = (s: unknown) => typeof s === "string" && !/[:/@\\?&#=]/.test(s)
  ? safeWindowsInstalledVersion(s) : "";

export function preflight240Key(entry: Restart240Preflight): string {
  return JSON.stringify({ version: safeWindowsInstalledVersion(entry.installedVersion),
    hubBackup: entry.hubBackupReference, haBackup: entry.haBackupReference,
    baseline: entry.baselineReference, workPaused: entry.workPaused,
    tasksInspected: entry.tasksInspected, originalVmReviewed: entry.originalVmReviewed });
}
export function reboot240Key(preflight: Restart240Preflight, entry: Restart240Reboot): string {
  return JSON.stringify({ baseline: preflight.snapshotKey, baselineAt: preflight.recordedAt,
    witnessed: entry.witnessed, signIn: entry.signInObserved, reference: entry.reference,
    waitedMinutes: entry.waitedMinutes });
}
export function observation240Key(reboot: Restart240Reboot, id: Restart240DependencyId,
  entry: Restart240Observation): string {
  return JSON.stringify({ reboot: reboot.snapshotKey, rebootAt: reboot.recordedAt,
    id, status: entry.status, source: entry.source, reference: entry.reference });
}

export type Restart240PreflightGate = "scope_missing" | "backup_missing" | "preflight_duplicate" |
  "preflight_checks_missing" | "baseline_missing" | "baseline_stale" | "preflight_ready";
export type Restart240RebootGate = "preflight_hold" | "await_supervised_restart" |
  "restart_witness_missing" | "restart_reference_missing" | "restart_reference_duplicate" |
  "restart_time_invalid" | "restart_snapshot_stale" | "recovery_wait_missing" | "reboot_recorded";
export type Restart240DependencyGate = "await_restart" | "not_checked" | "failed" |
  "partial" | "not_configured" | "evidence_missing" | "duplicate_reference" |
  "evidence_stale" | "owner_observed_working";

export function summarizeRestart240(draft: Restart240Draft) {
  const p = draft.preflight;
  const q = draft.reboot;
  const preflightCodes = [p.hubBackupReference, p.haBackupReference, p.baselineReference];
  const preflightGate: Restart240PreflightGate =
    safeWindowsInstalledVersion(p.installedVersion).trim().length < 3 ? "scope_missing" :
    !validCode(p.hubBackupReference) || !validCode(p.haBackupReference) ? "backup_missing" :
    new Set(preflightCodes).size !== 3 ? "preflight_duplicate" :
    !p.workPaused || !p.tasksInspected || !p.originalVmReviewed ? "preflight_checks_missing" :
    !validCode(p.baselineReference) ? "baseline_missing" :
    !validTime(p.recordedAt) || p.snapshotKey !== preflight240Key(p) ? "baseline_stale" :
    "preflight_ready";
  const ready = preflightGate === "preflight_ready";
  const rebootGate: Restart240RebootGate = !ready ? "preflight_hold" :
    !q.recordedAt ? "await_supervised_restart" :
    !q.witnessed || !q.signInObserved ? "restart_witness_missing" :
    !validCode(q.reference) ? "restart_reference_missing" :
    preflightCodes.includes(q.reference) ? "restart_reference_duplicate" :
    !validTime(q.recordedAt) || Date.parse(q.recordedAt) <= Date.parse(p.recordedAt)
      ? "restart_time_invalid" :
    q.snapshotKey !== reboot240Key(p, q) ? "restart_snapshot_stale" :
    !Number.isFinite(q.waitedMinutes) || q.waitedMinutes < 5 ? "recovery_wait_missing" :
    "reboot_recorded";
  const rebootReady = rebootGate === "reboot_recorded";
  const allCodes = [...preflightCodes, q.reference,
    ...restart240Dependencies.map(dep => draft.observations[dep.id]?.reference ?? "")].filter(Boolean);
  const rows = restart240Dependencies.map(dep => {
    const entry = draft.observations[dep.id] ?? defaultRestart240Observation;
    const gate: Restart240DependencyGate = !rebootReady ? "await_restart" :
      entry.status === "not_checked" ? "not_checked" :
      entry.source === "none" || !validCode(entry.reference) ? "evidence_missing" :
      allCodes.filter(ref => ref === entry.reference).length !== 1 ? "duplicate_reference" :
      !validTime(entry.recordedAt) || Date.parse(entry.recordedAt) <= Date.parse(q.recordedAt) ||
        entry.snapshotKey !== observation240Key(q, dep.id, entry) ? "evidence_stale" :
      entry.status === "failed" ? "failed" :
      entry.status === "partial" ? "partial" :
      entry.status === "not_configured" ? "not_configured" :
      "owner_observed_working";
    return { ...dep, entry, gate };
  });
  const firstBlocker = rows.find(row => row.gate !== "owner_observed_working") ?? null;
  return {
    preflightGate, rebootGate, rows, firstBlocker,
    working: rows.filter(row => row.gate === "owner_observed_working").length,
    findings: rows.filter(row => row.gate === "failed" || row.gate === "partial").length,
    outstanding: rows.filter(row => row.gate !== "owner_observed_working").length,
    ownerReportedRecovery: rebootReady && rows.every(row => row.gate === "owner_observed_working"),
    independentlyVerified: false as const, remotelyRestarted: false as const,
    repairsAuthorized: false as const, repairsExecuted: false as const,
    installations: 0 as const, liveCommands: 0 as const,
    sixAppIntegration: "DISCONNECTED / HOLD" as const, privateRelay: "OFF" as const,
    vault: "SECURITY HOLD" as const,
  };
}

/** A code-only owner handoff across the physical reboot. This is not authenticated proof. */
export function exportRestart240Handoff(draft: Restart240Draft): string {
  const normalized = importRestart240Handoff(JSON.stringify({ schema: restart240Schema, ...draft }));
  return JSON.stringify({ schema: restart240Schema, ...normalized }, null, 2);
}

/** Accept only our fixed enum/code schema. Ignore unknown sensitive or executable fields. */
export function importRestart240Handoff(raw: string): Restart240Draft {
  if (raw.length > 15000) throw new Error("Handoff exceeds the code-only size limit");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || (parsed as { schema?: unknown }).schema !== restart240Schema)
    throw new Error("The handoff schema does not match Build 240");
  const root = parsed as Record<string, unknown>;
  const pi = root.preflight && typeof root.preflight === "object" ? root.preflight as Record<string, unknown> : {};
  const ri = root.reboot && typeof root.reboot === "object" ? root.reboot as Record<string, unknown> : {};
  const inputRows = root.observations && typeof root.observations === "object"
    ? root.observations as Record<string, unknown> : {};
  const observations: Restart240Draft["observations"] = {};
  for (const dep of restart240Dependencies) {
    const value = inputRows[dep.id];
    const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
    observations[dep.id] = {
      status: validStatus.has(v.status as Restart240Status) ? v.status as Restart240Status : "not_checked",
      source: validSource.has(v.source as Restart240Source) ? v.source as Restart240Source : "none",
      reference: safeWindowsFieldReference(typeof v.reference === "string" ? v.reference : ""),
      recordedAt: safeTime(v.recordedAt), snapshotKey: safeSnapshot(v.snapshotKey),
    };
  }
  const normalized: Restart240Draft = {
    preflight: {
      installedVersion: safeVersion(pi.installedVersion),
      hubBackupReference: safeWindowsFieldReference(typeof pi.hubBackupReference === "string" ? pi.hubBackupReference : ""),
      haBackupReference: safeWindowsFieldReference(typeof pi.haBackupReference === "string" ? pi.haBackupReference : ""),
      baselineReference: safeWindowsFieldReference(typeof pi.baselineReference === "string" ? pi.baselineReference : ""),
      workPaused: pi.workPaused === true, tasksInspected: pi.tasksInspected === true,
      originalVmReviewed: pi.originalVmReviewed === true,
      recordedAt: safeTime(pi.recordedAt), snapshotKey: safeSnapshot(pi.snapshotKey),
    },
    reboot: {
      witnessed: ri.witnessed === true, signInObserved: ri.signInObserved === true,
      reference: safeWindowsFieldReference(typeof ri.reference === "string" ? ri.reference : ""),
      waitedMinutes: typeof ri.waitedMinutes === "number" && Number.isFinite(ri.waitedMinutes)
        ? Math.min(1440, Math.max(0, ri.waitedMinutes)) : 0,
      recordedAt: safeTime(ri.recordedAt), snapshotKey: safeSnapshot(ri.snapshotKey),
    }, observations,
  };
  // Snapshots are opaque but never trusted or echoed unless they exactly match
  // the reconstructed safe owner metadata. This also strips pasted private text.
  if (normalized.preflight.snapshotKey !== preflight240Key(normalized.preflight))
    normalized.preflight.snapshotKey = "";
  if (normalized.reboot.snapshotKey !== reboot240Key(normalized.preflight, normalized.reboot))
    normalized.reboot.snapshotKey = "";
  for (const dep of restart240Dependencies) {
    const entry = normalized.observations[dep.id];
    if (entry && entry.snapshotKey !== observation240Key(normalized.reboot, dep.id, entry))
      entry.snapshotKey = "";
  }
  return normalized;
}

export function formatRestart240Packet(draft: Restart240Draft): string {
  const summary = summarizeRestart240(draft);
  return [
    "Rosevear AI Hub Build 240 — supervised Windows restart owner handoff",
    "OWNER-ENTERED CODES ONLY — no independent proof, remote restart or repair authority",
    `Installed version (owner-entered): ${safeWindowsInstalledVersion(draft.preflight.installedVersion) || "MISSING"}`,
    `Preflight: ${summary.preflightGate}; restart: ${summary.rebootGate}; waited minutes (owner reported): ${draft.reboot.waitedMinutes}`,
    `Hub backup: ${draft.preflight.hubBackupReference || "MISSING"}; separate HA backup: ${draft.preflight.haBackupReference || "MISSING"}; preflight: ${draft.preflight.baselineReference || "MISSING"}`,
    `Supervised restart code: ${draft.reboot.reference || "MISSING"}; preflight recorded: ${draft.preflight.recordedAt || "MISSING"}; restart reported: ${draft.reboot.recordedAt || "MISSING"}`,
    ...summary.rows.map(row => `${row.id}: ${row.gate}; basis ${row.entry.source}; code ${row.entry.reference || "MISSING"}; owner reported ${row.entry.recordedAt || "MISSING"}`),
    `First unresolved dependency: ${summary.firstBlocker?.title || "none in owner report"}`,
    `Owner-reported recovery: ${summary.ownerReportedRecovery ? "YES (self-reported only)" : "NO / INCOMPLETE"}; independent verification: NO`,
    "Actions performed by the Hub worksheet: remote restarts 0; commands 0; repairs 0; installations 0.",
    "Six apps DISCONNECTED/HOLD; private relay OFF; vault SECURITY HOLD; QL-275 UNDER REVIEW.",
    "Do not include private messages, usernames, addresses, URLs, IPs, raw logs, photos, camera IDs or credentials.",
  ].join("\n");
}
