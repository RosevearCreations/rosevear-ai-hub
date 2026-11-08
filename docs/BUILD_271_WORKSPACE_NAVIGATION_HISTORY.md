# Build 271 — Workspace Navigation History, Safe Return Controls & Recovery

## Daily use

Under the current workspace breadcrumb, **Back**, **Forward** and **Home**
provide straightforward in-app navigation without searching the menu again.
Disabled buttons make unavailable routes clear. The controls work with the
existing responsive sidebar, Ctrl+K finder and pinned/recent workspace links.

The history contains at most twelve prior screens and is kept only in memory
for the active sign-in. Opening a different workspace clears the forward path.
**Home** starts a new navigation step so Back can return to the prior screen.

## Safety and privacy

- Only workspace names are tracked, never records, form values, credentials,
  device actions or search queries. No API or background network call is added.
- Back and Forward reopen screens; they do not replay button clicks, mutations,
  remote commands, tool invocations or confirmations.
- Every step filters destinations against the currently authenticated role's
  allowlist. Stale owner-only history is removed if permissions narrow.
- Session expiration, sign-out and a new sign-in clear the history entirely.
  It is not written to local storage, browser history or a backend database.
- This build does not activate private Comms, cameras, home automation or
  any disabled Windows restart flow.

## Acceptance

- Pure history tests: bidirectional navigation, forward invalidation, history
  bound, role downgrade, malformed entries, repeat prevention and reset.
- React control tests: accessible disabled states, explicit selection,
  owner-only route suppression and Home recovery.
- App integration test: normal navigation, Back/Forward/Home and sign-out.
- Full web typecheck, test suite and production build.
- Protected PR to `dev`, protected PR to `main`, then independent `main`
  production-push gates (all six required checks must be GREEN).

Production GREEN validates source and CI, not the installed Windows client.
