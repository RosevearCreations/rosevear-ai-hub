import type { MissingSource } from "./deviceFieldReconciliation";
import { closureKey, type ClosureLedger, type ClosureRow, type FollowUpWorklist } from "./deviceRecoveryClosure";
import type { FollowUpStage } from "./deviceRecoveryFollowUps";

export const RECOVERY_DRIFT_SCHEMA = "rosevear-device-camera-field-recheck-drift-handoff/v1" as const;

export type DriftKind =
  | "first_review_open" | "first_review_closed"
  | "still_open" | "newly_closed" | "reopened" | "rechecked_closed";

export type DriftItem = {
  source: MissingSource;
  id: string;
  name: string;
  integration_group_owner_supplied: string | null;
  stage: FollowUpStage;
  prior_stage: FollowUpStage | null;
  stage_changed: boolean;
  current_status: ClosureRow["status"];
  prior_status: ClosureRow["status"] | null;
  drift: DriftKind;
  owner_action: ClosureRow["owner_action"];
};

export type DriftReview = ReturnType<typeof compareClosureHistory>;

const guidance: Record<FollowUpStage, string> = {
  ha_integration: "Inspect Home Assistant integrations and the device's actual power/network; do not auto-add or restore.",
  ha_owner_check: "Manually operate and confirm this identity in Home Assistant before a new owner closure.",
  camera_registration: "Review selected ONVIF discoveries and existing camera records; registration needs explicit owner approval.",
  camera_stream: "Inspect local-only go2rtc, configured stream and fresh probe without exposing RTSP credentials.",
  camera_playback: "Watch actual moving live video and record an explicit current-session owner playback check.",
};

/** Pure analysis of an already validated, private Build 111 owner ledger. No status is inferred from a device name. */
export function compareClosureHistory(worklist: FollowUpWorklist, ledger: ClosureLedger) {
  if (ledger.source_worklist_at !== worklist.generated_at || ledger.source_registry_at !== worklist.current_registry_at || ledger.entries.length === 0) {
    throw new Error("Build 111 ledger does not match this exact Build 110 worklist.");
  }
  const last = ledger.entries[ledger.entries.length - 1];
  const prior = ledger.entries.length > 1 ? ledger.entries[ledger.entries.length - 2] : null;
  const latestByKey = new Map(last.decisions.map((row) => [closureKey(row.source, row.id), row]));
  const previousByKey = new Map((prior?.decisions ?? []).map((row) => [closureKey(row.source, row.id), row]));
  const items: DriftItem[] = worklist.follow_ups.map((identity) => {
    const key = closureKey(identity.source, identity.id);
    const current = latestByKey.get(key);
    if (!current) throw new Error("Build 111 ledger lacks a tracked exact identity.");
    const older = previousByKey.get(key);
    if (prior && !older) throw new Error("Build 111 prior review lacks a tracked exact identity.");
    const drift: DriftKind = !older ? current.status === "open_hold" ? "first_review_open" : "first_review_closed" :
      older.status === "open_hold" ? current.status === "open_hold" ? "still_open" : "newly_closed" :
        current.status === "open_hold" ? "reopened" : "rechecked_closed";
    return {
      source: identity.source,
      id: identity.id,
      name: identity.name,
      integration_group_owner_supplied: identity.integration_group_owner_supplied,
      stage: current.stage,
      prior_stage: older?.stage ?? null,
      stage_changed: Boolean(older && older.stage !== current.stage),
      current_status: current.status,
      prior_status: older?.status ?? null,
      drift,
      owner_action: current.owner_action,
    };
  });
  const open = items.filter((item) => item.current_status === "open_hold");
  const closed = items.filter((item) => item.current_status === "owner_attested_closed");
  const summary = {
    total: items.length,
    unresolved: open.length,
    owner_attested_closed: closed.length,
    reopened: items.filter((item) => item.drift === "reopened").length,
    still_open: items.filter((item) => item.drift === "still_open").length,
    newly_closed: items.filter((item) => item.drift === "newly_closed").length,
    rechecked_closed: items.filter((item) => item.drift === "rechecked_closed").length,
    stage_changed: items.filter((item) => item.stage_changed).length,
    unresolved_ha: open.filter((item) => item.source !== "hub_camera").length,
    unresolved_camera: open.filter((item) => item.source === "hub_camera").length,
  };
  return {
    items,
    summary,
    latest_review_at: last.reviewed_at,
    latest_registry_at: last.registry_at,
    previous_review_at: prior?.reviewed_at ?? null,
    review_count: ledger.entries.length,
    historical_only: true as const,
  };
}

/** Exports only allowlisted identity, timestamps and previous/current owner status. */
export function createDriftHandoff(
  worklist: FollowUpWorklist,
  ledger: ClosureLedger,
  review: DriftReview,
  handoffReviewed: ReadonlySet<string>,
  generatedAt = new Date().toISOString(),
) {
  const at = Date.parse(generatedAt);
  if (!Number.isFinite(at) || at < Date.parse(ledger.generated_at)) throw new Error("Handoff timestamp predates the reviewed closure ledger.");
  const expected = compareClosureHistory(worklist, ledger);
  if (JSON.stringify(expected) !== JSON.stringify(review)) throw new Error("Handoff review no longer matches the imported ledger.");
  const open = expected.items.filter((item) => item.current_status === "open_hold");
  const validKeys = new Set(open.map((item) => closureKey(item.source, item.id)));
  const acknowledged = [...handoffReviewed].filter((key) => validKeys.has(key));
  const entries = ledger.entries.map((entry) => ({
    registry_at: entry.registry_at,
    reviewed_at: entry.reviewed_at,
    open_holds: entry.summary.open_holds,
    owner_attested_closed: entry.summary.owner_attested_closed,
    reopened: entry.summary.reopened,
  }));
  return {
    schema: RECOVERY_DRIFT_SCHEMA,
    generated_at: generatedAt,
    source_worklist_at: worklist.generated_at,
    source_registry_at: worklist.current_registry_at,
    source_ledger_generated_at: ledger.generated_at,
    evidence_scope: "Historical owner-authored evidence chain only; not device health, independent field acceptance, or an immutable/signed record.",
    history: entries,
    summary: { ...expected.summary, handoff_reviewed: acknowledged.length, handoff_pending: open.length - acknowledged.length },
    unresolved: open.map((item) => ({
      source: item.source,
      id: item.id,
      name: item.name,
      owner_integration_group: item.integration_group_owner_supplied,
      current_stage: item.stage,
      previous_stage: item.prior_stage,
      drift: item.drift,
      previous_status: item.prior_status,
      owner_reviewed_handoff_now: handoffReviewed.has(closureKey(item.source, item.id)),
      next_supervised_step: guidance[item.stage],
    })),
    owner_attested_closed: expected.items.filter((item) => item.current_status === "owner_attested_closed").map((item) => ({
      source: item.source, id: item.id, status: item.current_status, drift: item.drift,
      owner_action: item.owner_action,
    })),
  };
}
