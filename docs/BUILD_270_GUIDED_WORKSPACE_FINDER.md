# Build 270 — Guided Workspace Finder and Keyboard Navigation

## Goal

Make regular AI Hub navigation easier without opening additional accounts,
performing actions, or depending on Comms Hub connectivity.

The authenticated **Find screen** control (Ctrl+K on Windows, Command+K on
macOS) now accepts plain task words as well as exact screen names. For example:

- **lights** → Devices
- **video** → Cameras
- **projects** → Workshop, for owner/administrator accounts only
- **backup** → System
- **permissions** → Users, for owner/administrator accounts only

Screen-name matches sort ahead of task aliases. Result descriptions explain
where each workspace leads. Arrow Up/Down, Home and End navigate the result
buttons; Enter opens a result and Escape dismisses the finder. Opening a result
is always an explicit user action.

## Trust and privacy boundary

- Only the authenticated application's existing role-filtered `sections` list
  is searched. Task synonyms cannot reveal, invent, or navigate to an
  unauthorized workspace.
- This feature neither reads private records nor executes tools, device
  controls, automation, migrations, or Comms connections.
- Search text is kept only in the mounted dialog; closing it clears the text.
  No search history, network traffic or new local-storage key is introduced.
- The existing owner approval and Comms private-receiver state is unchanged.

## Acceptance

- Web TypeScript check and production bundle.
- `CommandShell.test.tsx` regressions for aliases, result ordering, role
  exclusions, keyboard navigation, explicit selection, empty results and
  focus return.
- Existing `WorkspaceQuickAccess.test.tsx` and full web regression suite.
- Normal protected feature → `dev` → `main` PR gates, followed by independent
  `main` push CI, with no checks disabled.

Production GREEN is evidence of the source and CI checks, not proof that the
Windows mini-server was updated or that the private Comms receiver is active.
