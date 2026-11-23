import {useEffect, useMemo, useState, type FormEvent} from "react";

import {
  acknowledgeFamilyReminder379, archiveFamilyPlan379, completeFamilyPlan379,
  createFamilyPlan379, editFamilyPlan379, getFamilyBoard379, getFamilyMembers379,
  type AuthRole, type FamilyBoard379, type FamilyInput379, type FamilyKind379,
  type FamilyPlan379, type FamilyVisibility379,
} from "./api";
import "./FamilyCalendar379.css";

const ZONES = [
  "America/Toronto", "America/Vancouver", "America/Edmonton",
  "America/Winnipeg", "America/Halifax", "America/St_Johns", "UTC",
];
const KINDS: FamilyKind379[] = ["appointment", "chore", "task", "supply", "event"];
type View = "all" | "due" | "missed" | "today" | "chores" | "appointments" | "complete";

function localTimeTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(), "-", String(d.getMonth() + 1).padStart(2, "0"),
    "-", String(d.getDate()).padStart(2, "0"), "T",
    String(d.getHours()).padStart(2, "0"), ":",
    String(d.getMinutes()).padStart(2, "0"),
  ].join("");
}
function blank(): FamilyInput379 {
  const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    title: "", kind: "chore", detail: "", supplies: "",
    visibility: "household", local_due: localTimeTomorrow(),
    timezone: ZONES.includes(guessed) ? guessed : "America/Toronto",
    recurrence_days: null, reminder_minutes: 60, assignee_user_id: null,
  };
}
export function matchesFamilyView379(
  item: FamilyPlan379, view: View, todayLocal: string,
): boolean {
  switch(view) {
    case "due": return item.reminderDue && !item.reminderAcknowledged;
    case "missed": return item.missed;
    case "today": return item.localDue.slice(0, 10) === todayLocal;
    case "chores": return item.kind === "chore";
    case "appointments": return item.kind === "appointment";
    case "complete": return item.status === "done";
    default: return true;
  }
}
function monthDays(first: Date): string[] {
  const year = first.getFullYear();
  const month = first.getMonth();
  const start = new Date(year, month, 1);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({length: 42}, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")].join("-");
  });
}
function participant(item: FamilyPlan379, role: AuthRole, userId: number): boolean {
  return item.creatorUserId === userId || item.assigneeUserId === userId ||
    (item.visibility === "household" && (role === "owner" || role === "administrator"));
}
function manager(item: FamilyPlan379, role: AuthRole, userId: number): boolean {
  return item.creatorUserId === userId ||
    (item.visibility === "household" && (role === "owner" || role === "administrator"));
}

/** All writes require explicit gestures. Never schedules a background message. */
export function FamilyCalendar379({
  role, currentUserId,
}: {role: AuthRole; currentUserId: number}) {
  const canEdit = role !== "read_only";
  const [board, setBoard] = useState<FamilyBoard379 | null>(null);
  const [members, setMembers] = useState<Array<{id:number; username:string}>>([]);
  const [filter, setFilter] = useState<View>("all");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [form, setForm] = useState<FamilyInput379>(blank);
  const [editing, setEditing] = useState<FamilyPlan379 | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getFamilyBoard379(controller.signal).then(data => {
      if (!controller.signal.aborted) setBoard(data);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError("Family calendar unavailable. Verify the private Hub API and migration 0040.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    getFamilyMembers379().then(data => {
      if (!controller.signal.aborted) setMembers(data.members);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  async function refresh() {
    const data = await getFamilyBoard379();
    setBoard(data);
  }
  async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      await refresh();
      setNotice(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operation failed; refresh and retry.");
    } finally {
      setBusy(false);
    }
  }
  function change<K extends keyof FamilyInput379>(key: K, value: FamilyInput379[K]) {
    setForm(current => ({...current, [key]: value}));
  }
  function clear() {
    setEditing(null);
    setForm(blank());
  }
  function edit(item: FamilyPlan379) {
    setForm({
      title: item.title, kind: item.kind, detail: item.detail,
      supplies: item.supplies, visibility: item.visibility,
      local_due: item.localDue, timezone: item.timezone,
      recurrence_days: item.recurrenceDays, reminder_minutes: item.reminderMinutes,
      assignee_user_id: item.assigneeUserId,
    });
    setEditing(item);
    setNotice("Rescheduling or editing resets the reminder acknowledgment for this occurrence.");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || busy || !form.title.trim()) return;
    const modifying = editing;
    const success = await run(() => modifying
      ? editFamilyPlan379(modifying.id, modifying.revision, form)
      : createFamilyPlan379(form),
    modifying ? "Plan updated; any earlier reminder acknowledgment was reset." :
      "Family plan created locally. No external message was sent.");
    if (success) clear();\n    // Preserve the form on failed writes, e.g. invalid DST times.
  }
  const today = (() => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")].join("-");
  })();
  const shown = useMemo(() => (board?.items ?? []).filter(x =>
    matchesFamilyView379(x, filter, today)), [board, filter, today]);
  const cells = useMemo(() => monthDays(month), [month]);
  const displayMonth = month.toLocaleDateString(undefined, {month:"long", year:"numeric"});
  return <div className="family379">
    <header className="page-header">
      <div>
        <p className="eyebrow">Build 379 · Local-first household</p>
        <h1>Family Calendar, Chores &amp; Reminders</h1>
        <p className="lede">Private schedules, assigned chores, recurring tasks, supplies and
          in-app reminder acknowledgments. No automatic alerts, texts, emails or
          third-party calendar sync are active.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void run(refresh, "Calendar refreshed.")}>
        Refresh calendar
      </button>
    </header>
    {loading && <p role="status">Loading family schedule…</p>}
    {board && <>
      <section className="panel" aria-label="Family schedule summary">
        <h2>Family overview</h2>
        <div className="family379-metrics">
          <p><strong>{board.summary.active}</strong> plans visible to this account</p>
          <p><strong>{board.summary.dueSoon}</strong> reminders to acknowledge</p>
          <p><strong>{board.summary.missed}</strong> overdue plans</p>
          <p><strong>{board.summary.recurring}</strong> recurring chores/tasks</p>
        </div>
        <p>These reminders appear when we open or refresh this screen; no background
          notifications are scheduled. Entries marked private are visible only to
          their creator and assigned family member.</p>
        {board.truncated && <p role="alert">Only the first 250 visible plans are shown.</p>}
      </section>

      <section className="panel">
        <div className="family379-calendar-title">
          <h2>Calendar — {displayMonth}</h2>
          <div className="family379-buttons">
            <button type="button" aria-label="Previous month" onClick={() =>
              setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>Previous</button>
            <button type="button" aria-label="This month" onClick={() =>
              setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
            <button type="button" aria-label="Next month" onClick={() =>
              setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Next</button>
          </div>
        </div>
        <div className="family379-month" role="table" aria-label={"Household schedule for " + displayMonth}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day =>
            <div key={day} className="family379-weekday" role="columnheader">{day}</div>)}
          {cells.map(day => {
            const events = board.items.filter(item => item.localDue.slice(0,10) === day);
            const isMonth = Number(day.slice(5,7)) === month.getMonth() + 1;
            return <div key={day} className={"family379-day " +
              (isMonth ? "" : "family379-outside")} role="cell"
              aria-label={day + ", " + events.length + " plans"}>
              <strong>{Number(day.slice(-2))}</strong>
              {events.slice(0,3).map(item => <span key={item.id}
                className={item.missed ? "family379-missed" : "family379-event"}
                title={item.title + " · " + item.kind}>{item.title}</span>)}
              {events.length > 3 && <small>+{events.length - 3} more</small>}
            </div>;
          })}
        </div>
      </section>

      {canEdit && <section className="panel">
        <h2>{editing ? "Edit family plan" : "Add appointment, chore or task"}</h2>
        <form onSubmit={event => void save(event)} className="family379-form">
          <div className="family379-fields">
            <label>Title
              <input required maxLength={140} value={form.title}
                onChange={event => change("title", event.target.value)}
                placeholder="e.g. Check furnace filters" />
            </label>
            <label>Type
              <select value={form.kind} onChange={event =>
                change("kind", event.target.value as FamilyKind379)}>
                {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label>Family visibility
              <select value={form.visibility} onChange={event =>
                change("visibility", event.target.value as FamilyVisibility379)}>
                <option value="household">Shared household</option>
                <option value="private">Private to creator and assignee</option>
              </select>
            </label>
            <label>Date and time
              <input required type="datetime-local" value={form.local_due}
                onChange={event => change("local_due", event.target.value)} />
            </label>
            <label>Time zone
              <select value={form.timezone} onChange={event =>
                change("timezone", event.target.value)}>
                {ZONES.map(zone => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
            <label>Repeat after N days (optional)
              <input type="number" min="1" max="365" step="1"
                value={form.recurrence_days ?? ""}
                onChange={event => change("recurrence_days",
                  event.target.value ? Number(event.target.value) : null)} />
            </label>
            <label>In-app reminder before due (minutes)
              <input type="number" min="0" max="10080" step="1"
                value={form.reminder_minutes ?? ""}
                onChange={event => change("reminder_minutes",
                  event.target.value === "" ? null : Number(event.target.value))} />
            </label>
            <label>Assigned household member
              <select value={form.assignee_user_id ?? ""}
                onChange={event => change("assignee_user_id",
                  event.target.value ? Number(event.target.value) : null)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
              </select>
            </label>
            <label>Notes
              <input maxLength={300} value={form.detail}
                onChange={event => change("detail", event.target.value)}
                placeholder="Private details (not sent externally)" />
            </label>
            <label>Supplies needed
              <input maxLength={200} value={form.supplies}
                onChange={event => change("supplies", event.target.value)}
                placeholder="For planning only; not an order" />
            </label>
          </div>
          <div className="family379-buttons">
            <button className="primary-button" type="submit" disabled={busy || !form.title.trim()}>
              {editing ? "Save revised schedule" : "Add to family calendar"}
            </button>
            {editing && <button type="button" onClick={clear}>Cancel edit</button>}
          </div>
        </form>
      </section>}

      <section className="panel">
        <div className="family379-calendar-title">
          <h2>Family plans</h2>
          <label>Show
            <select value={filter} onChange={event => setFilter(event.target.value as View)}>
              <option value="all">All visible entries</option>
              <option value="due">Reminder needs acknowledgment</option>
              <option value="missed">Overdue</option>
              <option value="today">Today (browser date)</option>
              <option value="chores">Chores</option>
              <option value="appointments">Appointments</option>
              <option value="complete">Completed</option>
            </select>
          </label>
        </div>
        {shown.length === 0 && <p>No family plans match this filter.</p>}
        <div className="family379-list">
          {shown.map(item => {
            const canAct = canEdit && participant(item, role, currentUserId);
            const canManage = canEdit && manager(item, role, currentUserId);
            return <article key={item.id} className="family379-entry">
              <div>
                <h3>{item.title}</h3>
                <p>{item.kind} · {item.visibility} ·
                  {" "}{item.localDue.replace("T"," ")} ({item.timezone})</p>
                <p>Status: <strong>{item.status}</strong> · revision {item.revision}
                  {item.assigneeUserId ? " · member #" + item.assigneeUserId : " · unassigned"}</p>
                {item.recurrenceDays && <p>Repeat: every {item.recurrenceDays} days
                  · completed {item.completionCount} times</p>}
                {item.detail && <p>Notes: {item.detail}</p>}
                {item.supplies && <p>Supplies (planning): {item.supplies}</p>}
                {item.missed && <p className="family379-missed" role="note">Overdue;
                  no automated message has been sent.</p>}
                {item.reminderDue && !item.reminderAcknowledged &&
                  <p role="note">In-app reminder due — not yet acknowledged.</p>}
                {item.reminderAcknowledged &&
                  <p>Reminder acknowledged at {item.reminderAcknowledgedAt}</p>}
              </div>
              <div className="family379-buttons">
                {canManage && item.status === "open" &&
                  <button type="button" disabled={busy} onClick={() => edit(item)}>Edit</button>}
                {canAct && item.reminderDue && !item.reminderAcknowledged &&
                  <button type="button" disabled={busy} onClick={() =>
                    void run(() => acknowledgeFamilyReminder379(item.id, item.revision),
                      "Reminder acknowledgment recorded locally.")}>Acknowledge</button>}
                {canAct && item.status === "open" &&
                  <button type="button" disabled={busy} onClick={() => {
                    if (window.confirm("Mark " + item.title + " completed?" +
                      (item.recurrenceDays ? " Its next occurrence moves forward." : ""))) {
                      void run(() => completeFamilyPlan379(item.id, item.revision),
                        "Manual completion recorded; recurring dates advanced where applicable.");
                    }
                  }}>Complete</button>}
                {canManage && <button type="button" disabled={busy} onClick={() => {
                  if (window.confirm("Archive " + item.title +
                    "? Its local history is retained and it leaves this calendar.")) {
                    void run(() => archiveFamilyPlan379(item.id, item.revision),
                      "Family plan archived; audit preserved.");
                  }
                }}>Archive</button>}
              </div>
            </article>;
          })}
        </div>
      </section>
      <section className="panel">
        <h2>Recent local activity</h2>
        <p>Only events for plans this account may view are shown.</p>
        {board.history.length === 0 && <p>No activity yet.</p>}
        {board.history.length > 0 && <ol className="family379-history">
          {board.history.slice(0, 20).map(e =>
            <li key={e.id}>{e.action.replaceAll("_"," ")} · plan #{e.planId} ·
              revision {e.revision} · {new Date(e.at).toLocaleString()}</li>)}
        </ol>}
      </section>
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
