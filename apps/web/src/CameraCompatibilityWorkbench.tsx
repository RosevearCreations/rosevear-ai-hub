import { useState } from "react";

type Entry = { id: number; brand: string; model: string; location: string; connection: string };
const brands = ["Blink", "littlelf", "Nooie", "Netvue", "Alarm.com", "SkyBell", "IQ Panel", "Other"];
const guidance: Record<string, string> = {
  Blink: "Alexa viewing does not establish a reusable local RTSP stream. Verify model and supported manufacturer integrations.",
  littlelf: "Alexa viewing is evidence of a supported manufacturer-to-Alexa route, not proof of local RTSP or ONVIF.",
  Nooie: "Local transport support varies by model; verify manufacturer documentation before enabling any stream.",
  Netvue: "Verify model-specific ONVIF, RTSP or documented manufacturer integrations.",
  "Alarm.com": "May require an active authorized account/service; do not attempt credential extraction.",
  SkyBell: "Typically uses its vendor integration; verify device generation and authorized account access.",
  "IQ Panel": "Security controller, not a general-purpose RTSP camera; never bypass alarm access controls.",
  Other: "Document exact manufacturer and model before testing local connectivity.",
};

export function CameraCompatibilityWorkbench() {
  const [brand, setBrand] = useState("Blink");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notice, setNotice] = useState("");
  function add() {
    if (!model.trim() || model.trim().length > 120 || location.length > 120) {
      setNotice("Enter a model (1–120 characters); location is optional (maximum 120).");
      return;
    }
    setEntries((old) => [...old, { id: Date.now() + old.length, brand, model: model.trim(), location: location.trim(), connection: "Unverified" }]);
    setModel(""); setLocation("");
    setNotice("Added to this browser session only. Nothing was scanned or saved to the Hub database.");
  }
  function copyInventory() {
    const data = JSON.stringify(entries.map(({ brand: b, model: m, location: l, connection: c }) => ({ brand: b, model: m, location: l, connection: c })), null, 2);
    void navigator.clipboard.writeText(data).then(
      () => setNotice("Inventory copied. Keep device details private."),
      () => setNotice("Copy unavailable; use a supported secure browser context."),
    );
  }
  return (
    <section className="panel" aria-label="Multi-brand camera compatibility workbench">
      <h2>Build 072 — Multi-brand camera compatibility</h2>
      <p>List existing equipment before trying ONVIF discovery. This is a <strong>browser-session planning worksheet</strong>,
        not a persistent camera registration or a network scanner. No camera is enabled, contacted or modified.</p>
      <p>Alexa live-view support alone does not mean a third-party application can access the same video feed.</p>
      <div className="camera-discovery-choice">
        <label>Brand <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select></label>
        <label>Exact model <input value={model} maxLength={120} onChange={(e) => setModel(e.target.value)} placeholder="Model number from label or app" /></label>
        <label>Room/location (optional) <input value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} /></label>
        <button type="button" onClick={add}>Add to planning worksheet</button>
      </div>
      <p><strong>Compatibility note:</strong> {guidance[brand]}</p>
      {entries.length > 0 ? (
        <div>
          <ul>{entries.map((entry) => (
            <li key={entry.id}>{entry.brand} — {entry.model}{entry.location ? " (" + entry.location + ")" : ""}: {entry.connection}{" "}
              <button type="button" onClick={() => setEntries((old) => old.filter((v) => v.id !== entry.id))}>Remove</button>
            </li>
          ))}</ul>
          <button type="button" onClick={copyInventory}>Copy inventory as JSON</button>{" "}
          <button type="button" onClick={() => { setEntries([]); setNotice("Local worksheet cleared."); }}>Clear worksheet</button>
        </div>
      ) : <p>No models listed yet. Existing registered Hub cameras remain unchanged.</p>}
      {notice ? <p role="status">{notice}</p> : null}
      <p>Supported next steps require exact models and manufacturer documentation. Do not intercept Alexa traffic,
        capture proprietary tokens, expose local camera ports publicly or test unknown devices without approval.</p>
    </section>
  );
}
