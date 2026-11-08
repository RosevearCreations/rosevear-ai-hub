# Build 279 — Saved Alert Review Views, Cross-Page Continuity & Accessible Bookmarks

This release follows the owner's alert-review request, labelled Build 278 in the conversation. The preceding I.T. cleanup was already recorded and promoted as Build 278; the alert workflow uses **Build 279** to keep its source, CI and production evidence distinct.

## User experience

- **Named views:** up to six names per signed-in local account on this browser. Each view retains the selected priority, source and bounded search term. Applying a view filters the **currently loaded page only**; it never claims a whole-inbox search or changes server counts.
- **Cross-page continuity:** priority/source/search preferences, loaded page offset and the last selected notification preview are kept in the current browser tab's session storage, scoped to the local authenticated account ID. Returning Home re-fetches that page; a missing/changed notification produces an explicit uncertainty message instead of a fabricated reviewed state.
- **Read-only review bookmarks:** up to 12 notification IDs and sampled page offsets, with named jump and remove controls. No notification title, message, camera data, bearer token, source identifier or credential is saved inside bookmark entries. Bookmark jumps use existing read-only pages, clear conflicting filters and re-check availability. No server acknowledgements, repairs, relays or notifications are sent.
- **Accessibility:** all controls use native labelled inputs, buttons and navigational regions, with visible focus outlines and live status messages. Bookmarks are hidden when the signed-in account lacks Notifications access.

## Safety and storage

State is strictly browser-local and keyed to a valid authenticated numeric account ID. Saved view names reject control characters, links and common credential labels; all persisted data is length-bounded, versioned and validated when read. Invalid or unavailable storage falls back safely. Bookmarks are references, not durable guarantees that an alert is still in the same page position. The actual Notifications page is the authoritative source for any subsequent action.

No backend schemas, login providers, roles, Comms trust, Windows startup tasks or physical devices are modified. A green GitHub release remains separate from installing the client on Ree's Windows machine.

## Acceptance

Test view persistence and per-account isolation; malformed storage; maximum view and bookmark counts; source-filter and search continuity across verified inbox pages; bookmark navigation and return from another screen; missing/stale record uncertainty; negative notification access; and absence of server writes. Run the whole web regression, type check and production build, then promote through protected PRs to `dev` and `main` and independently verify fresh `main` CI.
