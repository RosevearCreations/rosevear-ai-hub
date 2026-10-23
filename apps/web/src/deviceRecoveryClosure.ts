import type { DeviceCameraSnapshot } from "./deviceRecovery";
import type { CameraPlaybackReadiness, MissingSource } from "./deviceFieldReconciliation";
import { RECOVERY_FOLLOW_UP_SCHEMA, type FollowUpStage, validateOwnerIntegrationName } from "./deviceRecoveryFollowUps";

export const RECOVERY_CLOSURE_SCHEMA = "rosevear-device-camera-follow-up-closure-ledger/v1" as const;
export type ClosureAction = "pending" | "verified_function" | "confirmed_retired" | "verified_live_video";
export type ClosureStatus = "open_hold" | "owner_attested_closed";

export interface FollowUpWorklist {
  schema: typeof RECOVERY_FOLLOW_UP_SCHEMA;
  generated_at: string;
  source_registry_at: string;
  current_registry_at: string;
  follow_ups: {
    source: MissingSource;
    id: string;
    name: string;
    stage: FollowUpStage;
    integration_group_owner_supplied: string | null;
  }[];
}

export interface ClosureRow {
  source: MissingSource;
  id: string;
  stage: FollowUpStage;
  registry_present: boolean;
  private_stream_ready: boolean | null;
  owner_action: ClosureAction;
  status: ClosureStatus;
  reopened_from_previous: boolean;
}

export interface ClosureLedgerEntry {
  registry_at: string;
  reviewed_at: string;
  decisions: ClosureRow[];
  summary: { open_holds: number; owner_attested_closed: number; reopened: number };
}

export interface ClosureLedger {
  schema: typeof RECOVERY_CLOSURE_SCHEMA;
  source_worklist_at: string;
  source_registry_at: string;
  generated_at: string;
  entries: ClosureLedgerEntry[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const stages: FollowUpStage[] = ["ha_integration", "ha_owner_check", "camera_registration", "camera_stream", "camera_playback"];
const actions: ClosureAction[] = ["pending", "verified_function", "confirmed_retired", "verified_live_video"];

function text(value: unknown, label: string, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /\b(?:rtsp|rtsps|https?|mqtt):\/\//i.test(value)) {
    throw new Error(`Invalid ${label}; URLs and credentials are not permitted in private closure evidence.`);
  }
  return value;
}

function time(value: unknown, label: string): string {
  const result = text(value, label);
  if (!Number.isFinite(Date.parse(result))) throw new Error(`Invalid ${label} timestamp.`);
  return result;
}

function list(value: unknown, label: string, max = 5000): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid or oversized ${label}.`);
  return value;
}

export const closureKey = (source: MissingSource, id: string) => JSON.stringify([source, id]);

/** Import only safe identity/stage/group fields; discard all incoming evidence text and extra metadata. */
export function parseRecoveryWorklist(raw: string): FollowUpWorklist {
  if (raw.length > 1_000_000) throw new Error("Build 110 worklist exceeds 1 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Build 110 worklist must be valid JSON."); }
  if (!isRecord(value) || value.schema !== RECOVERY_FOLLOW_UP_SCHEMA) throw new Error("Not a Build 110 follow-up worklist.");
  const generatedAt = time(value.generated_at, "generated");
  const sourceAt = time(value.source_registry_at, "source registry");
  const currentAt = time(value.current_registry_at, "current registry");
  if (Date.parse(sourceAt) >= Date.parse(currentAt) || Date.parse(currentAt) > Date.parse(generatedAt)) {
    throw new Error("Build 110 worklist timestamps are out of order.");
  }
  const seen = new Set<string>();
  const followUps = list(value.follow_ups, "follow-ups").map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid follow-up entry.");
    const source = entry.source as MissingSource;
    if (source !== "ha_device" && source !== "ha_entity" && source !== "hub_camera") throw new Error("Unknown follow-up source.");
    const id = text(entry.id, "identity ID");
    const name = text(entry.name, "identity name");
    const key = closureKey(source, id);
    if (seen.has(key)) throw new Error("Duplicate exact identity in Build 110 worklist.");
    seen.add(key);
    const stage = entry.stage;
    if (!stages.includes(stage as FollowUpStage) || (source === "hub_camera") !== String(stage).startsWith("camera_")) {
      throw new Error("Invalid source/stage pairing in worklist.");
    }
    let group: string | null = null;
    if (entry.integration_group_owner_supplied !== null && entry.integration_group_owner_supplied !== undefined) {
      if (source === "hub_camera" || typeof entry.integration_group_owner_supplied !== "string") throw new Error("Invalid integration label.");
      group = validateOwnerIntegrationName(entry.integration_group_owner_supplied);
    }
    return { source, id, name, stage: stage as FollowUpStage, integration_group_owner_supplied: group };
  });
  if (!isRecord(value.summary)) throw new Error("Missing Build 110 follow-up summary.");
  const summary = value.summary;
  for (const stage of stages) {
    if (summary[stage] !== followUps.filter((item) => item.stage === stage).length) throw new Error("Build 110 summary counts do not match.");
  }
  if (summary.total_open !== followUps.length ||
    (followUps.length > 0 ? summary.status !== "follow_up_required" :
      summary.status !== "owner_attested_queue_only" && summary.status !== "follow_up_required")) {
    throw new Error("Contradictory Build 110 follow-up summary.");
  }
  return { schema: RECOVERY_FOLLOW_UP_SCHEMA, generated_at: generatedAt, source_registry_at: sourceAt,
    current_registry_at: currentAt, follow_ups: followUps };
}

function validAction(row: ClosureRow): boolean {
  switch (row.owner_action) {
    case "pending": return row.status === "open_hold";
    case "verified_function": return row.source !== "hub_camera" && row.registry_present && row.private_stream_ready === null && row.status === "owner_attested_closed";
    case "confirmed_retired": return row.source !== "hub_camera" && !row.registry_present && row.private_stream_ready === null && row.status === "owner_attested_closed";
    case "verified_live_video": return row.source === "hub_camera" && row.registry_present && row.private_stream_ready === true && row.status === "owner_attested_closed";
  }
}

/** Read previous private ledgers only when every historical row matches this worklist's exact identities. */
export function parseClosureLedger(raw: string, worklist: FollowUpWorklist): ClosureLedger {
  if (raw.length > 1_000_000) throw new Error("Closure ledger exceeds 1 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Closure ledger must be valid JSON."); }
  if (!isRecord(value) || value.schema !== RECOVERY_CLOSURE_SCHEMA) throw new Error("Not a Build 111 closure ledger.");
  const generatedAt = time(value.generated_at, "ledger generated");
  if (value.source_worklist_at !== worklist.generated_at || value.source_registry_at !== worklist.current_registry_at) {
    throw new Error("Closure ledger belongs to a different Build 110 worklist.");
  }
  const keys = new Set(worklist.follow_ups.map((item) => closureKey(item.source, item.id)));
  let priorRegistry = Date.parse(worklist.current_registry_at);
  let priorReviewed = Date.parse(worklist.generated_at);
  let priorEntry: ClosureLedgerEntry | null = null;
  const entries = list(value.entries, "ledger entries", 100).map((rawEntry) => {
    if (!isRecord(rawEntry) || !isRecord(rawEntry.summary)) throw new Error("Malformed ledger entry.");
    const registryAt = time(rawEntry.registry_at, "ledger registry");
    const reviewedAt = time(rawEntry.reviewed_at, "ledger review");
    if (Date.parse(registryAt) <= priorRegistry || Date.parse(registryAt) <= priorReviewed ||
      Date.parse(registryAt) > Date.parse(reviewedAt) || Date.parse(reviewedAt) > Date.parse(generatedAt)) {
      throw new Error("Closure ledger reading order is invalid.");
    }
    const seen = new Set<string>();
    const decisions: ClosureRow[] = list(rawEntry.decisions, "ledger decisions").map((item) => {
      if (!isRecord(item)) throw new Error("Malformed ledger decision.");
      const source = item.source;
      if (source !== "ha_device" && source !== "ha_entity" && source !== "hub_camera") throw new Error("Invalid ledger source.");
      const id = text(item.id, "ledger identity ID");
      const key = closureKey(source, id);
      if (!keys.has(key) || seen.has(key)) throw new Error("Ledger contains an unknown or duplicate exact identity.");
      seen.add(key);
      const stage = item.stage;
      if (!stages.includes(stage as FollowUpStage) || (source === "hub_camera") !== String(stage).startsWith("camera_")) throw new Error("Invalid ledger stage.");
      if (typeof item.registry_present !== "boolean" ||
        (source !== "hub_camera" ? item.private_stream_ready !== null : typeof item.private_stream_ready !== "boolean") ||
        !actions.includes(item.owner_action as ClosureAction) ||
        (item.status !== "open_hold" && item.status !== "owner_attested_closed") ||
        typeof item.reopened_from_previous !== "boolean") throw new Error("Invalid ledger decision fields.");
      const row: ClosureRow = { source, id, stage: stage as FollowUpStage,
        registry_present: item.registry_present, private_stream_ready: item.private_stream_ready as boolean | null,
        owner_action: item.owner_action as ClosureAction, status: item.status as ClosureStatus,
        reopened_from_previous: item.reopened_from_previous };
      if (!validAction(row) ||
        (source === "hub_camera" && (row.stage !== (row.registry_present ? row.private_stream_ready ? "camera_playback" : "camera_stream" : "camera_registration"))) ||
        (source !== "hub_camera" && row.stage !== (row.registry_present ? "ha_owner_check" : "ha_integration"))) {
        throw new Error("Contradictory ledger decision.");
      }
      const wasClosed = priorEntry?.decisions.find((prior) => closureKey(prior.source, prior.id) === key)?.status === "owner_attested_closed";
      if (row.reopened_from_previous !== (Boolean(wasClosed) && row.status === "open_hold")) throw new Error("Invalid ledger reopen history.");
      return row;
    });
    if (seen.size !== keys.size) throw new Error("Closure ledger is missing worklist identities.");
    const summary = {
      open_holds: decisions.filter((item) => item.status === "open_hold").length,
      owner_attested_closed: decisions.filter((item) => item.status === "owner_attested_closed").length,
      reopened: decisions.filter((item) => item.reopened_from_previous).length,
    };
    const rawSummary = rawEntry.summary as Record<string, unknown>;
    if (Object.entries(summary).some(([field, count]) => rawSummary[field] !== count)) throw new Error("Ledger summary does not match decisions.");
    const entry: ClosureLedgerEntry = { registry_at: registryAt, reviewed_at: reviewedAt, decisions, summary };
    priorRegistry = Date.parse(registryAt);
    priorReviewed = Date.parse(reviewedAt);
    priorEntry = entry;
    return entry;
  });
  if (entries.length === 0 || Date.parse(generatedAt) < Date.parse(entries[entries.length - 1].reviewed_at)) {
    throw new Error("Empty or invalid closure ledger history.");
  }
  return { schema: RECOVERY_CLOSURE_SCHEMA, source_worklist_at: worklist.generated_at,
    source_registry_at: worklist.current_registry_at, generated_at: generatedAt, entries };
}

export function buildClosureReview(
  worklist: FollowUpWorklist,
  previous: ClosureLedger | null,
  current: DeviceCameraSnapshot,
  playback: CameraPlaybackReadiness[],
  ownerActions: Readonly<Record<string, ClosureAction>>,
  now = Date.now(),
) {
  const sampleAt = Date.parse(current.captured_at);
  const latestAt = previous?.entries[previous.entries.length - 1]?.registry_at ?? worklist.current_registry_at;
  const latestReview = previous?.entries[previous.entries.length - 1]?.reviewed_at ?? worklist.generated_at;
  const laterReading = Number.isFinite(sampleAt) && sampleAt > Date.parse(latestAt) && sampleAt > Date.parse(latestReview);
  const freshReading = Number.isFinite(sampleAt) && sampleAt <= now + 60_000 && now - sampleAt <= 300_000;
  const haDevices = new Set(current.home_assistant.devices.map((item) => item.id));
  const haEntities = new Set(current.home_assistant.entities.map((item) => item.id));
  const cameras = new Set(current.cameras.map((item) => item.id));
  const playbackById = new Map(playback.map((item) => [item.id, item]));
  const lastDecisions = new Map((previous?.entries[previous.entries.length - 1]?.decisions ?? [])
    .map((item) => [closureKey(item.source, item.id), item]));
  const decisions: ClosureRow[] = worklist.follow_ups.map((item) => {
    const key = closureKey(item.source, item.id);
    const present = (item.source === "ha_device" ? haDevices : item.source === "ha_entity" ? haEntities : cameras).has(item.id);
    const ready = item.source === "hub_camera" && present && Boolean(playbackById.get(item.id)?.ready) && freshReading && laterReading;
    const proposedAction = freshReading && laterReading ? ownerActions[key] : "pending";
    const action: ClosureAction = item.source === "hub_camera"
      ? ready && proposedAction === "verified_live_video" ? "verified_live_video" : "pending"
      : present && proposedAction === "verified_function" ? "verified_function"
        : !present && proposedAction === "confirmed_retired" ? "confirmed_retired" : "pending";
    const stage: FollowUpStage = item.source === "hub_camera"
      ? !present ? "camera_registration" : !ready ? "camera_stream" : "camera_playback"
      : present ? "ha_owner_check" : "ha_integration";
    const status: ClosureStatus = action === "pending" ? "open_hold" : "owner_attested_closed";
    return { source: item.source, id: item.id, stage, registry_present: present,
      private_stream_ready: item.source === "hub_camera" ? ready : null,
      owner_action: action, status,
      reopened_from_previous: lastDecisions.get(key)?.status === "owner_attested_closed" && status === "open_hold" };
  });
  const summary = {
    open_holds: decisions.filter((item) => item.status === "open_hold").length,
    owner_attested_closed: decisions.filter((item) => item.status === "owner_attested_closed").length,
    reopened: decisions.filter((item) => item.reopened_from_previous).length,
  };
  return { laterReading, freshReading, decisions, summary };
}

export function createClosureLedger(
  worklist: FollowUpWorklist,
  previous: ClosureLedger | null,
  current: DeviceCameraSnapshot,
  review: ReturnType<typeof buildClosureReview>,
  generatedAt = new Date().toISOString(),
): ClosureLedger {
  if (!review.laterReading || !review.freshReading) throw new Error("A later, fresh inventory reading is required to append a closure review.");
  if (previous && (previous.source_worklist_at !== worklist.generated_at || previous.source_registry_at !== worklist.current_registry_at)) {
    throw new Error("Prior closure ledger does not match this worklist.");
  }
  if ((previous?.entries.length ?? 0) >= 100) {
    throw new Error("Closure ledger reached 100 historical reviews. Start a new private Build 110 worklist and ledger.");
  }
  if (Date.parse(generatedAt) < Date.parse(current.captured_at) ||
    (previous && Date.parse(generatedAt) < Date.parse(previous.generated_at))) throw new Error("Closure ledger time goes backwards.");
  const entry: ClosureLedgerEntry = { registry_at: current.captured_at, reviewed_at: generatedAt,
    decisions: review.decisions, summary: review.summary };
  return { schema: RECOVERY_CLOSURE_SCHEMA,
    source_worklist_at: worklist.generated_at, source_registry_at: worklist.current_registry_at,
    generated_at: generatedAt, entries: [...(previous?.entries ?? []), entry] };
}
