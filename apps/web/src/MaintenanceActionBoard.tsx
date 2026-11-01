import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createManualMaintenanceAction, exportMaintenanceActionCsv, getMaintenanceActions, getUsers,
  saveMaintenanceAction, type AuthUser, type MaintenanceActionDecision,
  type MaintenanceActionRow, type MaintenanceActionStatus,
} from "./api";

export function canCloseMaintenanceAction(row: MaintenanceActionRow): boolean {
  return !row.hazard_unresolved && !row.source_stale;
}

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function draftFrom(row: MaintenanceActionRow): MaintenanceActionDecision {
  return { expected_revision: row.revision, assigned_user_id: row.assigned_user_id,
    due_at: row.due_at, status: row.status, acknowledged: row.acknowledged,
    decision_reason: row.decision_reason };
}

export function MaintenanceActionBoard({ role }: { role: AuthUser["role"] }) {
  const canManage = role === "owner" || role === "administrator";
  const [rows, setRows] = useState<MaintenanceActionRow[]>([]);
  const [operators, setOperators] = useState<AuthUser[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<MaintenanceActionDecision | null>(null);
  const [localDue, setLocalDue] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newKind, setNewKind] = useState<"household" | "workshop_manual">("household");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const board = await getMaintenanceActions();
    setRows(board.items);
  }

  useEffect(() => {
    let active = true;
    getMaintenanceActions().then((board) => { if (active) setRows(board.items); })
      .catch(() => { if (active) setError("Action board unavailable; check local migration 0029."); });
    if (canManage) getUsers().then((users) => {
      if (active) setOperators(users.filter((user) => user.enabled && user.role !== "read_only"));
    }).catch(() => { if (active) setError("Assignment list unavailable; retry later."); });
    return () => { active = false; };
  }, [canManage]);

  const visible = useMemo(() => rows.filter((row) =>
    (filter === "all" || row.status === filter || row.source_kind === filter) &&
    `${row.title} ${row.source_kind} ${row.source_state}`.toLowerCase().includes(search.toLowerCase()),
  ), [rows, filter, search]);
  const selected = rows.find((row) => `${row.source_kind}:${row.source_id}` === selectedKey);

  function open(row: MaintenanceActionRow) {
    setSelectedKey(`${row.source_kind}:${row.source_id}`);
    setDraft(draftFrom(row)); setLocalDue(toLocal(row.due_at));
    setError(""); setNotice("");
  }

  function validatedDue(): string | null | undefined {
    if (!localDue) return null;
    const date = new Date(localDue);
    if (Number.isNaN(date.getTime()) || toLocal(date.toISOString()) !== localDue) {
      setError("Invalid or skipped local time. Choose another due date/time.");
      return undefined;
    }
    return date.toISOString();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selected || !draft || busy) return;
    const due = validatedDue();
    if (due === undefined) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await saveMaintenanceAction(selected, { ...draft, due_at: due });
      await refresh(); open(result);
      setNotice("Owner decision saved and audited. Underlying source status was not changed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Action save rejected."); }
    finally { setBusy(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await createManualMaintenanceAction({
        source_kind: newKind, title: newTitle, expected_revision: 0,
        assigned_user_id: null, due_at: null, status: "open", acknowledged: false,
        decision_reason: "",
      });
      await refresh(); open(result); setNewTitle("");
      setNotice("Manual task created. Source hazards remain independently open.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Task creation failed."); }
    finally { setBusy(false); }
  }

  return <section className="panel maintenance-action-board" aria-label="Household and workshop maintenance action board">
    <h2>Build 219 — Household &amp; workshop maintenance action board</h2>
    <p>One readback per source identity: workshop inspections/due dates, device investigations, camera follow-ups and manual household tasks. This board never clears source hazards or controls hardware.</p>
    <details><summary>ⓘ Review, assignment &amp; safety help</summary>
      <p>Owner/Administrator may assign, acknowledge, defer with a reason or close a resolved/manual task. Unresolved source hazards cannot be closed here. Stale or missing source evidence stays visible for independent review.</p>
      <p>Sources are limited to the first 200 local records per category; this is not a live device/camera health probe. Export is a CSV snapshot of the currently available local board.</p>
    </details>
    <div className="workshop-form">
      <label>Search tasks <input aria-label="Search maintenance tasks" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label>Filter source or status <select aria-label="Maintenance action filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">All actions</option>
        <option value="open">Open</option><option value="deferred">Deferred</option><option value="closed">Closed</option>
        <option value="household">Household</option><option value="workshop_manual">Workshop tasks</option>
        <option value="workshop_equipment">Equipment</option><option value="device">Devices</option><option value="camera">Cameras</option>
      </select></label>
      <button type="button" onClick={() => void refresh().catch(() => setError("Refresh failed."))} disabled={busy}>Refresh action board</button>
      <button type="button" onClick={() => void exportMaintenanceActionCsv().catch(() => setError("CSV export failed."))}>Export action CSV</button>
    </div>
    <p role="note">{visible.length} tasks in view. Source age and safety remain independently reviewed.</p>
    <ul className="workshop-items">{visible.map((row) => <li className="workshop-item" key={`${row.source_kind}:${row.source_id}`}>
      <strong>{row.title}</strong> · {row.source_kind.replaceAll("_", " ")} · {row.status}
      {row.hazard_unresolved && <p><strong>Source issue unresolved — no automatic closure</strong></p>}
      {row.source_stale && <p>Stale or missing source readback: verify independently</p>}
      <p>Source: {row.source_state} · Owner acknowledged: {row.acknowledged ? "yes" : "no"} · Due: {row.due_at ? new Date(row.due_at).toLocaleString() : "unset"}</p>
      <button type="button" onClick={() => open(row)}>Review action: {row.title}</button>
    </li>)}</ul>
    {visible.length === 0 && <p>No tasks match the current filters.</p>}
    {canManage && <form className="workshop-form" onSubmit={(event) => void create(event)}>
      <h3>New manual household or workshop task</h3>
      <label>Task scope <select value={newKind} onChange={(event) => setNewKind(event.target.value as "household" | "workshop_manual")}>
        <option value="household">Household</option><option value="workshop_manual">Workshop upkeep</option>
      </select></label>
      <label>Task title <input minLength={3} maxLength={160} required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label>
      <button type="submit" disabled={busy}>Create manual task</button>
    </form>}
    {selected && <section className="connection-guidance" aria-label="Selected maintenance action">
      <h3>{selected.title} — decision</h3>
      <p>Original source: {selected.source_kind}, {selected.source_state}. {selected.source_stale ? "Evidence stale or out of scope." : "Local source readback."}</p>
      {!canManage && <p>Read-only access: owner decisions are unavailable.</p>}
      {canManage && draft && <form className="workshop-form" onSubmit={(event) => void save(event)}>
        <label>Assign to active operator <select value={draft.assigned_user_id ?? ""} onChange={(event) => setDraft({ ...draft, assigned_user_id: event.target.value ? Number(event.target.value) : null })}>
          <option value="">Unassigned</option>{operators.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
        </select></label>
        <label>Due date (local, optional) <input type="datetime-local" value={localDue} onChange={(event) => setLocalDue(event.target.value)} /></label>
        <label><input type="checkbox" checked={draft.acknowledged} onChange={(event) => setDraft({ ...draft, acknowledged: event.target.checked })} /> Owner acknowledged this action</label>
        <label>Decision <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MaintenanceActionStatus })}>
          <option value="open">Open</option><option value="deferred">Defer with reason</option>
          <option value="closed" disabled={!canCloseMaintenanceAction(selected)}>Close resolved task</option>
        </select></label>
        <label>Decision reason (required for defer/close) <textarea maxLength={500} minLength={draft.status === "open" ? 0 : 5} required={draft.status !== "open"} value={draft.decision_reason} onChange={(event) => setDraft({ ...draft, decision_reason: event.target.value })} /></label>
        {!canCloseMaintenanceAction(selected) && <p role="note">Closure locked: source unresolved or stale. Acknowledgement/deferment does not remove this finding.</p>}
        <button type="submit" disabled={busy || (draft.status === "closed" && !canCloseMaintenanceAction(selected))}>Save owner action revision {draft.expected_revision}</button>
      </form>}
    </section>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
