import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  approveGroceryItem378, archiveGroceryItem378, createGroceryItem378,
  editGroceryItem378, getGroceryBoard378, mergeGroceryItems378,
  receiveGroceryItem378,
  type AuthRole, type GroceryBoard378, type GroceryFields378,
  type GroceryItem378, type GroceryUnit378,
} from "./api";
import "./GroceryPantry378.css";

const EMPTY: GroceryFields378 = {
  name: "", unit: "each", wanted_qty: 1, on_hand_qty: 0,
  min_on_hand_qty: 0, recurrence_days: null, expires_on: null,
  pickup_on: null, price_note: "", note: "",
};
const UNITS: GroceryUnit378[] = ["each", "pack", "kg", "g", "L", "mL"];
type Filter = "all" | "list" | "ready" | "stock" | "low" | "expiring" | "recurring";

function formatDate(value: string | null): string {
  return value ?? "Unscheduled";
}
function quantity(value: number, unit: GroceryUnit378): string {
  return value.toLocaleString(undefined, {maximumFractionDigits: 2}) + " " + unit;
}
export function matchesGroceryFilter378(item: GroceryItem378, filter: Filter): boolean {
  switch (filter) {
    case "list": return item.wantedQty > 0;
    case "ready": return item.pickupReady;
    case "stock": return item.onHandQty > 0;
    case "low": return item.lowStock;
    case "expiring": return item.expiresSoon;
    case "recurring": return item.recurrenceDue;
    default: return true;
  }
}

/** Authenticated local household screen — no retailer, ordering or payment actions. */
export function GroceryPantry378({role}: {role: AuthRole}) {
  const canEdit = role === "owner" || role === "administrator" || role === "household_user";
  const canApprove = role === "owner" || role === "administrator";
  const [board, setBoard] = useState<GroceryBoard378 | null>(null);
  const [form, setForm] = useState<GroceryFields378>(EMPTY);
  const [editing, setEditing] = useState<GroceryItem378 | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [receipts, setReceipts] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const latest = await getGroceryBoard378();
    setBoard(latest);
    return latest;
  }
  useEffect(() => {
    const ctrl = new AbortController();
    getGroceryBoard378(ctrl.signal).then(data => {
      if (!ctrl.signal.aborted) setBoard(data);
    }).catch(() => {
      if (!ctrl.signal.aborted) setError("Grocery board unavailable. Check the private Hub API and migration 0039.");
    }).finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, []);

  function change<K extends keyof GroceryFields378>(key: K, value: GroceryFields378[K]) {
    setForm(current => ({...current, [key]: value}));
  }
  function resetForm() {
    setEditing(null);
    setForm({...EMPTY});
  }
  function beginEdit(item: GroceryItem378) {
    setEditing(item);
    setForm({
      name: item.name, unit: item.unit, wanted_qty: item.wantedQty,
      on_hand_qty: item.onHandQty, min_on_hand_qty: item.minOnHandQty,
      recurrence_days: item.recurrenceDays, expires_on: item.expiresOn,
      pickup_on: item.pickupOn, price_note: item.priceNote, note: item.note,
    });
    setNotice("Editing " + item.name + ". Saving changes will remove any previous pickup approval.");
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      if (editing) {
        await editGroceryItem378(editing.id, editing.revision, form);
        setNotice("Saved revised grocery/pantry record; it needs new approval for pickup.");
      } else {
        await createGroceryItem378(form);
        setNotice("Added to our private household board. No store order was placed.");
      }
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this item.");
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed; refresh before retrying.");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(
    () => (board?.items ?? []).filter(item => matchesGroceryFilter378(item, filter)),
    [board, filter],
  );
  const approved = useMemo(
    () => (board?.items ?? []).filter(item => item.pickupReady),
    [board],
  );

  return <div className="grocery378">
    <header className="page-header">
      <div>
        <p className="eyebrow">Build 378 · Private household workspace</p>
        <h1>Groceries &amp; Pantry</h1>
        <p className="lede">Shared household planning, manually recorded quantities,
          family pickup approvals, recurring essentials and printable lists.
          This screen cannot buy, pay for, or order anything.</p>
      </div>
      <button type="button" onClick={() => void run(refresh, "Local board refreshed.")}
        disabled={busy}>Refresh board</button>
    </header>

    {loading && <p role="status">Loading private household pantry…</p>}
    {board && <>
      <section className="panel" aria-label="Household overview">
        <h2>Household overview</h2>
        <div className="grocery378-metrics">
          <p><strong>{board.summary.active}</strong> active items</p>
          <p><strong>{board.summary.approvedPickupLines}</strong> approved for pickup</p>
          <p><strong>{board.summary.lowStock}</strong> below pantry threshold</p>
          <p><strong>{board.summary.expiring}</strong> expired / expiring within seven days</p>
          <p><strong>{board.summary.recurringDue}</strong> recurring needs due</p>
        </div>
        <p className="grocery378-note">Pantry counts, expiry dates and price notes are
          entered by our family. The Hub does not independently verify inventory
          or connect to retailers. Editing an approved line cancels its approval.</p>
        {board.truncated && <p role="alert">Capacity limit reached. Some records are not shown.</p>}
      </section>

      {canEdit && <section className="panel">
        <h2>{editing ? "Edit item — approval resets" : "Add a grocery or pantry item"}</h2>
        <form className="grocery378-form" onSubmit={event => void save(event)}>
          <div className="grocery378-fields">
            <label>Item name
              <input required maxLength={120} value={form.name}
                onChange={event => change("name", event.target.value)}
                placeholder="e.g. Oat milk" />
            </label>
            <label>Unit
              <select value={form.unit} onChange={event =>
                change("unit", event.target.value as GroceryUnit378)}>
                {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>Amount to purchase
              <input type="number" inputMode="decimal" min="0" max="10000" step="0.01"
                value={form.wanted_qty} onChange={event =>
                  change("wanted_qty", Number(event.target.value))} />
            </label>
            <label>Pantry on hand
              <input type="number" inputMode="decimal" min="0" max="10000" step="0.01"
                value={form.on_hand_qty} onChange={event =>
                  change("on_hand_qty", Number(event.target.value))} />
            </label>
            <label>Low-stock threshold
              <input type="number" inputMode="decimal" min="0" max="10000" step="0.01"
                value={form.min_on_hand_qty} onChange={event =>
                  change("min_on_hand_qty", Number(event.target.value))} />
            </label>
            <label>Repeat every N days (optional)
              <input type="number" min="1" max="365" step="1"
                value={form.recurrence_days ?? ""} onChange={event =>
                  change("recurrence_days", event.target.value === "" ?
                    null : Number(event.target.value))} />
            </label>
            <label>Pantry expiry (optional)
              <input type="date" value={form.expires_on ?? ""}
                onChange={event => change("expires_on", event.target.value || null)} />
            </label>
            <label>Planned pickup (optional)
              <input type="date" value={form.pickup_on ?? ""}
                onChange={event => change("pickup_on", event.target.value || null)} />
            </label>
            <label>Price note (not a live quote)
              <input maxLength={100} value={form.price_note}
                onChange={event => change("price_note", event.target.value)}
                placeholder="e.g. About $4 CAD" />
            </label>
            <label>Household note
              <input maxLength={250} value={form.note}
                onChange={event => change("note", event.target.value)} />
            </label>
          </div>
          <div className="grocery378-actions">
            <button className="primary-button" disabled={busy || !form.name.trim()} type="submit">
              {editing ? "Save changes — reset approval" : "Add to household board"}
            </button>
            {editing && <button type="button" onClick={resetForm}>Cancel editing</button>}
          </div>
        </form>
      </section>}

      <section className="panel" aria-label="Grocery and pantry items">
        <div className="grocery378-title-row">
          <h2>Household items</h2>
          <label>View
            <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
              <option value="all">Everything</option>
              <option value="list">Shopping requests</option>
              <option value="ready">Approved for pickup</option>
              <option value="stock">In pantry</option>
              <option value="low">Below stock threshold</option>
              <option value="expiring">Expiring soon</option>
              <option value="recurring">Recurring needs due</option>
            </select>
          </label>
        </div>
        {visible.length === 0 && <p>No items in this view. We never infer quantities or purchases.</p>}
        <div className="grocery378-items">
          {visible.map(item => <article key={item.id} className="grocery378-item">
            <div>
              <h3>{item.name}</h3>
              <p>{quantity(item.onHandQty, item.unit)} in pantry ·
                {" "}{quantity(item.wantedQty, item.unit)} requested ·
                {" "}minimum {quantity(item.minOnHandQty, item.unit)}</p>
              <p><strong>Pickup:</strong> {item.state.replaceAll("_", " ")} ·
                {" "}{formatDate(item.pickupOn)} · revision {item.revision}</p>
              {item.priceNote && <p>Price note (manual): {item.priceNote}</p>}
              {item.note && <p>Note: {item.note}</p>}
              <p>Expiry: {formatDate(item.expiresOn)} ·
                {" "}repeat: {item.recurrenceDays ?
                  "Every " + item.recurrenceDays + " days" : "None"}</p>
              {(item.lowStock || item.expiresSoon || item.recurrenceDue) &&
                <p role="note"><strong>Attention:</strong>
                  {item.lowStock ? " Pantry below threshold." : ""}
                  {item.expiresSoon ? " Check expiry." : ""}
                  {item.recurrenceDue ? " Recurring need due." : ""}
                </p>}
              {item.pickupReady && <p>Owner-approved for <strong>manual pickup only</strong>.</p>}
            </div>
            <div className="grocery378-actions">
              {canEdit && <button type="button" disabled={busy} onClick={() => beginEdit(item)}>
                Edit
              </button>}
              {canApprove && item.state === "draft" && item.wantedQty > 0 &&
                <button type="button" disabled={busy} onClick={() => {
                  if (window.confirm("Approve exactly " + quantity(item.wantedQty, item.unit) +
                    " of " + item.name + " for manual pickup? No purchase will occur.")) {
                    void run(() => approveGroceryItem378(item.id, item.revision),
                      "Approved " + item.name + " for household pickup only.");
                  }
                }}>Approve pickup</button>}
              {canEdit && item.pickupReady && <>
                <label>Qty actually picked up
                  <input aria-label={"Received quantity for " + item.name}
                    type="number" inputMode="decimal" min="0.01" max={item.wantedQty}
                    step="0.01" value={receipts[item.id] ?? String(item.wantedQty)}
                    onChange={event => setReceipts(old => ({
                      ...old, [item.id]: event.target.value,
                    }))} />
                </label>
                <button type="button" disabled={busy} onClick={() => {
                  const received = Number(receipts[item.id] ?? item.wantedQty);
                  if (received > 0 && received <= item.wantedQty &&
                    window.confirm("Confirm physically received " +
                      quantity(received, item.unit) + " of " + item.name +
                      "? Pantry balance will change; no order/payment is placed.")) {
                    void run(() => receiveGroceryItem378(item.id, item.revision, received),
                      "Manual pickup saved and pantry count updated.");
                  }
                }}>Record received</button>
              </>}
              {canApprove && <button type="button" disabled={busy} onClick={() => {
                if (window.confirm("Archive " + item.name +
                  " from our active household board? Its activity history remains.")) {
                  void run(() => archiveGroceryItem378(item.id, item.revision),
                    "Archived item; previous activity is retained.");
                }
              }}>Archive</button>}
            </div>
          </article>)}
        </div>
      </section>

      {canApprove && board.duplicateGroups.length > 0 && <section className="panel">
        <h2>Review duplicate items</h2>
        <p>Only exact same-name and same-unit items are suggested.
          Combining them adds manual quantities, retains the earliest expiry,
          archives the duplicate, and cancels prior pickup approvals.</p>
        {board.duplicateGroups.map(group => {
          const pair = group.map(id => board.items.find(item => item.id === id))
            .filter((item): item is GroceryItem378 => Boolean(item));
          const target = pair[0];
          if (!target) return null;
          return <div key={target.id} className="grocery378-duplicate">
            <p>{target.name} ({target.unit}) — {pair.length} entries</p>
            {pair.slice(1).map(duplicate => <button key={duplicate.id}
              type="button" disabled={busy} onClick={() => {
                if (window.confirm("Merge item #" + duplicate.id + " into #" +
                  target.id + "? Both quantities add; both approvals reset.")) {
                  void run(() => mergeGroceryItems378(target, duplicate),
                    "Duplicate merged; pickup must be approved again.");
                }
              }}>Merge #{duplicate.id} into #{target.id}</button>)}
          </div>;
        })}
      </section>}

      <section className="panel">
        <h2>Printable approved pickup list</h2>
        <p>Only owner-approved lines appear in this printout. Family draft
          requests and pantry stock notes remain separate.</p>
        <button type="button" disabled={approved.length === 0}
          onClick={() => window.print()}>Print approved pickup list</button>
        {approved.length === 0 && <p>Nothing approved for pickup.</p>}
        {approved.length > 0 && <ul>{approved.map(item => <li key={item.id}>
          {item.name}: {quantity(item.wantedQty, item.unit)} · pickup {formatDate(item.pickupOn)}
        </li>)}</ul>}
      </section>

      <div className="grocery-print-sheet" aria-hidden="true">
        <h1>Our approved grocery pickup list</h1>
        <p>Prepared from the private Rosevear AI Hub. This is not an order or payment.</p>
        <ul>{approved.map(item => <li key={item.id}>
          <span className="grocery378-print-check">□</span>
          {item.name} — {quantity(item.wantedQty, item.unit)}
          {item.pickupOn ? " · " + item.pickupOn : ""}
          {item.note ? " · " + item.note : ""}
        </li>)}</ul>
      </div>

      <section className="panel">
        <h2>Recent household activity</h2>
        <p>Local append-only activity history; no external messages or merchant receipts.</p>
        {board.history.length === 0 ? <p>Nothing recorded yet.</p> :
          <ol className="grocery378-history">{board.history.slice(0, 20).map(event =>
            <li key={event.id}>{event.action.replaceAll("_", " ")}
              {" · item #"}{event.itemId}{" · revision "}{event.revision}
              {" · "}{new Date(event.recordedAt).toLocaleString()}</li>)}</ol>}
      </section>
    </>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
