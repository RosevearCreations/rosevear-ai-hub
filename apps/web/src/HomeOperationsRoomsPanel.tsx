import { useMemo, useState } from "react";
import type { AuthUser, HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { summarizeHomeOperationsRooms } from "./homeOperationsRoomsModel";

/** Owner planning only; this component cannot call an action endpoint. */
export function HomeOperationsRoomsPanel({ browser, policy, role }: {
  browser: HomeAssistantBrowserResponse | null;
  policy: HomeAssistantControlPolicy | null;
  role: AuthUser["role"];
}) {
  const summary = useMemo(() => summarizeHomeOperationsRooms(browser, policy), [browser, policy]);
  const [roomFilter, setRoomFilter] = useState("all");
  const [draft, setDraft] = useState<string[]>([]);
  const canPlan = role === "owner" || role === "administrator";
  const eligible = new Set(summary.rooms.flatMap(room => room.items)
    .filter(item => item.actionEligible && item.status === "current").map(item => item.entityId));
  const selected = draft.filter(id => eligible.has(id));
  const visible = summary.rooms.filter(room => roomFilter === "all" || room.name === roomFilter);

  return <section className="panel" aria-label="Build 216 home operations rooms and safe scene planning">
    <h2>Home operations · Rooms and safe scene planning</h2>
    <p>Source: current Home Assistant registry read. A green API does not verify physical action. Unknown or old observations need manual refresh before approval.</p>
    {!summary.available ? <p role="status">Home Assistant inventory unavailable. Room counts and device health are unknown, not zero. No scene can be planned.</p> : <>
      <p role="status">{summary.rooms.length} observed room groups · {summary.staleCount} older than 24 hours · {summary.unknownCount} unknown or unverified observations.</p>
      <label>Review room <select value={roomFilter} onChange={event => setRoomFilter(event.target.value)}>
        <option value="all">All rooms</option>{summary.rooms.map(room => <option key={room.name} value={room.name}>{room.name}</option>)}
      </select></label>
      {visible.map(room => <section key={room.name} aria-label={`${room.name} operations group`}>
        <h3>{room.name} ({room.items.length})</h3>
        <ul>{room.items.map(item => <li key={item.entityId}>
          <strong>{item.label}</strong> · {item.domain} · {item.state} · {item.status === "current" ? "recent HA observation" : item.status === "stale" ? "stale observation — recheck" : "state/timestamp unverified"}
          {item.actionEligible ? " · allowlisted candidate" : " · not allowlisted"}
          {canPlan && <button type="button" aria-pressed={selected.includes(item.entityId)}
            disabled={!item.actionEligible || item.status !== "current" || (selected.length >= 4 && !selected.includes(item.entityId))}
            onClick={() => setDraft(old => old.includes(item.entityId) ? old.filter(id => id !== item.entityId) : [...old, item.entityId])}>
            {selected.includes(item.entityId) ? "Remove" : "Include"} {item.label} in planning-only draft
          </button>}
        </li>)}</ul>
      </section>)}
    </>}
    <section aria-label="Owner scene approval boundary">
      <h3>Scene draft · {selected.length}/4 safe candidates</h3>
      <p>No scene command is prepared or sent here. Selection records intent for this open view only; it does not save, permit or execute an automation.</p>
      {canPlan && selected.length > 0 && <button type="button" onClick={() => setDraft([])}>Clear draft and safe-stop</button>}
      {!canPlan && <p>This account may inspect observed room states, but cannot prepare an owner scene draft.</p>}
      <p>For a real low-risk scene, use the separate existing Safe Action Drafts workbench with a fresh server preview, exact confirmation and audited execution. Do not use it for kilns, furnaces, doors, alarms or other hazardous controls.</p>
    </section>
    <details><summary><span aria-hidden="true">ⓘ</span> Room and scene safety help</summary>
      <ol><li>Refresh Home Assistant and inspect the actual device and source timestamp.</li>
        <li>Confirm the room, allowlist and low-risk hardware; check stale and unknown entries manually.</li>
        <li>Clear the draft to stop planning. For any real action, use the separately authorized preview-and-confirm workflow.</li>
        <li>Never infer physical success from a source response; record owner Windows/device acceptance separately.</li></ol>
    </details>
  </section>;
}
