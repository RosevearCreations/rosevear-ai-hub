import type {
  HomeAssistantBrowserResponse,
  HomeAssistantControlPolicy,
  HomeAssistantSceneStep,
} from "./api";

export type SafeSceneTarget = {
  entity_id: string;
  label: string;
  area: string;
  state: string;
  domain: "light" | "switch";
};

const unsafeHints = [
  "alarm", "security", "lock", "garage", "gate", "thermostat", "heater", "heating",
  "furnace", "boiler", "kiln", "forge", "laser", "cnc", "saw", "lathe", "welder",
  "compressor", "machine", "machinery", "workshop", "power tool", "chemical",
];

/** Display-only conservative shortlist; server policy and source freshness are final. */
export function safeSceneTargets(
  browser: HomeAssistantBrowserResponse,
  policy: HomeAssistantControlPolicy,
): SafeSceneTarget[] {
  const policyById = new Map(policy.candidates.map((item) => [item.entity_id, item]));
  const allowed = new Set(policy.allowed_entity_ids);
  return browser.entities.flatMap((item) => {
    const candidate = policyById.get(item.entity_id);
    const label = item.friendly_name || item.entity_id;
    const searchable = (item.entity_id + " " + label).toLowerCase().replaceAll("-", " ");
    if (!candidate || !candidate.allowed || candidate.blocked_reason || !allowed.has(item.entity_id)
      || (item.domain !== "light" && item.domain !== "switch") || !["on", "off"].includes(item.state)
      || unsafeHints.some((hint) => searchable.includes(hint))) return [];
    return [{ entity_id: item.entity_id, label, area: item.area_name || "Unassigned",
      state: item.state, domain: item.domain as "light" | "switch" }];
  }).sort((a, b) => a.area.localeCompare(b.area) || a.label.localeCompare(b.label));
}

export function validSceneDraft(actions: HomeAssistantSceneStep[], eligible: SafeSceneTarget[]): boolean {
  const byId = new Set(eligible.map((item) => item.entity_id));
  return actions.length >= 1 && actions.length <= 4
    && new Set(actions.map((item) => item.entity_id)).size === actions.length
    && actions.every((item) => byId.has(item.entity_id) && ["on", "off"].includes(item.action));
}
