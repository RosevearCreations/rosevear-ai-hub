import type { HomeAssistantBrowserResponse } from "./api";
import { parseRecoverySnapshot } from "./deviceRecovery";
import { closureKey, parseRecoveryWorklist } from "./deviceRecoveryClosure";
import { validateOwnerIntegrationName } from "./deviceRecoveryFollowUps";

export type HAIdentitySource = "ha_device" | "ha_entity";
export type IntegrationObservation = "unchecked" | "visible" | "attention" | "absent";
export type HAIdentityState = "absent" | "unavailable" | "reported";

export interface HAPriorEvidence {
  source: "build_107_inventory" | "build_110_worklist";
  sourceAt: string;
  identities: { source: HAIdentitySource; id: string; name: string; ownerGroup: string | null }[];
}

export interface HAReviewMark {
  group: string;
  verifiedFunction: boolean;
}

export interface HAReviewRow {
  key: string;
  source: HAIdentitySource;
  id: string;
  name: string;
  integrationGroup: string | null;
  platformHint: string | null;
  state: HAIdentityState;
  integrationObservation: IntegrationObservation;
  ownerObservedFunction: boolean;
  hold: boolean;
  nextStep: string;
}

export interface HAAssessment {
  later: boolean;
  fresh: boolean;
  platforms: { platform: string; entities: number; unavailable: number }[];
  rows: HAReviewRow[];
  counts: { absent: number; unavailable: number; reported: number; ownerObserved: number; openHolds: number };
}

const safeText = (value: string) => {
  if (/(?:https?|rtsps?|mqtt):\/\/|(?:password|access_token|secret|apikey)\s*[:=]/i.test(value)) {
    throw new Error("Private HA evidence contains a URL or credential-like value. Use a sanitized inventory.");
  }
  return value;
};

/** Accept only the two prior private identity formats; camera evidence never enters this HA workbench. */
export function importHAPriorEvidence(raw: string): HAPriorEvidence {
  if (raw.length > 1_000_000) throw new Error("Private evidence exceeds the 1 MB limit.");
  let envelope: unknown;
  try { envelope = JSON.parse(raw); } catch { throw new Error("Private evidence must be valid JSON."); }
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("Unsupported HA identity evidence.");
  }
  const schema = (envelope as Record<string, unknown>).schema;
  if (schema === "rosevear-device-camera-inventory/v1") {
    const parsed = parseRecoverySnapshot(raw);
    const identities: HAPriorEvidence["identities"] = [
      ...parsed.home_assistant.devices.map(({ id, name }) => ({ source: "ha_device" as const, id: safeText(id), name: safeText(name), ownerGroup: null })),
      ...parsed.home_assistant.entities.map(({ id, name }) => ({ source: "ha_entity" as const, id: safeText(id), name: safeText(name), ownerGroup: null })),
    ];
    return { source: "build_107_inventory", sourceAt: parsed.captured_at, identities };
  }
  if (schema === "rosevear-device-camera-recovery-follow-up/v1") {
    const parsed = parseRecoveryWorklist(raw);
    return {
      source: "build_110_worklist", sourceAt: parsed.current_registry_at,
      identities: parsed.follow_ups.filter((row) => row.source !== "hub_camera").map((row) => ({
        source: row.source as HAIdentitySource,
        id: safeText(row.id), name: safeText(row.name),
        ownerGroup: row.integration_group_owner_supplied,
      })),
    };
  }
  throw new Error("Choose a Build 107 inventory or Build 110 worklist JSON.");
}

/** Exact-ID inventory matching only. A platform is a discovery hint, not proof of an integration's ownership. */
export function assessHADiscovery(
  prior: HAPriorEvidence,
  browser: HomeAssistantBrowserResponse,
  observedAt: string,
  marks: Readonly<Record<string, HAReviewMark>>,
  observations: Readonly<Record<string, IntegrationObservation>>,
  now = Date.now(),
): HAAssessment {
  const time = Date.parse(observedAt);
  const later = Number.isFinite(time) && time > Date.parse(prior.sourceAt);
  const fresh = Number.isFinite(time) && time <= now + 60_000 && now - time <= 300_000;
  const deviceIds = new Set(browser.devices.map((item) => item.device_id));
  const entityById = new Map(browser.entities.map((item) => [item.entity_id, item]));
  const linked = new Map<string, typeof browser.entities>();
  const platforms = new Map<string, { entities: number; unavailable: number }>();
  for (const entity of browser.entities) {
    if (entity.device_id) linked.set(entity.device_id, [...(linked.get(entity.device_id) ?? []), entity]);
    if (entity.platform && /^[\w.-]{1,64}$/.test(entity.platform)) {
      const stats = platforms.get(entity.platform) ?? { entities: 0, unavailable: 0 };
      stats.entities++;
      if (entity.state === "unavailable" || entity.state === "unknown") stats.unavailable++;
      platforms.set(entity.platform, stats);
    }
  }
  const rows = prior.identities.map((identity): HAReviewRow => {
    const key = closureKey(identity.source, identity.id);
    const entity = identity.source === "ha_entity" ? entityById.get(identity.id) : null;
    const neighbors = identity.source === "ha_device" ? linked.get(identity.id) ?? [] : [];
    const present = identity.source === "ha_device" ? deviceIds.has(identity.id) : Boolean(entity);
    const offline = present && (identity.source === "ha_entity"
      ? entity?.state === "unavailable" || entity?.state === "unknown"
      : neighbors.length > 0 && neighbors.every((item) => item.state === "unavailable" || item.state === "unknown"));
    const state: HAIdentityState = !present ? "absent" : offline ? "unavailable" : "reported";
    const hints = [...new Set((entity ? [entity] : neighbors).map((item) => item.platform).filter((value): value is string => Boolean(value && /^[\w.-]{1,64}$/.test(value))))];
    const mark = marks[key];
    const group = mark?.group || identity.ownerGroup || null;
    const validGroup = group ? validateOwnerIntegrationName(group) : null;
    const integrationObservation = validGroup ? observations[validGroup] ?? "unchecked" : "unchecked";
    const ownerObservedFunction = Boolean(
      later && fresh && state === "reported" && validGroup && integrationObservation === "visible" && mark?.verifiedFunction,
    );
    return {
      key, source: identity.source, id: identity.id, name: identity.name,
      integrationGroup: validGroup, platformHint: hints.length === 1 ? hints[0] : null,
      state, integrationObservation, ownerObservedFunction,
      hold: !ownerObservedFunction,
      nextStep: !later || !fresh ? "Refresh a later, five-minute-fresh HA registry reading." :
        state === "absent" ? "Check HA Settings → Devices & services, integration entry, then device power/network. Do not re-add blindly." :
          state === "unavailable" ? "Registry identity exists but reports unavailable/unknown. Check integration diagnostics and device connectivity." :
            !validGroup ? "Confirm which HA integration owns this exact identity; platform alone is only a hint." :
              integrationObservation !== "visible" ? "Inspect the integration in HA and record whether it is visible, absent or needs attention." :
                "Owner tests the real device/entity function; a present registry entry is not functional acceptance.",
    };
  });
  return {
    later, fresh, rows,
    platforms: [...platforms].map(([platform, counts]) => ({ platform, ...counts })).sort((a, b) => a.platform.localeCompare(b.platform)),
    counts: {
      absent: rows.filter((row) => row.state === "absent").length,
      unavailable: rows.filter((row) => row.state === "unavailable").length,
      reported: rows.filter((row) => row.state === "reported").length,
      ownerObserved: rows.filter((row) => row.ownerObservedFunction).length,
      openHolds: rows.filter((row) => row.hold).length,
    },
  };
}

export function createHADiscoveryReceipt(prior: HAPriorEvidence, assessment: HAAssessment, observedAt: string) {
  if (!assessment.later || !assessment.fresh) throw new Error("A later, fresh HA registry reading is required for export.");
  return {
    schema: "rosevear-ha-integration-discovery/v1",
    generated_at: new Date().toISOString(),
    prior_source: prior.source,
    prior_registry_at: prior.sourceAt,
    current_registry_at: observedAt,
    status: "FIELD_DEVICE_ACCEPTANCE_HOLD",
    counts: assessment.counts,
    // Minimal private identity-only handoff. No entity attributes, hostnames, URLs, tokens or platform metadata.
    identities: assessment.rows.map((row) => ({
      source: row.source, id: row.id, integration_group_owner_confirmed: row.integrationGroup,
      integration_observation: row.integrationObservation,
      registry_state: row.state,
      owner_observed_function_this_session: row.ownerObservedFunction,
      remains_held: row.hold,
    })),
  };
}
