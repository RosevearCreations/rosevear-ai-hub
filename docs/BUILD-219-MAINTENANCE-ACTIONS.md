# Build 219 — Household and Workshop Maintenance Action Board

An authenticated action board in the Workshop workspace brings together **bounded local readbacks** of due/blocked workshop equipment, owner-annotated device investigations, saved camera-event follow-ups, and owner-created household/workshop tasks. The source identity `(kind, id)` is unique, so refresh does not duplicate tasks. The first 200 items per derived source category are considered; no live camera or network probe occurs.

Migration `0029` adds audited, revision-safe owner overlays: assignee, optional timezone-aware due date, acknowledgement, status (`open`, `deferred`, `closed`) and reason. Owners/Administrators can create manual tasks and save decisions; other authenticated roles are read-only. Defer/close requires a written reason. A blocked/overdue workshop item, device investigation, camera follow-up, or stale source **cannot be closed from this board**; acknowledgement and deferment are retained without mutating the underlying source. Previously reviewed out-of-scope source overlays remain visible as stale rather than silently disappearing. Manual tasks can be closed and reopened.

The UI offers search, source/status filtering, keyboard-reachable native controls, source age warnings and a CSV export with spreadsheet-formula escaping. Export is a point-in-time local review snapshot, not a backup. Source metadata and decision text must remain behind Hub authentication; no external notifications, equipment control, scheduling, or automatic repair are introduced.

QL-275 remains deferred/Under Review, private relay OFF, integrations disconnected/HOLD. Production source CI does not establish physical Windows installation acceptance or independent safety approval.
