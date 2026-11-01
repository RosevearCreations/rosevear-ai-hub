import type { HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { safeSceneTargets } from "./sceneDraftModel";

export type RoomReviewItem = { entityId: string; label: string; domain: string; state: string;
  status: "current" | "stale" | "unknown"; actionEligible: boolean };

export function summarizeHomeOperationsRooms(browser: HomeAssistantBrowserResponse | null,
  policy: HomeAssistantControlPolicy | null, now = Date.now()) {
  if (!browser) return { available: false, rooms: [] as { name: string; items: RoomReviewItem[] }[],
    staleCount: null as number | null, unknownCount: null as number | null };
  const rooms = new Map<string, RoomReviewItem[]>();
  const safeIds = new Set(policy ? safeSceneTargets(browser, policy).map(item => item.entity_id) : []);
  let staleCount = 0;
  let unknownCount = 0;
  for (const entity of browser.entities) {
    const observed = Date.parse(entity.last_updated ?? "");
    const hasTime = Number.isFinite(observed) && observed <= now + 30_000;
    const unknownState = ["unknown", "unavailable", ""].includes(entity.state.toLowerCase());
    const status = unknownState || !hasTime ? "unknown" : now - observed > 24 * 60 * 60_000 ? "stale" : "current";
    if (status === "unknown") unknownCount++;
    if (status === "stale") staleCount++;
    const item: RoomReviewItem = {
      entityId: entity.entity_id, label: entity.friendly_name || entity.entity_id,
      domain: entity.domain, state: unknownState ? "Not verified" : entity.state,
      status, actionEligible: safeIds.has(entity.entity_id),
    };
    const room = entity.area_name?.trim() || "Unassigned room";
    rooms.set(room, [...(rooms.get(room) ?? []), item]);
  }
  return { available: true, rooms: [...rooms].map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name)), staleCount, unknownCount };
}
