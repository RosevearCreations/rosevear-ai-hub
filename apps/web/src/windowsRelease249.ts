export const RELEASE_249_SCHEMA = "rosevear-windows-release-process-249/v1";
type ProcessReadback = {listener: "observed" | "missing" | "ambiguous" | "process_unavailable"; pid: number | null; source_path: "within_checkout" | "outside_checkout" | "unverified"; post_boot: "after_boot" | "before_boot" | "unverified"};
type RecoveryReadback = {status: "enabled" | "disabled" | "missing"; action: "expected_script_reported" | "drift_or_unknown" | "unverified"; last_run: "after_boot" | "before_boot" | "unverified"};
export type WindowsRelease249 = {schema: typeof RELEASE_249_SCHEMA; source: "local_read_only_owner_handoff"; observed_at: string; boot_observed: boolean; web: ProcessReadback; backend: ProcessReadback; recovery_task: RecoveryReadback; release_commit_attested: false; post_reboot_accepted: false};

export function parseWindowsRelease249(json: string): WindowsRelease249 {
  if (json.length > 8192) throw new Error("Evidence exceeds 8 KB.");
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Evidence is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Evidence must be an object.");
  const item = raw as Record<string, unknown>;
  if (item.schema !== RELEASE_249_SCHEMA || item.source !== "local_read_only_owner_handoff"
    || item.release_commit_attested !== false || item.post_reboot_accepted !== false)
    throw new Error("Evidence schema or verification flags are invalid.");
  if (typeof item.observed_at !== "string" || item.observed_at.length > 40 || !Number.isFinite(Date.parse(item.observed_at))
    || typeof item.boot_observed !== "boolean") throw new Error("Evidence date or boot state is invalid.");
  function process(value: unknown): ProcessReadback {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Process observation is missing.");
    const p = value as Record<string, unknown>;
    if (!["observed", "missing", "ambiguous", "process_unavailable"].includes(String(p.listener))
      || (p.pid !== null && (!Number.isInteger(p.pid) || (p.pid as number) <= 0))
      || !["within_checkout", "outside_checkout", "unverified"].includes(String(p.source_path))
      || !["after_boot", "before_boot", "unverified"].includes(String(p.post_boot)))
      throw new Error("Process observation is invalid.");
    return {listener: p.listener as ProcessReadback["listener"], pid: p.pid as number | null,
      source_path: p.source_path as ProcessReadback["source_path"], post_boot: p.post_boot as ProcessReadback["post_boot"]};
  }
  const t = item.recovery_task as Record<string, unknown> | null;
  if (!t || typeof t !== "object" || !["enabled", "disabled", "missing"].includes(String(t.status))
    || !["expected_script_reported", "drift_or_unknown", "unverified"].includes(String(t.action))
    || !["after_boot", "before_boot", "unverified"].includes(String(t.last_run)))
    throw new Error("Recovery task observation is invalid.");
  return {schema: RELEASE_249_SCHEMA, source: "local_read_only_owner_handoff", observed_at: item.observed_at,
    boot_observed: item.boot_observed, web: process(item.web), backend: process(item.backend),
    recovery_task: {status: t.status as RecoveryReadback["status"], action: t.action as RecoveryReadback["action"], last_run: t.last_run as RecoveryReadback["last_run"]},
    release_commit_attested: false, post_reboot_accepted: false};
}

export function assessWindowsRelease249(input: WindowsRelease249 | null, currentTime: string, browserAndPointerAligned: boolean,
  ownerRebootObserved: boolean) {
  const age = input ? Date.parse(currentTime) - Date.parse(input.observed_at) : Infinity;
  const fresh = age >= 0 && age <= 24 * 3600 * 1000;
  const findings: string[] = [];
  if (!input) findings.push("Import the Windows read-only release-to-process handoff.");
  else {
    if (!fresh) findings.push("Handoff has expired or its clock is in the future.");
    if (!input.boot_observed || input.web.post_boot !== "after_boot" || input.backend.post_boot !== "after_boot")
      findings.push("Windows boot and process start correlation is incomplete.");
    if (input.web.listener !== "observed" || input.backend.listener !== "observed")
      findings.push("At least one loopback listener is not uniquely owned by a process.");
    if (input.web.source_path !== "within_checkout" || input.backend.source_path !== "within_checkout")
      findings.push("At least one process executable is outside the inspected checkout or its path is unverified.");
    if (input.recovery_task.status !== "enabled" || input.recovery_task.action !== "expected_script_reported")
      findings.push("Recovery scheduled task is missing, disabled or its action has drifted.");
  }
  if (!browserAndPointerAligned) findings.push("Browser source and managed active pointer still do not both report approved main.");
  if (!ownerRebootObserved) findings.push("Owner has not recorded a post-reboot client review in this session.");
  findings.push("Independent signed release manifest and process binary provenance are still required before closure.");
  return {state: "OWNER_POST_REBOOT_ACCEPTANCE_HOLD", findings, fresh, source_alignment_reported: browserAndPointerAligned,
    signed_release_proven: false, recovery_drift_resolved: false, independent_verification: false, owner_closure_authorized: false} as const;
}
