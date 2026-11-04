export const PROCESS_248_SCHEMA = "rosevear-windows-process-task-248/v1";

type Listener = { status: "observed_loopback" | "not_observed" | "ambiguous" | "process_unavailable"; pid: number | null; parent_pid: number | null; executable_kind: string };
type Task = { state: "enabled" | "disabled" | "missing" | "unknown"; last_result: "success_recorded" | "failure_recorded" | "never_run" | "unavailable" };
export type WindowsProcess248 = { schema: typeof PROCESS_248_SCHEMA; observed_at: string; source: "owner_on_device_read_only"; listeners: {web: Listener; backend: Listener}; tasks: { server: Task; hub: Task; recovery: Task }; process_release_verified: false; restart_verified: false };

export function parseWindowsProcess248(json: string): WindowsProcess248 {
  if (json.length > 8192) throw new Error("Windows evidence is larger than 8 KB.");
  let data: unknown;
  try { data = JSON.parse(json); } catch { throw new Error("Windows evidence is not valid JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Windows evidence must be an object.");
  const item = data as Record<string, unknown>;
  if (item.schema !== PROCESS_248_SCHEMA || item.source !== "owner_on_device_read_only"
    || item.process_release_verified !== false || item.restart_verified !== false)
    throw new Error("Unsupported or untrusted Windows evidence schema.");
  if (typeof item.observed_at !== "string" || item.observed_at.length > 40 || !Number.isFinite(Date.parse(item.observed_at)))
    throw new Error("Windows evidence timestamp is invalid.");
  const listeners = item.listeners as Record<string, Listener> | null;
  const tasks = item.tasks as Record<string, Task> | null;
  if (!listeners || !tasks || typeof listeners !== "object" || typeof tasks !== "object") throw new Error("Windows evidence fields are missing.");
  for (const key of ["web", "backend"]) {
    const p = listeners[key];
    if (!p || !["observed_loopback", "not_observed", "ambiguous", "process_unavailable"].includes(p.status)
      || (p.pid != null && (!Number.isInteger(p.pid) || p.pid <= 0))
      || (p.parent_pid != null && (!Number.isInteger(p.parent_pid) || p.parent_pid < 0))
      || !["python.exe", "pythonw.exe", "node.exe", "powershell.exe", "pwsh.exe", "other", "unverified"].includes(p.executable_kind))
      throw new Error("Invalid listener readback.");
  }
  for (const key of ["server", "hub", "recovery"]) {
    const t = tasks[key];
    if (!t || !["enabled", "disabled", "missing", "unknown"].includes(t.state)
      || !["success_recorded", "failure_recorded", "never_run", "unavailable"].includes(t.last_result))
      throw new Error("Invalid startup task readback.");
  }
  // Explicitly discard any extra fields: raw command lines or private paths are never retained.
  return {schema: PROCESS_248_SCHEMA, source: "owner_on_device_read_only", observed_at: item.observed_at,
    listeners: {
      web: {status: listeners.web.status, pid: listeners.web.pid ?? null, parent_pid: listeners.web.parent_pid ?? null, executable_kind: listeners.web.executable_kind},
      backend: {status: listeners.backend.status, pid: listeners.backend.pid ?? null, parent_pid: listeners.backend.parent_pid ?? null, executable_kind: listeners.backend.executable_kind},
    },
    tasks: {
      server: {state: tasks.server.state, last_result: tasks.server.last_result},
      hub: {state: tasks.hub.state, last_result: tasks.hub.last_result},
      recovery: {state: tasks.recovery.state, last_result: tasks.recovery.last_result},
    },
    process_release_verified: false, restart_verified: false};
}

export function assessWindowsProcess248(evidence: WindowsProcess248 | null, now: string, sourceAligned: boolean) {
  const ageMs = evidence ? Date.parse(now) - Date.parse(evidence.observed_at) : Infinity;
  const fresh = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000;
  const findings: string[] = [];
  if (!evidence) findings.push("Import an on-device process and startup task readback.");
  if (evidence && !fresh) findings.push("The Windows readback is stale or dated in the future.");
  if (!sourceAligned) findings.push("The browser and managed release pointer are not aligned with approved main.");
  if (evidence && (evidence.listeners.web.status !== "observed_loopback" || evidence.listeners.backend.status !== "observed_loopback"))
    findings.push("One or more loopback listeners are missing, ambiguous or unavailable.");
  if (evidence && (evidence.tasks.server.state !== "enabled" || evidence.tasks.server.last_result !== "success_recorded"))
    findings.push("The Server Startup task has not shown enabled status with a recorded successful run.");
  if (evidence && evidence.tasks.recovery.state !== "enabled") findings.push("The recovery task is not enabled.");
  findings.push("A process ID and task result do not prove installed source identity or successful reboot, migration and device acceptance.");
  return { disposition: "POST_RESTART_CLOSURE_HOLD", readback_fresh: fresh,
    source_alignment_reported: sourceAligned, findings, independent_process_verified: false,
    installed_production_verified: false, closure_authorized: false } as const;
}
