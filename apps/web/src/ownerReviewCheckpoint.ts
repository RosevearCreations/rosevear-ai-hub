/** Fixed-choice, browser-session-only recovery. Never store owner reports, private evidence or free text. */
export const OWNER_REVIEW_CHECKPOINT_KEY = "rosevear-hub:owner-standard-theme-review:203";
const SCHEMA = "rosevear.build203.owner-review-checkpoint.v1" as const;

const areas = ["front_end", "it", "management", "statistics", "status"] as const;
const checks = ["navigation", "resize", "keyboard", "data", "refresh"] as const;
const findings = ["not_checked", "acceptable", "needs_change"] as const;
const issues = ["none", "contrast", "layout", "navigation", "labels", "functionality"] as const;
const followups = ["none", "open", "follow_up_requested", "local_retest_recorded"] as const;
const deviceContexts = ["not_checked", "windows_hub_server", "remote_windows_client", "other_browser_device"] as const;
const deviceFindings = ["not_checked", "observed_pass", "observed_fail"] as const;
const deviceSymptoms = ["none", "text_clipped", "focus_not_visible", "wrong_destination", "control_unresponsive", "source_unclear"] as const;
const retests = ["not_retested", "issue_persists", "owner_reports_improvement"] as const;
const retestFollowups = ["not_requested", "engineering_review_requested", "owner_retest_ready_reported"] as const;

type Choice<T extends readonly string[]> = T[number];
type Area = Choice<typeof areas>;
type Check = Choice<typeof checks>;

export type OwnerReviewCheckpoint = {
  schema: typeof SCHEMA;
  findings: Record<Area, Choice<typeof findings>>;
  issues: Record<Area, Choice<typeof issues>>;
  followups: Record<Area, Choice<typeof followups>>;
  deviceContext: Choice<typeof deviceContexts>;
  deviceFindings: Record<Check, Choice<typeof deviceFindings>>;
  deviceSymptoms: Record<Check, Choice<typeof deviceSymptoms>>;
  deviceRetests: Record<Check, Choice<typeof retests>>;
  retestFollowups: Record<Check, Choice<typeof retestFollowups>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isChoiceMap(value: unknown, keys: readonly string[], choices: readonly string[]): boolean {
  return isRecord(value) && Object.keys(value).length === keys.length &&
    keys.every(key => choices.includes(value[key] as string));
}

export function parseOwnerReviewCheckpoint(raw: string | null): OwnerReviewCheckpoint | null {
  if (!raw || raw.length > 6000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schema !== SCHEMA || Object.keys(value).length !== 9 ||
      !isChoiceMap(value.findings, areas, findings) || !isChoiceMap(value.issues, areas, issues) ||
      !isChoiceMap(value.followups, areas, followups) ||
      !deviceContexts.includes(value.deviceContext as Choice<typeof deviceContexts>) ||
      !isChoiceMap(value.deviceFindings, checks, deviceFindings) ||
      !isChoiceMap(value.deviceSymptoms, checks, deviceSymptoms) ||
      !isChoiceMap(value.deviceRetests, checks, retests) ||
      !isChoiceMap(value.retestFollowups, checks, retestFollowups)) return null;
    // Reject contradictory stale observations rather than silently converting them into accepted findings.
    for (const area of areas) {
      if ((value.findings as Record<string, string>)[area] !== "needs_change" &&
        ((value.issues as Record<string, string>)[area] !== "none" ||
         (value.followups as Record<string, string>)[area] !== "none")) return null;
    }
    for (const check of checks) {
      if ((value.deviceFindings as Record<string, string>)[check] !== "observed_fail" &&
        ((value.deviceSymptoms as Record<string, string>)[check] !== "none" ||
         (value.deviceRetests as Record<string, string>)[check] !== "not_retested" ||
         (value.retestFollowups as Record<string, string>)[check] !== "not_requested")) return null;
    }
    if (value.deviceContext === "not_checked" &&
      checks.some(check => (value.deviceFindings as Record<string, string>)[check] !== "not_checked")) return null;
    if (value.deviceContext !== "windows_hub_server" && value.deviceContext !== "remote_windows_client" &&
      checks.some(check => (value.deviceRetests as Record<string, string>)[check] !== "not_retested" ||
        (value.retestFollowups as Record<string, string>)[check] !== "not_requested")) return null;
    return value as OwnerReviewCheckpoint;
  } catch {
    return null;
  }
}

export function encodeOwnerReviewCheckpoint(value: Omit<OwnerReviewCheckpoint, "schema">): string {
  return JSON.stringify({ schema: SCHEMA, ...value });
}
