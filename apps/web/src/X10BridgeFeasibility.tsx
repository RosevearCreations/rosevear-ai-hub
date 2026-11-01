import { useState } from "react";

export const X10_DEVICE_TYPES = [
  { name: "X10 PowerHouse module", need: "Exact module ID/address plus a verified powerline or RF X10 controller/interface." },
  { name: "X10 motion sensor", need: "Exact model, RF receiver/transceiver, and a safely bounded event bridge." },
  { name: "X10 pan/tilt mount", need: "Model-specific controller and a supported control interface; no camera motion commands here." },
] as const;

export function x10BridgeReadback({ mqttAvailable, observedTopics, interfaceVerified, ownerAuthorized }: {
  mqttAvailable: boolean; observedTopics: number | null; interfaceVerified: boolean; ownerAuthorized: boolean;
}) {
  const missing = [
    ...(!interfaceVerified ? ["X10 hardware interface and model are not independently verified"] : []),
    ...(!mqttAvailable ? ["MQTT broker is not observed online"] : []),
    ...(observedTopics === null ? ["MQTT topic evidence unavailable"] : observedTopics === 0 ? ["No bounded MQTT topic observations"] : []),
    ...(!ownerAuthorized ? ["Owner authorization not recorded"] : []),
  ];
  return { status: "FEASIBILITY ONLY — NO CONTROL", missing,
    topicSummary: observedTopics === null ? "Topic observation unavailable" : `${observedTopics} bounded observed topic${observedTopics === 1 ? "" : "s"}; none prove X10 linkage`,
  };
}

/** In-memory owner planning only: this panel has no network write handlers. */
export function X10BridgeFeasibility({ mqttAvailable, observedTopics, canReview }: {
  mqttAvailable: boolean; observedTopics: number | null; canReview: boolean;
}) {
  const [interfaceVerified, setInterfaceVerified] = useState(false);
  const [ownerAuthorized, setOwnerAuthorized] = useState(false);
  const [deviceType, setDeviceType] = useState<string>(X10_DEVICE_TYPES[0].name);
  const [notes, setNotes] = useState("");
  const status = x10BridgeReadback({ mqttAvailable, observedTopics, interfaceVerified, ownerAuthorized });
  return <section className="panel" aria-label="Build 215 MQTT and X10 feasibility workbench">
    <h2>Legacy X10 and MQTT bridge feasibility</h2>
    <p><strong>{status.status}</strong>. Existing broker topic observations are read-only and are not a scan.
      Neither a green MQTT connection nor an Alexa/Home Assistant device proves that any X10 bridge exists.</p>
    <p>{status.topicSummary}</p>
    <ul>{X10_DEVICE_TYPES.map((device) => <li key={device.name}>
      <strong>{device.name}</strong> — {device.need} Compatibility: unverified until exact physical hardware is inspected.
    </li>)}</ul>
    {canReview ? <fieldset>
      <legend>Owner planning checklist (this session only)</legend>
      <label>Legacy equipment type <select value={deviceType} onChange={(event) => setDeviceType(event.target.value)}>
        {X10_DEVICE_TYPES.map((item) => <option key={item.name}>{item.name}</option>)}
      </select></label>
      <label><input type="checkbox" checked={interfaceVerified} onChange={(event) => setInterfaceVerified(event.target.checked)} /> Exact X10 controller/interface independently checked</label>
      <label><input type="checkbox" checked={ownerAuthorized} onChange={(event) => setOwnerAuthorized(event.target.checked)} /> Owner permission discussed for a future offline trial</label>
      <label>Non-secret notes (not saved) <input maxLength={180} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Model or interface name only" /></label>
      <p>Selected: {deviceType}. Notes remain in this view only; no addresses, credentials or command payloads are stored or transmitted.</p>
      <button type="button" onClick={() => { setInterfaceVerified(false); setOwnerAuthorized(false); setNotes(""); }}>Reset feasibility review</button>
    </fieldset> : <p>Owner/Administrator access is needed for local checklist editing; device controls remain unavailable to all roles.</p>}
    {status.missing.length > 0 ? <ul aria-label="Unverified bridge requirements">{status.missing.map((item) => <li key={item}>{item}</li>)}</ul>
      : <p>Prerequisites were marked in this browser, but no physical bridge, safe-stop, exact topic mapping or independent field test has been verified.</p>}
    <details><summary><span aria-hidden="true">ⓘ</span> Preview-only X10 motion → Meross idea</summary>
      <ol>
        <li>X10 motion sensor emits a signal (requires its exact compatible RF interface).</li>
        <li>An authorized X10 bridge would translate the event into a dedicated, allowlisted MQTT topic.</li>
        <li>Home Assistant would review identity, freshness, occupancy and manual safe-stop before any rule is approved.</li>
        <li>A future separately authorized rule could propose a Meross device action. No rule is installed or device triggered here.</li>
      </ol>
    </details>
    <p>Safety gate: no MQTT publish, Home Assistant service action, X10 command, pan/tilt movement, Meross trigger or new subscription is performed. QL-275 remains deferred.</p>
  </section>;
}
