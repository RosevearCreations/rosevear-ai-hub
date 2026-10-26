import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  getUsers, getWorkshopMaintenanceEvents, getWorkshopMaintenanceOverview,
  recordWorkshopMaintenanceEvent, saveWorkshopMaintenancePlan,
  type AuthUser, type WorkshopMaintenanceDue, type WorkshopMaintenanceEvent,
  type WorkshopMaintenanceOutcome, type WorkshopMaintenanceOverview,
  type WorkshopMaintenanceRow,
} from "./api";

const DUE_OPTIONS: { state: WorkshopMaintenanceDue | "all"; label: string }[] = [
  { state: "all", label: "All schedule states" },
  { state: "blocked", label: "Blocked" }, { state: "overdue", label: "Overdue" },
  { state: "due_soon", label: "Due within seven days" },
  { state: "unplanned", label: "No schedule" }, { state: "scheduled", label: "Scheduled" },
  { state: "disabled", label: "Disabled" },
];

export function maintenanceDate(iso: string | null): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Invalid source date — investigate" : date.toLocaleString();
}

function localDateTimeInput(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function splitLines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function WorkshopMaintenancePlanner({ role, onChanged }: {
  role: AuthUser["role"];
  onChanged?: () => void | Promise<void>;
}) {
  const canManage = role === "owner" || role === "administrator";
  const [data, setData] = useState<WorkshopMaintenanceOverview | null>(null);
  const [operators, setOperators] = useState<AuthUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<WorkshopMaintenanceEvent[]>([]);
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("all");
  const [state, setState] = useState<WorkshopMaintenanceDue | "all">("all");
  const [interval, setInterval] = useState("90");
  const [dueLocal, setDueLocal] = useState(localDateTimeInput(null));
  const [assignee, setAssignee] = useState("");
  const [checklist, setChecklist] = useState("Inspect guards");
  const [parts, setParts] = useState("");
  const [notes, setNotes] = useState("");
  const [revision, setRevision] = useState(0);
  const [outcome, setOutcome] = useState<WorkshopMaintenanceOutcome>("needs_service");
  const [completed, setCompleted] = useState<string[]>([]);
  const [usedParts, setUsedParts] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setData(await getWorkshopMaintenanceOverview());
  }

  useEffect(() => {
    const controller = new AbortController();
    getWorkshopMaintenanceOverview(controller.signal).then(setData).catch(() => {
      if (!controller.signal.aborted) setError("Maintenance planner unavailable. Verify migration 0026 on the local Hub database.");
    });
    if (canManage) getUsers(controller.signal).then((users) => setOperators(
      users.filter((user) => user.enabled && user.role !== "read_only"),
    )).catch(() => {
      if (!controller.signal.aborted) setError("Operator list unavailable; leave assignment blank or retry.");
    });
    return () => controller.abort();
  }, [canManage]);

  const projects = useMemo(() => [...new Set(data?.items.map((row) => row.project_key) || [])].sort(), [data]);
  const rows = (data?.items || []).filter((row) =>
    (project === "all" || row.project_key === project) &&
    (state === "all" || row.due_state === state) &&
    `${row.name} ${row.project_key} ${row.station_name} ${row.equipment_type}`.toLowerCase().includes(search.toLowerCase()),
  );
  const chosen = data?.items.find((row) => row.equipment_id === selectedId) || null;
  const requiredChecklist = chosen?.plan?.checklist || splitLines(checklist);

  async function openRecord(row: WorkshopMaintenanceRow) {
    setSelectedId(row.equipment_id);
    setRevision(row.plan?.revision || 0);
    setInterval(String(row.plan?.interval_days || 90));
    setDueLocal(localDateTimeInput(row.plan?.next_due_at || row.legacy_due_at));
    setAssignee(row.plan?.assigned_user_id ? String(row.plan.assigned_user_id) : "");
    setChecklist((row.plan?.checklist || ["Inspect guards"]).join("\n"));
    setParts((row.plan?.parts_refs || []).join("\n"));
    setNotes(row.plan?.notes || "");
    setCompleted([]); setUsedParts(""); setServiceNote(""); setAck(false);
    setError(""); setNotice("");
    try { setHistory(await getWorkshopMaintenanceEvents(row.equipment_id)); }
    catch { setHistory([]); setError("Could not load maintenance history."); }
  }

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedId || busy) return;
    const date = new Date(dueLocal);
    const checks = splitLines(checklist);
    if (!dueLocal || Number.isNaN(date.getTime()) || !checks.length) {
      setError("Choose a valid due date and at least one inspection checklist item.");
      return;
    }
    if (localDateTimeInput(date.toISOString()) !== dueLocal) {
      setError("That local time does not exist at a daylight-saving change. Choose an unambiguous time.");
      return;
    }
    setBusy(true); setError("");
    try {
      const saved = await saveWorkshopMaintenancePlan(selectedId, {
        expected_revision: revision, interval_days: Number(interval), next_due_at: date.toISOString(),
        assigned_user_id: assignee ? Number(assignee) : null, checklist: checks,
        parts_refs: splitLines(parts), notes,
      });
      setRevision(saved.revision); setCompleted([]);
      await refresh();
      await onChanged?.();
      setNotice("Manual maintenance plan saved and audited. It is not equipment clearance.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Plan rejected. Refresh to review current revision."); }
    finally { setBusy(false); }
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedId || !chosen?.plan || !ack || busy) return;
    if (!window.confirm("Record this manual service observation? Even a full checklist never certifies safe operation.")) return;
    setBusy(true); setError("");
    try {
      const result = await recordWorkshopMaintenanceEvent(selectedId, {
        expected_revision: revision, outcome, note: serviceNote,
        completed_checklist: completed, parts_used: splitLines(usedParts),
        acknowledge_not_certification: ack,
      });
      setRevision((current) => current + 1);
      setServiceNote(""); setCompleted([]); setAck(false); setUsedParts("");
      await refresh();
      setHistory(await getWorkshopMaintenanceEvents(selectedId));
      await onChanged?.();
      setNotice(result.schedule_updated
        ? "Checklist receipt recorded; next maintenance due date updated. Equipment remains separately unverified."
        : "Maintenance concern recorded; due date unchanged and unsafe holds preserved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Maintenance event rejected. Refresh and recheck the plan."); }
    finally { setBusy(false); }
  }

  return <section className="panel workshop-maintenance-planner" aria-label="Workshop maintenance planning">
    <h2>Build 145 — Equipment 360 &amp; preventive maintenance</h2>
    <p>Local-only schedules, manual assignments and service evidence. Every machine remains subject to a separate independent safety review.</p>
    <details><summary><span aria-hidden="true">ⓘ</span> Maintenance planning help</summary>
      <ol>
        <li>Filter the calendar, inspect a machine and record a due date, repeat interval, checklist and parts references.</li>
        <li>Owner/Administrator may assign an active household operator and record maintenance evidence manually.</li>
        <li>A complete checklist updates the next due date. A service-needed or unsafe observation never clears a safety hold or restarts equipment.</li>
        <li>Maintenance status is not a regulatory inspection, certification, or permission to run a laser, CNC, forge or electrical tool.</li>
      </ol>
    </details>
    <p role="note">Showing the first {data?.counts_limited_to_first || 200} source equipment records at most; {data?.overdue_count ?? "—"} overdue among those loaded.</p>
    <div className="workshop-form">
      <label>Search equipment, project, type or station
        <input aria-label="Search maintenance equipment" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <label>Project
        <select aria-label="Maintenance project" value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="all">All projects</option>{projects.map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
      </label>
      <label>Schedule status
        <select aria-label="Maintenance schedule state" value={state} onChange={(event) => setState(event.target.value as WorkshopMaintenanceDue | "all")}>
          {DUE_OPTIONS.map((entry) => <option key={entry.state} value={entry.state}>{entry.label}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy} onClick={() => void refresh().catch(() => setError("Maintenance refresh failed."))}>Refresh maintenance</button>
    </div>
    <h3>Maintenance due-date calendar &amp; equipment detail</h3>
    <div className="workshop-items">
      {rows.map((row) => <article className="workshop-item" key={row.equipment_id}>
        <h4>{row.name}</h4>
        <small>{row.project_key} · {row.station_name} · {row.activity_type}</small>
        <p><strong>{row.due_state.replaceAll("_", " ")}</strong>{row.is_overdue ? " · Overdue" : ""} · Due {maintenanceDate(row.plan?.next_due_at || row.legacy_due_at)}</p>
        <p>Safety observation: {row.readiness_status.replaceAll("_", " ")}; {row.next_safe_check}</p>
        <small>Assigned operator: {row.plan?.assigned_user_id ?? "Not assigned"} · Last inspection: {maintenanceDate(row.last_inspected_at)}</small>
        <button type="button" onClick={() => void openRecord(row)}>Open equipment 360 maintenance</button>
      </article>)}
    </div>
    {data && rows.length === 0 && <p>No equipment matches these filters.</p>}
    {chosen && <section className="connection-guidance" aria-label="Selected workshop maintenance record">
      <h3>{chosen.name} — maintenance record</h3>
      <p>{chosen.next_safe_check}</p>
      {!canManage && <p>Only Owner/Administrator can edit plans or record maintenance. Viewing history is allowed.</p>}
      {canManage && <>
        <form className="workshop-form" onSubmit={(event) => void submitPlan(event)}>
          <h4>Owner-reviewed service plan</h4>
          <label>Repeat interval (days, 1–3650)
            <input type="number" min={1} max={3650} required value={interval} onChange={(event) => setInterval(event.target.value)} />
          </label>
          <label>Next maintenance due (local date and time)
            <input type="datetime-local" required value={dueLocal} onChange={(event) => setDueLocal(event.target.value)} />
          </label>
          <label>Assigned operator
            <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
              <option value="">Unassigned</option>
              {operators.map((user) => <option key={user.id} value={user.id}>{user.username} · {user.role}</option>)}
            </select>
          </label>
          <label>Checklist (one distinct item per line, maximum 12)
            <textarea required value={checklist} onChange={(event) => setChecklist(event.target.value)} />
          </label>
          <label>Parts / inventory references (one per line, maximum 20)
            <textarea value={parts} onChange={(event) => setParts(event.target.value)} />
          </label>
          <label>Notes
            <textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="submit" disabled={busy}>Save maintenance plan (revision {revision})</button>
        </form>
        {chosen.plan && <form className="workshop-form" onSubmit={(event) => void submitEvent(event)}>
          <h4>Append a manual service observation</h4>
          <label>Service outcome
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as WorkshopMaintenanceOutcome)}>
              <option value="needs_service">Needs service — due date unchanged</option>
              <option value="unsafe">Unsafe — block equipment</option>
              <option value="checked">Checklist complete — update next due date only</option>
            </select>
          </label>
          <fieldset><legend>Checklist items actually inspected</legend>
            {requiredChecklist.map((item) => <label key={item}>
              <input type="checkbox" checked={completed.includes(item)} onChange={(event) => setCompleted((current) =>
                event.target.checked ? [...current, item] : current.filter((name) => name !== item),
              )} />{item}
            </label>)}
          </fieldset>
          <label>Parts actually used (one per line)
            <textarea value={usedParts} onChange={(event) => setUsedParts(event.target.value)} />
          </label>
          <label>Service observation and actual work (required)
            <textarea required minLength={3} maxLength={500} value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} />
          </label>
          <label><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
            I understand that this record is not a machine safety certification or permission to operate.
          </label>
          <button type="submit" disabled={busy || !ack || (outcome === "checked" && !requiredChecklist.every((item) => completed.includes(item)))}>
            Confirm manual service record
          </button>
        </form>}
      </>}
      <h4>Append-only maintenance history</h4>
      {history.length === 0 && <p>No manual service events recorded for this equipment.</p>}
      <ol>{history.map((event) => <li key={event.id}>
        {maintenanceDate(event.recorded_at)} · {event.outcome.replaceAll("_", " ")} · {event.note};
        {event.schedule_updated ? " next due updated" : " due date held"}. Parts: {event.parts_used.join(", ") || "none"}.
      </li>)}</ol>
    </section>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
