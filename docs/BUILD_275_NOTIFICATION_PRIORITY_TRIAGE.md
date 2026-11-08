# Build 275 — Notification Priority Triage, Filtered Home Alerts & Safe Review Navigation

## Scope

The pinned Build 274 Home activity panel now offers a keyboard-accessible, session-only **Show follow-ups** filter:

- All priorities, Urgent only, Warnings only, Unread notifications, Needs verification, and Setup guidance.
- A **Show all alerts** reset button and a truthful count of shown, matching and total sampled follow-ups.
- Distinct empty-filter guidance that does not claim hidden items have been resolved or that the Hub is healthy.
- Priority filtering applies only to the Home follow-up preview. The recent notification history, unread/urgent/warning counters, essential Hub/Comms status and underlying source responses remain unchanged.

The initial local inbox GET already limits its sample to ten notifications. The full sampled priority list is derived before filtering; only the final on-screen preview is capped at six. This avoids dropping matching items before the requested filter is applied. The panel never claims to show all alerts in the entire database.

## Security and behavior

- Filter interactions change **component display state only**; no new API request, local storage write, read acknowledgement, dismissal, send, repair or owner-authorized action.
- Follow-up buttons remain navigation-only and are gated by `allowedSections`; read-only roles receive only their allowed routes.
- An unavailable notification API continues to show **unverified** counts and a visible failure message even when a filter hides its follow-up card.
- The panel remains pinned outside Build 273's optional widgets, preserving the warning/status area if all optional widgets are hidden.
- Comms stays **HOLD**, relay remains **OFF** and no connection trust state is changed.

## Verification

- Production TypeScript/web build; new model, component and App tests for filter behavior, empty states, counts, allowed navigation and no refetch.
- Complete local web regression suite.
- Protected source PR → `dev` checks, protected `dev` → `main` checks, and independent `main` push CI. Production is GREEN only after all required gates pass.

GitHub promotion does not update Ree's physical Windows AI Hub installation.
