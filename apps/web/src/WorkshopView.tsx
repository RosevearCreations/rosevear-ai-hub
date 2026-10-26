import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createWorkshopEquipment,
  createWorkshopStation,
  getWorkshopEquipment,
  getWorkshopInspections,
  getWorkshopStations,
  getWorkshopSummary,
  recordWorkshopInspection,
  type WorkshopActivity,
  type WorkshopEquipment,
  type WorkshopInspection,
  type WorkshopObservation,
  type WorkshopStation,
  type WorkshopSummary,
  type AuthUser,
} from "./api";
import { WorkshopMaintenancePlanner } from "./WorkshopMaintenancePlanner";

const ACTIVITY_OPTIONS: WorkshopActivity[] = [
  "general", "laser", "cnc", "forge", "electrical", "chemical", "other",
];

export function readinessMessage(equipment: WorkshopEquipment, now: number): string {
  if (equipment.disabled) return "Disabled in inventory — do not operate";
  if (equipment.readiness_status === "blocked") return "Blocked — do not operate";
  if (equipment.maintenance_due_at && Date.parse(equipment.maintenance_due_at) <= now) {
    return "Maintenance overdue — do not operate until reviewed";
  }
  switch (equipment.readiness_status) {
    case "attention": return "Maintenance attention — do not operate";
    case "review_required": return "Observation recorded — independent safety review still required";
    default: return "No verified readiness inspection — do not operate";
  }
}

export function WorkshopView({ role = "read_only" }: { role?: AuthUser["role"] }) {
  const [stations, setStations] = useState<WorkshopStation[]>([]);
  const [equipment, setEquipment] = useState<WorkshopEquipment[]>([]);
  const [summary, setSummary] = useState<WorkshopSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [project, setProject] = useState("all");
  const [projectKey, setProjectKey] = useState("workshop");
  const [stationName, setStationName] = useState("");
  const [stationDescription, setStationDescription] = useState("");
  const [hazardLabels, setHazardLabels] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [stationId, setStationId] = useState("");
  const [activity, setActivity] = useState<WorkshopActivity>("general");
  const [selected, setSelected] = useState<number | null>(null);
  const [inspectionNote, setInspectionNote] = useState("");
  const [observation, setObservation] = useState<WorkshopObservation>("needs_service");
  const [history, setHistory] = useState<WorkshopInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const projects = useMemo(
    () => [...new Set([...stations.map((s) => s.project_key), ...equipment.map((e) => e.project_key)])].sort(),
    [stations, equipment],
  );
  const visible = equipment.filter((item) => project === "all" || project === item.project_key);
  const chosen = equipment.find((item) => item.id === selected) ?? null;

  async function refresh() {
    const [newStations, newEquipment, newSummary] = await Promise.all([
      getWorkshopStations(), getWorkshopEquipment(), getWorkshopSummary(),
    ]);
    setStations(newStations);
    setEquipment(newEquipment);
    setSummary(newSummary);
  }

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getWorkshopStations(controller.signal),
      getWorkshopEquipment(controller.signal),
      getWorkshopSummary(controller.signal),
    ]).then(([nextStations, nextEquipment, nextSummary]) => {
      setStations(nextStations);
      setEquipment(nextEquipment);
      setSummary(nextSummary);
    }).catch(() => { if (!controller.signal.aborted) setError("Workshop data unavailable. Verify database migration 0018 and admin access."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function submitStation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createWorkshopStation({
        project_key: projectKey.trim(), name: stationName.trim(),
        description: stationDescription.trim(),
        hazards_json: hazardLabels.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setStationName("");
      setStationDescription("");
      setHazardLabels("");
      setNotice("Local workstation created. Hazard labels are advisory, not certifications.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create workstation."); }
    finally { setBusy(false); }
  }

  async function submitEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createWorkshopEquipment({
        project_key: projectKey.trim(), station_id: stationId ? Number(stationId) : null,
        name: equipmentName.trim(), equipment_type: equipmentType.trim(),
        activity_type: activity, notes: "",
      });
      setEquipmentName("");
      setEquipmentType("");
      setNotice("Equipment recorded as unverified. No machine control was issued.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create equipment."); }
    finally { setBusy(false); }
  }

  async function selectEquipment(id: number) {
    setSelected(id);
    setError("");
    try { setHistory(await getWorkshopInspections(id)); }
    catch { setError("Could not load inspection history."); }
  }

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy || !window.confirm(
      "Save this manual observation? It does NOT authorize machinery operation, even when observed OK.",
    )) return;
    setBusy(true);
    setError("");
    try {
      await recordWorkshopInspection(selected, {
        review_status: observation, note: inspectionNote.trim(),
      });
      setInspectionNote("");
      setNotice("Inspection observation saved and audited. Safety sign-off remains separate.");
      await refresh();
      setHistory(await getWorkshopInspections(selected));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save inspection."); }
    finally { setBusy(false); }
  }

  return (
    <div className="workshop-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 145 · Private workshop operations</p>
          <h1>Equipment &amp; safety readiness</h1>
          <p className="lede">One local register across projects and workstations.
            Record observations, not equipment run permissions.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => {
          void refresh().then(() => setNotice("Manual refresh completed.")).catch(
            () => setError("Refresh failed. Check local API and database."),
          );
        }}>Refresh workshop</button>
      </header>

      <p className="workshop-warning" role="note">
        Hazardous processes (laser, CNC, forge, electrical and chemicals) require
        separate training, inspection, safeguards and human approval.
        No status here is a permit to operate, bypass an interlock, or energize machinery.
      </p>

      {loading ? <p>Loading local workshop records…</p> : null}
      {summary && (
        <dl className="workshop-stats">
          <div><dt>Equipment</dt><dd>{summary.equipment_count}</dd></div>
          <div><dt>Unverified</dt><dd>{summary.unverified}</dd></div>
          <div><dt>Review required</dt><dd>{summary.review_required}</dd></div>
          <div><dt>Needs attention</dt><dd>{summary.attention}</dd></div>
          <div><dt>Blocked</dt><dd>{summary.blocked}</dd></div>
          <div><dt>Overdue maintenance</dt><dd>{summary.maintenance_overdue}</dd></div>
        </dl>
      )}

      <section className="panel">
        <h2>Multi-project records</h2>
        <label>Display project
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All projects</option>
            {projects.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <p>Stored locally, no equipment polling, automatic activation or cloud upload.
          Only the first 200 equipment records are loaded per view.</p>
        <div className="workshop-items">
          {visible.map((item) => (
            <article className="workshop-item" key={item.id}>
              <h3>{item.name}</h3>
              <small>{item.project_key} · {item.activity_type} · {item.equipment_type}</small>
              <p>{readinessMessage(item, Date.now())}</p>
              <small>Last observed: {item.last_inspected_at
                ? new Date(item.last_inspected_at).toLocaleString() : "Never recorded"}</small>
              <button type="button" onClick={() => void selectEquipment(item.id)}>
                View history / record observation
              </button>
            </article>
          ))}
        </div>
        {!loading && visible.length === 0 && <p>No equipment in this project yet.</p>}
      </section>

      <section className="panel">
        <h2>Register a workstation</h2>
        <form className="workshop-form" onSubmit={(e) => void submitStation(e)}>
          <label>Project key
            <input required pattern="[A-Za-z0-9][A-Za-z0-9_.-]*" maxLength={80}
              value={projectKey} onChange={(e) => { setProjectKey(e.target.value); setStationId(""); }} />
          </label>
          <label>Workstation name
            <input required maxLength={120} value={stationName} onChange={(e) => setStationName(e.target.value)} />
          </label>
          <label>Description
            <textarea maxLength={500} value={stationDescription} onChange={(e) => setStationDescription(e.target.value)} />
          </label>
          <label>Hazard notices (up to 8, comma-separated; max 80 characters each)
            <input value={hazardLabels} onChange={(e) => setHazardLabels(e.target.value)} />
          </label>
          <button disabled={busy} type="submit">Add workstation locally</button>
        </form>
      </section>

      <section className="panel">
        <h2>Register equipment</h2>
        <form className="workshop-form" onSubmit={(e) => void submitEquipment(e)}>
          <p>Project: <strong>{projectKey}</strong>. Use the same project key as its workstation.</p>
          <label>Equipment name
            <input required maxLength={160} value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} />
          </label>
          <label>Equipment type
            <input required maxLength={80} value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} />
          </label>
          <label>Station (optional)
            <select value={stationId} onChange={(e) => setStationId(e.target.value)}>
              <option value="">Unassigned</option>
              {stations.filter((s) => s.project_key === projectKey && !s.disabled).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>Activity category
            <select value={activity} onChange={(e) => setActivity(e.target.value as WorkshopActivity)}>
              {ACTIVITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <button disabled={busy} type="submit">Add as unverified</button>
        </form>
      </section>

      {chosen && (
        <section className="panel">
          <h2>Manual inspection — {chosen.name}</h2>
          <p>{readinessMessage(chosen, Date.now())}</p>
          <form className="workshop-form" onSubmit={(e) => void saveInspection(e)}>
            <label>Observation
              <select value={observation} onChange={(e) => setObservation(e.target.value as WorkshopObservation)}>
                <option value="needs_service">Needs service</option>
                <option value="unsafe">Unsafe — blocked</option>
                <option value="observed_ok">Observed OK — still requires independent review</option>
              </select>
            </label>
            <label>Manual inspection note (max 500 characters)
              <textarea maxLength={500} value={inspectionNote} onChange={(e) => setInspectionNote(e.target.value)} />
            </label>
            <button type="submit" disabled={busy}>Confirm and save observation</button>
          </form>
          <h3>Previous observations</h3>
          <ul>{history.map((entry) => (
            <li key={entry.id}>{new Date(entry.checked_at).toLocaleString()}
              {" — "}{entry.review_status.replaceAll("_", " ")}: {entry.note}</li>
          ))}</ul>
          {history.length === 0 && <p>No inspection history recorded.</p>}
        </section>
      )}
      <WorkshopMaintenancePlanner role={role} onChanged={refresh} />
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
