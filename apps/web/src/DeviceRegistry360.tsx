import { useEffect, useMemo, useState } from "react";

import {
  getCameraDashboard, getCameras, getDeviceRegistryReviews, getMQTTStatus,
  reviewDeviceRegistryAnnotation, reviewDeviceRegistryMatch,
  type AuthRole, type CameraDashboard, type CameraRecord,
  type DeviceRegistryAnnotation, type DeviceRegistryReviews,
  type DeviceRegistrySource, type HomeAssistantBrowserResponse,
  type HomeAssistantControlPolicy,
} from "./api";
import { compileRegistry, registryKey, suggestRegistryMatches } from "./registryIdentityModel";

const emptyReviews: DeviceRegistryReviews = { annotations: [], matches: [] };
const sourceNames: Record<DeviceRegistrySource, string> = {
  ha_device: "Home Assistant device", ha_entity: "Home Assistant entity",
  camera: "Camera", mqtt: "MQTT reviewed topic",
};

export function DeviceRegistry360({ role, browser, policy, onRefreshInventory }: {
  role: AuthRole;
  browser: HomeAssistantBrowserResponse | null;
  policy: HomeAssistantControlPolicy | null;
  onRefreshInventory?: () => Promise<void>;
}) {
  const canReview = role === "owner" || role === "administrator";
  const [cameras, setCameras] = useState<CameraRecord[] | null>(null);
  const [cameraHealth, setCameraHealth] = useState<CameraDashboard | null>(null);
  const [mqttState, setMqttState] = useState<"checking" | "connected" | "offline" | "unverified">("checking");
  const [reviews, setReviews] = useState<DeviceRegistryReviews>(emptyReviews);
  const [reviewsVerified, setReviewsVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<DeviceRegistrySource | "all">("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [alias, setAlias] = useState("");
  const [roomLabel, setRoomLabel] = useState("");
  const [disposition, setDisposition] = useState<DeviceRegistryAnnotation["disposition"]>("needs_investigation");
  const [mqttTopic, setMqttTopic] = useState("");
  const [mqttAcknowledged, setMqttAcknowledged] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh(signal?: AbortSignal) {
    setRefreshing(true);
    const results = await Promise.allSettled([
      getCameras(signal), getCameraDashboard(signal), getMQTTStatus(signal), getDeviceRegistryReviews(signal),
    ]);
    if (signal?.aborted) return;
    setCameras(results[0].status === "fulfilled" ? results[0].value : null);
    setCameraHealth(results[1].status === "fulfilled" ? results[1].value : null);
    setMqttState(results[2].status !== "fulfilled" ? "unverified"
      : results[2].value.available ? "connected" : "offline");
    setReviewsVerified(results[3].status === "fulfilled");
    setReviews(results[3].status === "fulfilled" ? results[3].value : emptyReviews);
    setCheckedAt(new Date());
    setRefreshing(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  const entries = useMemo(() => compileRegistry(browser, cameras, cameraHealth, policy, reviews),
    [browser, cameras, cameraHealth, policy, reviews]);
  const suggestions = useMemo(() => suggestRegistryMatches(entries, reviews), [entries, reviews]);
  const rooms = useMemo(() => Array.from(new Set(entries.map((item) => item.room))).sort(), [entries]);
  const visible = entries.filter((item) => {
    if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
    if (roomFilter !== "all" && item.room !== roomFilter) return false;
    if (stateFilter !== "all" && item.state !== stateFilter) return false;
    const needle = search.trim().toLowerCase();
    return !needle || [item.name, item.source_id, item.room, item.sourceRoom, item.source]
      .some((value) => value.toLowerCase().includes(needle));
  });
  const selected = entries.find((entry) => entry.key === selectedKey) ?? null;
  const selectedAnnotation = selected ? reviews.annotations.find((note) => registryKey(note) === selected.key) : undefined;

  function choose(key: string) {
    const entry = entries.find((item) => item.key === key);
    if (!entry) return;
    const saved = reviews.annotations.find((note) => registryKey(note) === key);
    setSelectedKey(key);
    setAlias(saved?.alias ?? "");
    setRoomLabel(saved?.room_label ?? "");
    setDisposition(saved?.disposition ?? "needs_investigation");
    setMessage("");
  }

  async function saveAnnotation() {
    if (!selected || !canReview || !reviewsVerified) return;
    setBusy(true);
    setMessage("");
    try {
      const saved = await reviewDeviceRegistryAnnotation({ source: selected.source, source_id: selected.source_id,
        alias: alias.trim(), room_label: roomLabel.trim(), disposition,
        expected_revision: selectedAnnotation?.revision ?? 0 });
      setReviews((current) => ({ ...current,
        annotations: [...current.annotations.filter((note) => registryKey(note) !== selected.key), saved] }));
      setMessage("Local identity metadata reviewed and saved. No provider records or devices were changed.");
    } catch {
      setMessage("Could not save review. Refresh the registry to check permissions, changes or source identity conflicts.");
    } finally { setBusy(false); }
  }

  async function saveMatch(key: string, decision: "possible_match" | "distinct" | "investigate") {
    const suggestion = suggestions.find((item) => item.key === key);
    if (!suggestion || !canReview || !reviewsVerified) return;
    setBusy(true);
    setMessage("");
    try {
      const saved = await reviewDeviceRegistryMatch({
        left: suggestion.left, right: suggestion.right, decision,
        expected_revision: suggestion.revision,
      });
      const matchKey = (item: typeof saved) => [registryKey(item.left), registryKey(item.right)].sort().join("|");
      setReviews((current) => ({ ...current,
        matches: [...current.matches.filter((review) => matchKey(review) !== suggestion.key), saved],
      }));
      setMessage("Possible-identity relationship reviewed. No device records were merged or paired.");
    } catch {
      setMessage("Could not save match review. Refresh the registry and recheck both exact source IDs.");
    } finally { setBusy(false); }
  }

  async function addMqttReference() {
    if (!canReview || !reviewsVerified || !mqttAcknowledged || !mqttTopic.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const source_id = mqttTopic.trim();
      const existing = reviews.annotations.find((note) => note.source === "mqtt" && note.source_id === source_id);
      const saved = await reviewDeviceRegistryAnnotation({
        source: "mqtt", source_id, alias: "", room_label: "", disposition: "reviewed",
        expected_revision: existing?.revision ?? 0,
      });
      setReviews((current) => ({ ...current,
        annotations: [...current.annotations.filter((note) => registryKey(note) !== registryKey(saved)), saved] }));
      setMqttTopic("");
      setMqttAcknowledged(false);
      setMessage("Owner-reviewed MQTT topic reference saved. No subscription, publish or pairing occurred.");
    } catch {
      setMessage("MQTT topic reference not saved. Use one concrete, non-secret topic and refresh before retrying.");
    } finally { setBusy(false); }
  }

  return <section id="device-registry-360" className="panel device-registry-360" aria-label="Device 360 source-aware registry">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 139 · Source-aware inventory and reviewed metadata</p>
        <h2>Device 360 registry</h2>
        <p>Compare exact Home Assistant, camera and owner-reviewed MQTT identities. Labels and possible matches are local notes—not automatic adoption or physical controls.</p>
      </div>
      <button type="button" disabled={busy || refreshing} onClick={() => {
        void Promise.all([refresh(), onRefreshInventory?.()]);
      }}>
        {refreshing ? "Checking…" : "Refresh registry"}
      </button>
    </header>
    <details className="device-registry-help">
      <summary aria-label="Information about Device 360">ⓘ Registry help &amp; safety</summary>
      <p>Each source retains its own ID. Two entries with similar names may be different devices; reviewing a possible match never links or merges them. Room labels are Hub-only annotations, not Home Assistant room reassignment. MQTT topics require a deliberate owner review and do not subscribe or publish messages.</p>
      <p>"Observed" means reported by a source reading, not physically verified or safe. An unavailable source is unverified, not proof of deletion. Use the recovery workbench below when a previously recorded identity is missing.</p>
    </details>
    <p className="device-registry-time" role="status">
      {refreshing ? "Refreshing read-only inventory… " : ""}
      {checkedAt ? `Last source check: ${checkedAt.toLocaleString()} · not continuous monitoring.` : "No source reading yet."}
      {" "}HA {browser ? "directory available" : "directory unavailable"} · Cameras {cameras ? "inventory available" : "not verified"} · MQTT {mqttState} · Review notes {reviewsVerified ? "loaded" : "unavailable"}.
    </p>
    <div className="device-registry-stats" aria-label="Device registry count by source">
      {(["ha_device", "ha_entity", "camera", "mqtt"] as const).map((source) => <div key={source}>
        <strong>{entries.filter((item) => item.source === source).length}</strong>
        <span>{sourceNames[source]}</span>
      </div>)}
    </div>
    <div className="device-registry-filters" aria-label="Device registry filters">
      <label>Search identity or room<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, provider ID or room…" /></label>
      <label>Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as DeviceRegistrySource | "all")}>
        <option value="all">All sources</option>
        {Object.entries(sourceNames).map(([source, name]) => <option key={source} value={source}>{name}</option>)}
      </select></label>
      <label>Room<select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
        <option value="all">All rooms</option>
        {rooms.map((room) => <option key={room} value={room}>{room}</option>)}
      </select></label>
      <label>State<select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
        <option value="all">All states</option>
        {(["observed", "attention", "unknown", "missing", "unsupported"] as const).map((state) => <option key={state}>{state}</option>)}
      </select></label>
      <button type="button" onClick={() => { setSearch(""); setSourceFilter("all"); setRoomFilter("all"); setStateFilter("all"); }}>Clear registry filters</button>
    </div>
    <p role="status">{visible.length} of {entries.length} source identities shown. Each is separate; counts do not represent unique physical devices.</p>
    <div className="device-registry-layout">
      <div className="device-registry-results" role="region" aria-label="Device registry results">
        {visible.length === 0 ? <p>No source identities match. Check integration availability or clear filters.</p> : visible.slice(0, 100).map((item) =>
          <button type="button" className={selectedKey === item.key ? "device-registry-selected" : ""}
            aria-pressed={selectedKey === item.key} key={item.key} onClick={() => choose(item.key)}>
            <strong>{item.name}</strong>
            <span>{sourceNames[item.source]} · {item.room}</span>
            <span>{item.state === "missing" ? "Missing from current source reading" : item.state === "unknown" ? "Not verified" : item.state === "unsupported" ? "Unsupported (owner review)" : item.state === "attention" ? "Needs review" : "Reported present"}</span>
          </button>)}
        {visible.length > 100 && <p>Showing 100 of {visible.length} results. Refine search and filters.</p>}
      </div>
      <section className="device-registry-detail" aria-label="Selected source identity">
        {!selected ? <p>Choose one source identity to review its details, available capabilities and provenance.</p> : <>
          <h3>{selected.name}</h3>
          <dl>
            <div><dt>Source</dt><dd>{sourceNames[selected.source]}</dd></div>
            <div><dt>Exact source ID</dt><dd><code>{selected.source_id}</code></dd></div>
            <div><dt>Room</dt><dd>{selected.room}{selected.room !== selected.sourceRoom ? " (Hub annotation)" : " (source)"}</dd></div>
            <div><dt>Provider room</dt><dd>{selected.sourceRoom}</dd></div>
            <div><dt>State</dt><dd>{selected.state}</dd></div>
            <div><dt>Last provider observation</dt><dd>{selected.lastObservedAt ? new Date(selected.lastObservedAt).toLocaleString() : "Unknown / not provided"}</dd></div>
            <div><dt>Capabilities</dt><dd>{selected.capabilities.length ? selected.capabilities.join(", ") : "Unverified"}</dd></div>
            <div><dt>Safe-control eligibility</dt><dd>{selected.safeControlEligible ? "Allow-listed in HA; original confirmation rules still apply" : "Not established"}</dd></div>
            {selected.parentId && <div><dt>Home Assistant device ID</dt><dd><code>{selected.parentId}</code></dd></div>}
            <div><dt>Owner review</dt><dd>{selected.disposition} · revision {selected.reviewedRevision}</dd></div>
          </dl>
          {selected.state === "missing" && <a href="#device-recovery-workbench">Review missing identity in recovery workbench</a>}
          {canReview && reviewsVerified && <div className="device-registry-editor" aria-label="Review identity metadata">
            <h4>Local annotation — owner review</h4>
            <label>Reviewed display name<input value={alias} maxLength={100} onChange={(event) => setAlias(event.target.value)} placeholder="Leave blank for provider name" /></label>
            <label>Room label<select value={roomLabel} onChange={(event) => setRoomLabel(event.target.value)}>
              <option value="">Use provider room / Unassigned</option>
              {Array.from(new Set([...(browser?.areas.map((area) => area.name) ?? []), roomLabel].filter(Boolean))).sort().map((room) => <option key={room} value={room}>{room}</option>)}
            </select></label>
            <label>Owner classification<select value={disposition} onChange={(event) => setDisposition(event.target.value as DeviceRegistryAnnotation["disposition"])}>
              <option value="needs_investigation">Needs investigation</option>
              <option value="reviewed">Reviewed identity</option>
              <option value="unsupported">Unsupported / unrecognized</option>
            </select></label>
            <button type="button" disabled={busy} onClick={() => void saveAnnotation()}>Save reviewed metadata</button>
            <small>No provider rename, room reassignment, device command or physical verification is performed.</small>
          </div>}
        </>}
      </section>
    </div>
    <section className="device-registry-matches" aria-label="Possible duplicate identities">
      <h3>Potential name matches — owner decision</h3>
      <p>Identical normalized names from separate sources are suggestions only; never automatic joins.</p>
      {suggestions.length === 0 ? <p>No cross-provider exact-name candidates in this reading. This does not prove the physical inventory is duplicate-free.</p> :
        <ul>{suggestions.map((suggestion) => <li key={suggestion.key}>
          <strong>{suggestion.leftName}</strong> ({sourceNames[suggestion.left.source]}) / <strong>{suggestion.rightName}</strong> ({sourceNames[suggestion.right.source]})
          <span> · {suggestion.decision === "unreviewed" ? "Not reviewed" : `Owner decision: ${suggestion.decision}`}</span>
          {canReview && reviewsVerified && <div className="device-registry-match-actions">
            {(["possible_match", "distinct", "investigate"] as const).map((decision) =>
              <button type="button" key={decision} disabled={busy} onClick={() => void saveMatch(suggestion.key, decision)}>
                {decision === "possible_match" ? "May be related" : decision === "distinct" ? "Keep distinct" : "Investigate"}
              </button>)}
          </div>}
        </li>)}</ul>}
    </section>
    {canReview && reviewsVerified && <section className="device-registry-mqtt" aria-label="Review MQTT topic reference">
      <h3>Register a manually reviewed MQTT topic reference</h3>
      <p>Only exact topics, not wildcards or payloads. This creates a local inventory note; it does not configure broker mappings or subscribe to messages.</p>
      <label>Exact non-secret MQTT topic<input value={mqttTopic} maxLength={255} onChange={(event) => { setMqttTopic(event.target.value); setMqttAcknowledged(false); }} placeholder="home/temperature" /></label>
      <label className="device-registry-ack"><input type="checkbox" checked={mqttAcknowledged} onChange={(event) => setMqttAcknowledged(event.target.checked)} /> I have reviewed this exact topic and understand it is an annotation only.</label>
      <button type="button" disabled={!mqttAcknowledged || !mqttTopic.trim() || busy} onClick={() => void addMqttReference()}>Save reviewed topic reference</button>
    </section>}
    {message && <p className="device-registry-feedback" role="status">{message}</p>}
    <small>Source data is not merged. The original Home Assistant, MQTT and camera permissions remain authoritative. Refresh and independently verify field conditions before taking physical action.</small>
  </section>;
}
