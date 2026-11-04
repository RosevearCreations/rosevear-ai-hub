export const FIELD_247_SCHEMA = "rosevear-windows-activation-outcome-247/v1";
const shaPattern = /^[a-f0-9]{40}$/;

export type ActivationReceipt247 = {
  source: "owner_imported_246_receipt";
  imported_at: string;
  approved_main_reference: string | null;
  browser_sha: string | null;
  locally_reported_active_release: string | null;
  owner_checks_recorded: number;
};

/** Only allow an explicitly bounded, non-secret subset of an untrusted local JSON file. */
export function importActivation246Receipt(content: string, now: string): ActivationReceipt247 {
  if (content.length > 32768) throw new Error("Receipt exceeds the 32 KB import limit.");
  let data: unknown;
  try { data = JSON.parse(content); } catch { throw new Error("Receipt is not valid JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Receipt must be an object.");
  const input = data as Record<string, unknown>;
  if (input.schema !== "rosevear-windows-first-activation-246/v1") throw new Error("Only Build 246 field receipts are supported.");
  const optionalSha = (value: unknown, key: string) => {
    if (value === null) return null;
    if (typeof value !== "string" || !shaPattern.test(value)) throw new Error(`Invalid ${key} in receipt.`);
    return value;
  };
  const checks = input.owner_self_reported_checks;
  if (!checks || typeof checks !== "object" || Array.isArray(checks)) throw new Error("Receipt owner checks are missing.");
  const checkValues = Object.values(checks);
  if (checkValues.length !== 6 || checkValues.some(v => typeof v !== "boolean")) throw new Error("Receipt owner checks are invalid.");
  return {
    source: "owner_imported_246_receipt", imported_at: now,
    approved_main_reference: optionalSha(input.approved_main_reference, "main reference"),
    browser_sha: optionalSha(input.browser_sha, "browser SHA"),
    locally_reported_active_release: optionalSha(input.locally_reported_active_release, "active release"),
    owner_checks_recorded: checkValues.filter(Boolean).length,
  };
}

/** A user-supplied PID or process command is an observation, never trusted process attestation. */
export function reconcileActivation247(expectedSha: string, currentBrowserSha: string | null,
  localActiveRelease: string | null, imported: ActivationReceipt247 | null,
  processObservation: "not_checked" | "same_release_claimed" | "stale_or_different" | "unknown") {
  const referenceValid = shaPattern.test(expectedSha);
  const browserMatch = referenceValid && currentBrowserSha === expectedSha;
  const pointerMatch = referenceValid && localActiveRelease === expectedSha;
  const importMatch = Boolean(imported && imported.approved_main_reference === expectedSha
    && imported.browser_sha === currentBrowserSha && imported.locally_reported_active_release === localActiveRelease);
  const exceptions: string[] = [];
  if (!referenceValid) exceptions.push("Approved main SHA is missing or invalid.");
  if (!browserMatch) exceptions.push("Browser assets do not report the approved source SHA.");
  if (!pointerMatch) exceptions.push("Managed Windows release pointer does not report the approved SHA.");
  if (!importMatch) exceptions.push("No matching Build 246 owner receipt has been imported.");
  if (processObservation !== "same_release_claimed") exceptions.push("Running Windows backend process has not been owner-reconciled to this release.");
  if (processObservation === "stale_or_different") exceptions.unshift("Owner observed a stale or different running process: supervised recovery required.");
  exceptions.push("Independent Windows process, migration, reboot and device acceptance still require field evidence.");
  return {
    schema: FIELD_247_SCHEMA,
    disposition: processObservation === "stale_or_different" ? "RECOVERY_EXCEPTION_OPEN" : "FIELD_RECONCILIATION_HOLD",
    source_alignment: browserMatch && pointerMatch ? "REPORTED_MATCH" : "NOT_VERIFIED",
    imported_receipt_matches_current_readback: importMatch,
    owner_process_observation: processObservation,
    exceptions,
    machine_verified: false,
    production_installed: false,
    recovery_exceptions_closed: false,
  } as const;
}
