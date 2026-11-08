# Build 274 — Home Activity Summary, Priority Alerts & Read-Only Follow-Up Shortcuts

## Scope

The authenticated Home dashboard now includes a **pinned, read-only activity panel** using existing local Notifications list/summary GET endpoints, plus the already-observed backend and Ollama health results. The display includes:

- Urgent, warning and unread totals from the local notification summary (shown as **Not verified** until the GET succeeds).
- At most three recent real notification titles and timestamps. Entries are labelled as local inbox history; health readings are labelled **current observations**, never historical events.
- Prioritized urgent/warning notifications and local health/recovery guidance with navigation-only links.
- Explicit empty, loading, offline, invalid-response and request-failure states; a manual **Refresh activity** GET action.

## Safety and access

- Existing sign-in and `allowedSections` continue to control every follow-up destination. Read-only users receive `Search & Help` rather than administrative System guidance, if permitted.
- No mark-read, dismiss, create, send, repair, provider activation, Comms state change, or background polling action is performed. Opening Notifications is navigation only.
- No new endpoint or database migration. The authenticated local Notifications APIs remain the source of truth; malformed results fail closed as **unverified**.
- Notification previews show only titles, severity, read status and creation time, not full message details or secrets.
- The panel is kept outside optional rearrangeable widgets so priority warnings remain visible even when all Build 273 optional widgets are hidden; saved layouts remain valid and unchanged.
- Comms attachment remains **HOLD**; no connection is activated by this UI.

## Verification

- Production TypeScript/web build and focused model/component/App integration tests.
- Full web regression suite.
- Feature → `dev` protected checks, `dev` → `main` protected checks, and a separate successful `main` push CI run. Production is not GREEN until all required checks succeed.

The GitHub production promotion does not install this code on Ree's physical Windows mini-server.
