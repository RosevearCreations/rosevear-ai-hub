# Build 277 — Alert Search, Source Filters & Accessible Follow-Up Paging

## Home workflow

The pinned Home activity panel has three independent read-only triage controls:

1. **Priority** — urgent, warning, unread, verification or setup follow-ups.
2. **Source** — all sources, authenticated local inbox entries, Hub backend health, local AI health or inbox availability observations.
3. **Search loaded page** — case-insensitive matches against visible alert titles and summary text, never private inbox messages or raw device identifiers.

**Show all alerts** resets these three filters without changing the inbox or current page. Each change closes an open detail preview. Current health observations are separate from actual inbox entries and may appear on every page. A filter with no matches explicitly states that other pages may contain entries; filtering is **not** a global inbox search.

The **Previous inbox page** and **Next inbox page** buttons request ten local notifications at a time using the existing authenticated read-only GET `/api/v1/notifications?status=all&limit=10&offset=…`. Numbered pages and total counts use validated server-provided `total`, `limit` and `offset`; the total includes informational notifications, which are not priority alerts. The next-page button is disabled at the end or on errors; paging controls are disabled during loading. On an error beyond page one, the previous-page control remains available for recovery. The interface presents a labelled paging navigation region, a live page/count announcement and keyboard-focus styles. All matching follow-ups on a loaded page remain available for preview.

The three full-inbox priority counts (unread, urgent and warning) come from the separate summary GET, never from the filtered sample. The “Recent local notifications” column is explicitly limited to the loaded page. A failed, contradictory or malformed page is shown as **unverified**, never as a falsely empty inbox. Refresh re-reads only the current page and summary; stale requests are aborted when changing pages.

## Boundaries

- No server schema change, new database write, client storage, acknowledgement, dismissal, message, relay activation or device command.
- No privilege expansion: source-screen links remain role-gated, and restricted inbox message bodies and source IDs are never searched or displayed without Notifications permission.
- Local health observations are not event evidence; Comms attachment remains **HOLD** and private relay **OFF**.
- Pagination does **not** certify that the entire inbox has been reviewed, and page-local searches do not cover unseen pages.

## Verification / deployment

Build 277 adds model tests for search, source boundaries and bad page metadata, plus Home UI tests for two-page navigation, true counts, reset, restricted content and failures. Run the complete web tests and production build; then protected feature → `dev` → `main` PRs and independent `main` checks must be green before claiming source production promotion. GitHub release does **not** install the updated client on Ree’s Windows mini-server.
