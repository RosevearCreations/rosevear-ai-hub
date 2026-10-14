import { useEffect, useState } from "react";

type Method = "unverified" | "rtsp" | "onvif" | "manufacturer" | "alexa_only" | "unsupported";
type Device = { id: string; brand: string; model: string; location: string; method: Method; evidence: string; approved: boolean };
const KEY = "rosevear.camera.compatibility.v1";
const brands = ["Blink", "littlelf", "Nooie", "Netvue", "Alarm.com", "SkyBell", "IQ Panel", "Other"];
const methods: { value: Method; label: string }[] = [
  { value: "unverified", label: "Unverified" }, { value: "rtsp", label: "RTSP (documentation verified)" },
  { value: "onvif", label: "ONVIF (documentation verified)" },
  { value: "manufacturer", label: "Manufacturer-authorized integration" },
  { value: "alexa_only", label: "Alexa viewing only (not a Hub stream)" },
  { value: "unsupported", label: "No supported Hub connection verified" },
];
function load(): Device[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.slice(0, 100).filter((item): item is Device =>
      !!item && typeof item === "object" && typeof item.id === "string" &&
      typeof item.brand === "string" && typeof item.model === "string" &&
      typeof item.location === "string" && typeof item.evidence === "string" &&
      typeof item.approved === "boolean" && methods.some((m) => m.value === item.method)
    );
  } catch { return []; }
}
export function CameraCompatibilityWorkbench({ canAdminister }: { canAdminister: boolean }) {
  const [devices, setDevices] = useState<Device[]>(load);
  const [brand, setBrand] = useState("Blink");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(devices)); }
    catch { setNotice("Local storage unavailable. Export inventory before closing the browser."); }
  }, [devices]);
  function change(id: string, patch: Partial<Device>) {
    setDevices((current) => current.map((item) => item.id === id ? { ...item, ...patch, approved: false } : item));
  }
  function add() {
    if (!model.trim() || devices.length >= 100) { setNotice("Enter an exact model; maximum 100 entries."); return; }
    setDevices((old) => [...old, { id: crypto.randomUUID(), brand, model: model.trim(), location: location.trim(), method: "unverified", evidence: "", approved: false }]);
    setModel(""); setLocation(""); setNotice("Saved to this browser's local inventory. No camera connection was attempted.");
  }
  function approve(id: string) {
    setDevices((current) => current.map((item) =>
      item.id === id && item.method !== "unverified" && item.method !== "unsupported" &&
      item.evidence.trim().length >= 8 ? { ...item, approved: true } : item));
    setNotice("Approval records a reviewed plan only; it does not enable a device or create a stream.");
  }
  function exportInventory() {
    const safe = devices.map(({ brand: b, model: m, location: l, method, evidence, approved }) =>
      ({ brand: b, model: m, location: l, method, evidence, approved }));
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "camera-compatibility-inventory.json"; anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="panel" aria-label="Model-specific camera compatibility">
      <h2>Build 073 — Camera model verification and owner review</h2>
      <p>This inventory persists <strong>in this browser only</strong>. It is not the Hub's shared database or an active
        camera registration. An Alexa screen showing live video does not establish RTSP or ONVIF availability.</p>
      {canAdminister ? (
        <div className="camera-discovery-choice">
          <label>Brand <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select></label>
          <label>Exact model <input value={model} maxLength={120} onChange={(e) => setModel(e.target.value)} /></label>
          <label>Location (optional) <input value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} /></label>
          <button type="button" onClick={add}>Save model</button>
        </div>
      ) : <p>Owner or Administrator access is required to edit compatibility records.</p>}
      {devices.length === 0 ? <p>No camera models recorded yet.</p> : (
        <ul>{devices.map((item) => (
          <li key={item.id}>
            <strong>{item.brand} — {item.model}</strong>{item.location ? " (" + item.location + ")" : ""}
            <p>{item.approved ? "Reviewed and approved (planning only)" : "Awaiting owner review"}</p>
            <label>Verified compatibility method <select disabled={!canAdminister} value={item.method}
              onChange={(e) => change(item.id, { method: e.target.value as Method })}>
              {methods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select></label>
            <label>Evidence (manual/documentation reference, never credentials)
              <input disabled={!canAdminister} maxLength={400} value={item.evidence}
                placeholder="Manufacturer model guide or approved service information"
                onChange={(e) => change(item.id, { evidence: e.target.value })} />
            </label>
            {canAdminister ? (
              <div>
                <button type="button" disabled={item.approved || item.evidence.trim().length < 8 ||
                  item.method === "unverified" || item.method === "unsupported"}
                  onClick={() => approve(item.id)}>Approve connection plan only</button>{" "}
                <button type="button" onClick={() => setDevices((old) => old.filter((v) => v.id !== item.id))}>Remove</button>
              </div>
            ) : null}
          </li>
        ))}</ul>
      )}
      {devices.length > 0 && <button type="button" onClick={exportInventory}>Export inventory JSON</button>}
      {notice && <p role="status">{notice}</p>}
      <p>No scans, token extraction, camera activation, recording, port changes, or go2rtc/Frigate writes occur.
        Export before clearing browser data. Do not enter passwords or stream URLs as evidence.</p>
    </section>
  );
}
