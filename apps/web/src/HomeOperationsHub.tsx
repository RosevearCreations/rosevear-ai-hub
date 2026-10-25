import { useState } from "react";

import type { AuthRole, HomeAssistantBrowserResponse } from "./api";
import type { ReadinessState } from "./OperationsDashboard";

type Observation = { status: ReadinessState; detail: string };
export type HomeOperationsSnapshot = {
  sampledAt: Date;
  health: Record<"hub" | "ha" | "mqtt" | "camera" | "ollama", Observation>;
  rooms: { id: string; name: string; devices: number; entities: number }[];
  roomsAvailable: boolean;
  roomTotal: number;
};

type Context = "Home" | "Cameras" | "Workshop" | "Services";

// Reject accidental connection strings or credentials in upstream user-defined area names.
// Room metadata is useful, but it is not a place to display free-form provider diagnostics.
export function safeAreaLabel(name: unknown, index: number): string {
  if (typeof name !== "string") return `Room ${index + 1}`;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60 || /(?:https?:\/\/|rtsp:|@|password|secret|token|api.key|\\|\n|\r)/i.test(trimmed)) {
    return `Room ${index + 1}`;
  }
  return trimmed;
}

function available(outcome: PromiseSettledResult<unknown>): outcome is PromiseFulfilledResult<unknown> {
  return outcome.status === "fulfilled" && !!outcome.value && typeof outcome.value === "object";
}

const notVerified: Observation = {
  status: "unknown",
  detail: "Not verified on this check. Open the original section to investigate.",
};

export function buildHomeOperationsSnapshot(
  outcomes: PromiseSettledResult<unknown>[],
  sampledAt: Date,
): HomeOperationsSnapshot {
  // Fetch order: HA, MQTT, cameras, knowledge, business, Hub, Ollama, HA room browser.
  const [ha, mqtt, camera, , , hub, ollama, browser] = outcomes;
  const service = (result: PromiseSettledResult<unknown>): Observation => {
    if (!available(result)) return notVerified;
    const data = result.value as { configured?: boolean; available?: boolean };
    return data.available === true
      ? { status: "ready", detail: "Connection reported available at the last check." }
      : data.configured === false
        ? { status: "optional", detail: "Not configured. Set up in the original section if needed." }
        : data.configured === true
          ? { status: "attention", detail: "Configured but not responding at the last check." }
          : notVerified;
  };
  const health: HomeOperationsSnapshot["health"] = {
    ha: service(ha),
    mqtt: service(mqtt),
    camera: notVerified,
    hub: available(hub) && (hub.value as { status?: string }).status === "ok"
      ? { status: "ready", detail: "Hub health endpoint responded OK at the last check." }
      : notVerified,
    ollama: available(ollama)
      ? (ollama.value as { available?: boolean }).available === true
        ? { status: "ready", detail: "Local model service reported available at the last check." }
        : { status: "attention", detail: "Local model service did not respond as available at the last check." }
      : notVerified,
  };
  if (available(camera)) {
    const data = camera.value as { total?: number; healthy?: number; attention?: number };
    if (Number.isSafeInteger(data.total) && (data.total ?? -1) >= 0
        && Number.isSafeInteger(data.attention) && (data.attention ?? -1) >= 0
        && Number.isSafeInteger(data.healthy) && (data.healthy ?? -1) >= 0) {
      const total = data.total ?? 0;
      const attention = data.attention ?? 0;
      const healthy = data.healthy ?? 0;
      health.camera = total === 0
        ? { status: "optional", detail: "No cameras registered in the Hub; physical inventory is not verified." }
        : attention > 0 || healthy < total
          ? { status: "attention", detail: `${attention} need review; ${healthy} reported healthy out of ${total} registered.` }
          : { status: "ready", detail: `${healthy} of ${total} registered cameras reported healthy.` };
    }
  }
  let rooms: HomeOperationsSnapshot["rooms"] = [];
  let roomTotal = 0;
  let roomsAvailable = false;
  if (available(browser)) {
    const data = browser.value as Partial<HomeAssistantBrowserResponse>;
    if (Array.isArray(data.areas) && Array.isArray(data.devices) && Array.isArray(data.entities)) {
      roomsAvailable = true;
      roomTotal = data.areas.length;
      const ids = new Set<string>();
      rooms = data.areas.slice(0, 100).flatMap((area, index) => {
        if (typeof area?.area_id !== "string" || ids.has(area.area_id)) return [];
        ids.add(area.area_id);
        return [{
          id: area.area_id,
          name: safeAreaLabel(area.name, index),
          devices: data.devices!.filter((device) => device.area_id === area.area_id).length,
          entities: data.entities!.filter((entity) => entity.area_id === area.area_id).length,
        }];
      }).sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return { sampledAt, health, rooms, roomsAvailable, roomTotal };
}

const sectionsByContext: Record<Context, { label: string; route: string; description: string; administrator?: boolean }[]> = {
  Home: [
    { label: "Devices", route: "Devices", description: "Browse rooms, entities and approved controls." },
    { label: "MQTT", route: "MQTT", description: "Review broker connections and available topics." },
    { label: "Notifications", route: "Notifications", description: "Read local alerts and follow-ups." },
  ],
  Cameras: [
    { label: "Camera dashboard", route: "Cameras", description: "Review registered cameras and their status." },
    { label: "Devices", route: "Devices", description: "Cross-check Home Assistant identities." },
    { label: "Notifications", route: "Notifications", description: "Review camera-related alerts." },
  ],
  Workshop: [
    { label: "Workshop", route: "Workshop", description: "Open workshop operations and tools.", administrator: true },
    { label: "Knowledge", route: "Knowledge", description: "Find workshop notes and references." },
    { label: "Local AI", route: "Chat", description: "Ask a question without triggering machinery." },
  ],
  Services: [
    { label: "System", route: "System", description: "Open Hub and local service diagnostics." },
    { label: "Business", route: "Business", description: "Review existing business connectors." },
    { label: "MQTT", route: "MQTT", description: "Inspect broker readiness." },
  ],
};

const healthLabels: { key: keyof HomeOperationsSnapshot["health"]; label: string; route: string }[] = [
  { key: "hub", label: "Hub", route: "System" },
  { key: "ha", label: "Home Assistant", route: "Devices" },
  { key: "mqtt", label: "MQTT", route: "MQTT" },
  { key: "camera", label: "Cameras", route: "Cameras" },
  { key: "ollama", label: "Ollama", route: "Chat" },
];

const stateNames: Record<ReadinessState, string> = {
  ready: "Reported available", attention: "Needs review", optional: "Not configured", unknown: "Not verified",
};

export function HomeOperationsHub({ snapshot, loading, role, onNavigate }: {
  snapshot: HomeOperationsSnapshot | null;
  loading: boolean;
  role: AuthRole;
  onNavigate: (section: string) => void;
}) {
  const [context, setContext] = useState<Context>("Home");
  const [roomFilter, setRoomFilter] = useState("all");
  const isAdministrator = role === "owner" || role === "administrator";
  const rooms = snapshot?.rooms ?? [];
  const visibleRooms = roomFilter === "all" ? rooms : rooms.filter((room) => room.id === roomFilter);
  const timestamp = snapshot?.sampledAt.toLocaleString();
  const stale = snapshot && Date.now() - snapshot.sampledAt.getTime() > 5 * 60 * 1000;

  return <section className="home-operations-hub" aria-label="Home operations command center">
    <header className="home-ops-heading">
      <div>
        <p className="home-ops-eyebrow">Rosevear home · read-only command center</p>
        <h3>Home operations</h3>
        <p>Choose a room or working area, check what was last observed, then open the right screen.</p>
      </div>
      <details className="home-ops-help">
        <summary aria-label="Information about home operations">ⓘ Help</summary>
        <p>These are manually refreshed snapshots, not live monitoring or permission to operate equipment.
          Room counts describe Home Assistant inventory, not whether individual devices work.
          Open the original screen to verify conditions before acting.</p>
      </details>
    </header>
    <div className="home-ops-contexts" role="group" aria-label="Home operations categories">
      {(["Home", "Cameras", "Workshop", "Services"] as const).map((item) =>
        <button type="button" key={item} aria-pressed={context === item}
          onClick={() => setContext(item)}>{item} routes</button>)}
    </div>
    <p className="home-ops-observation" role="status">
      {!snapshot ? "Waiting for the first manual service check…"
        : `${loading ? "Refreshing; showing the previous check. " : ""}${stale ? "Stale observation" : "Last observed"}: ${timestamp}. Not continuously monitored.`}
    </p>
    <div className="home-ops-health" aria-label="Integration health snapshots">
      {healthLabels.map((item) => {
        const observation = snapshot?.health[item.key] ?? notVerified;
        return <article key={item.key} className="home-ops-health-card">
          <h4>{item.label}</h4>
          <strong className={`operations-state operations-${observation.status}`}>{stateNames[observation.status]}</strong>
          <p>{snapshot ? observation.detail : "Awaiting an explicit check."}</p>
          <small>{timestamp ? `Observed: ${timestamp}` : "Never observed this session"}</small>
          <button type="button" onClick={() => onNavigate(item.route)}>Inspect {item.label}</button>
        </article>;
      })}
    </div>
    <section className="home-ops-routes" aria-label={`${context} quick navigation`}>
      <h4>{context} quick navigation</h4>
      <div className="home-ops-route-grid">
        {sectionsByContext[context].filter((link) => !link.administrator || isAdministrator).map((link) =>
          <button type="button" key={link.route} onClick={() => onNavigate(link.route)}>
            <strong>{link.label} ↗</strong><span>{link.description}</span>
          </button>)}
      </div>
      {context === "Workshop" && !isAdministrator && <small>Workshop administration is available to authorized operators only.</small>}
    </section>
    {context === "Home" && <section className="home-ops-rooms" aria-label="Home Assistant room inventory">
      <div className="home-ops-room-toolbar">
        <div>
          <h4>Rooms in Home Assistant</h4>
          <p>Inventory only · {snapshot?.roomsAvailable ? `${snapshot.roomTotal} rooms observed` : "Room directory not verified"}</p>
        </div>
        {rooms.length > 0 && <label>Filter by room
          <select value={rooms.some((room) => room.id === roomFilter) ? roomFilter : "all"}
            onChange={(event) => setRoomFilter(event.target.value)}>
            <option value="all">All observed rooms</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>}
      </div>
      {!snapshot?.roomsAvailable ? <p>Room directory unavailable or not configured at the last check. Open Devices to inspect Home Assistant.</p>
        : rooms.length === 0 ? <p>No rooms are currently listed. Devices may still exist without room assignments.</p>
        : <>
          <div className="home-ops-room-grid">
            {visibleRooms.slice(0, 12).map((room) => <article key={room.id}>
              <h5>{room.name}</h5>
              <p>{room.devices} registered devices · {room.entities} entities</p>
              <small>State not checked per device</small>
              <button type="button" onClick={() => onNavigate("Devices")}>Browse {room.name} devices</button>
            </article>)}
          </div>
          {visibleRooms.length > 12 && <p>Showing 12 of {visibleRooms.length} observed rooms. Filter above or open Devices to see the complete directory.</p>}
          {snapshot.roomTotal > rooms.length && <p>Showing at most 100 room records. Open Devices for the full inventory.</p>}
        </>}
    </section>}
    <small className="home-ops-footnote">Navigation opens existing authenticated views. This command center never sends physical commands, loads camera streams or exposes connection credentials.</small>
  </section>;
}
