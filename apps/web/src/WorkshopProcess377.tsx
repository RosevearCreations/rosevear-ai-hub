import { useEffect, useState, type FormEvent } from "react";

import {
  getWorkshopProcess377Board, getWorkshopProcess377History,
  recordWorkshopProcess377,
  type WorkshopProcess377Board, type WorkshopProcess377Reading,
} from "./api";

const STATES = [
  ["unknown", "Not known"],
  ["idle_reported", "Idle (manual report)"],
  ["active_reported", "Active (manual report)"],
  ["paused_reported", "Paused (manual report)"],
  ["fault_reported", "Fault reported — review"],
] as const;

function dateLabel(value: string | null): string {
  if (!value) return "Not recorded";
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toLocaleString() : "Invalid source time";
}

/** Read-only status board plus explicitly unverified owner journal; no actuation. */
export function WorkshopProcess377() {
  const [board, setBoard] = useState<WorkshopProcess377Board | null>(null);
  const [equipmentId, setEquipmentId] = useState("");
  const [state, setState] = useState<WorkshopProcess377Reading["operatingState"]>("unknown");
  const [ventilation, setVentilation] = useState<WorkshopProcess377Reading["ventilation"]>("unknown");
  const [progress, setProgress] = useState("");
  const [temperature, setTemperature] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WorkshopProcess377Reading[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const next = await getWorkshopProcess377Board();
    setBoard(next);
    setEquipmentId(old => old && next.equipment.some(x => String(x.equipmentId) === old)
      ? old : String(next.equipment.find(x => !x.disabled)?.equipmentId ?? ""));
  }

  useEffect(() => {
    const ctrl = new AbortController();
    getWorkshopProcess377Board(ctrl.signal).then(next => {
      if (!ctrl.signal.aborted) {
        setBoard(next);
        setEquipmentId(String(next.equipment.find(x => !x.disabled)?.equipmentId ?? ""));
      }
    }).catch(() => { if (!ctrl.signal.aborted) setMessage("Process board unavailable; check migration 0038."); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  async function loadHistory(id: number) {
    setHistory([]);
    setMessage("");
    try {
      const data = await getWorkshopProcess377History(id);
      setHistory(data.readings);
    } catch {
      setMessage("Manual reading history could not be loaded.");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!equipmentId || busy) return;
    if (!window.confirm("Record this unverified owner observation? " +
      "It is not live telemetry, a safety inspection or permission to run equipment.")) return;
    setBusy(true);
    setMessage("");
    try {
      const reading = await recordWorkshopProcess377({
        equipment_id: Number(equipmentId),
        operating_state: state,
        ventilation,
        progress_percent: progress === "" ? null : Number(progress),
        temperature_c: temperature === "" ? null : Number(temperature),
        note: note.trim(),
        observed_at: new Date().toISOString(),
      });
      setNote("");
      setProgress("");
      setTemperature("");
      setMessage("Manual record #" + reading.id +
        " saved. No machine was contacted or controlled.");
      await refresh();
      await loadHistory(Number(equipmentId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record observation.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel" aria-label="Build 377 workshop process health">
    <p className="eyebrow">Build 377 · Workshop process health</p>
    <h2>Machine, task and maintenance overview</h2>
    <p>Every equipment card is drawn from the local register. Manual readings are
      <strong> not verified sensors</strong>. Signed printer-PC reports are shown
      separately until physical identity is checked. No remote machine actions.</p>
    <button type="button" disabled={busy} onClick={() => {
      void refresh().catch(() => setMessage("Refresh failed; data not updated."));
    }}>Refresh process evidence</button>
    {loading && <p role="status">Loading registered workshop processes…</p>}
    {board && <>
      <p role="status">Registered: {board.summary.registered} · Fresh manual reports:
        {" "}{board.summary.withFreshManualReading} · With review notices:
        {" "}{board.summary.withAttention}. Source sample: {dateLabel(board.sampledAt)}.</p>
      {board.equipment.length === 0 && <p>No workshop equipment registered. No machines inferred or marked healthy.</p>}
      <div className="workshop-equipment-list">
        {board.equipment.map(item => <article className="workshop-equipment-card" key={item.equipmentId}>
          <h3>{item.name}</h3>
          <p>{item.equipmentType} · {item.activity} · {item.project}</p>
          <p><strong>Inventory:</strong> {item.readiness} · {item.disabled ? "Disabled" : "Registered, not certified"}</p>
          <p><strong>Process:</strong> {item.reading?.operatingState.replaceAll("_", " ") ?? "No observation"}
            {" · "}{item.readingFresh ? "Recent MANUAL report" : "No current verified process source"}</p>
          {item.reading && <p>Manual observation: {dateLabel(item.reading.observedAt)}
            {item.reading.progressPercent !== null ? " · " + item.reading.progressPercent + "% reported progress" : ""}
            {item.reading.temperatureC !== null ? " · " + item.reading.temperatureC + "°C reported" : ""}
            {" · Ventilation: "}{item.reading.ventilation.replaceAll("_", " ")}</p>}
          <p><strong>Maintenance due:</strong> {dateLabel(item.maintenanceDueAt)}</p>
          <p><strong>Linked jobs ({item.activeJobCount}):</strong>{" "}
            {item.jobs.map(j => j.title + " (" + j.status + ", " +
              j.progressPercent + "% owner task estimate)").join("; ") || "None"}</p>
          {item.attention.length > 0 &&
            <p role="note"><strong>Review notices:</strong> {item.attention.join(", ")}</p>}
          <p>Controls unavailable · Safety approval not established</p>
          <button type="button" onClick={() => {
            setEquipmentId(String(item.equipmentId));
            void loadHistory(item.equipmentId);
          }}>Select for manual report / history</button>
        </article>)}
      </div>
      <h3>Signed printer-PC sources — not bound to a physical machine</h3>
      {board.signedCollectors.length === 0 ?
        <p>No original signed workshop receipt enrolled. Printer progress and temperatures are unknown.</p> :
        <ul>{board.signedCollectors.map(source => <li key={source.collectorId}>
          Collector {source.collectorId}: {source.status} · observed {dateLabel(source.observedAt)}
          {" · "}{source.devices.length} reported local OctoPrint device(s);
          physical identity unverified.
          {source.devices.map((device, index) => <p key={index}>{device.label}:{" "}
            {source.fresh ? device.presence : "Stale / HOLD"}
            {source.fresh && device.progressPercent !== null ?
              " · " + device.progressPercent + "% from signed source" : ""}</p>)}
        </li>)}</ul>}
      <h3>Append a manual process observation</h3>
      <p>For printers, CNC, lasers, kilns, forging, casting and ventilation, record only
        what we observed. Faults and missing ventilation need physical review; this form
        never starts, stops, heats or certifies equipment.</p>
      <form className="workshop-form" onSubmit={event => void save(event)}>
        <label>Registered equipment
          <select required value={equipmentId} onChange={event => setEquipmentId(event.target.value)}>
            {board.equipment.filter(item => !item.disabled).map(item =>
              <option key={item.equipmentId} value={item.equipmentId}>{item.name}</option>)}
          </select>
        </label>
        <label>Reported process state
          <select value={state} onChange={event =>
            setState(event.target.value as WorkshopProcess377Reading["operatingState"])}>
            {STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Progress, percent (optional)
          <input inputMode="decimal" type="number" min="0" max="100" step="0.1"
            value={progress} onChange={event => setProgress(event.target.value)} />
        </label>
        <label>Temperature °C (optional, unverified)
          <input inputMode="decimal" type="number" min="-40" max="1500" step="0.1"
            value={temperature} onChange={event => setTemperature(event.target.value)} />
        </label>
        <label>Ventilation (owner report)
          <select value={ventilation} onChange={event =>
            setVentilation(event.target.value as WorkshopProcess377Reading["ventilation"])}>
            <option value="unknown">Unknown</option>
            <option value="on_reported">Reported on</option>
            <option value="off_reported">Reported off — review</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
        <label>Observation note (300 characters)
          <textarea maxLength={300} value={note} onChange={event => setNote(event.target.value)} />
        </label>
        <button type="submit" disabled={busy || !equipmentId}>Save unverified observation</button>
      </form>
      {history.length > 0 && <>
        <h3>Manual history for selected equipment</h3>
        <ul>{history.map(reading => <li key={reading.id}>
          {dateLabel(reading.observedAt)} · {reading.operatingState.replaceAll("_", " ")}
          {" · "}{reading.note || "No note"} · OWNER MANUAL / UNVERIFIED
        </li>)}</ul>
      </>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
