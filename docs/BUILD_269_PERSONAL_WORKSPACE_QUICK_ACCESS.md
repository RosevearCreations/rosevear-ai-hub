# Build 269 — Personal Workspace Quick Access and Safe Navigation

## Purpose

Make daily navigation easier on the Windows client and PWA without introducing a
new background service, privileged action, or Comms Hub integration dependency.

In the authenticated sidebar, **My quick access** lets a user:

1. Pin or unpin the current workspace (up to six pins).
2. Jump to recently visited workspaces (up to five names).
3. Clear personal shortcuts without changing any account, device, or business data.

The existing Ctrl+K finder, Update Hub, Restart Client, Dark Mode and other
owner controls remain unchanged.

## Privacy and security

- Each browser stores only allowed **workspace names** under an ID-specific
  local-storage key; no tokens, record IDs, search queries, receipts, or secrets.
- The authenticated application provides the role-filtered allowlist. Readback,
  navigation and writes reject names outside that allowlist; a downgraded user
  cannot see admin-only saved shortcuts.
- Different user IDs do not share shortcuts. There is no automatic navigation,
  background search, server write, external request, device action, or privilege
  escalation.
- Malformed or unavailable browser storage silently falls back to empty
  shortcuts. Navigation keeps working with storage blocked.
- Pins/recent names are purely local conveniences; sign-out never exposes them
  on the unauthenticated screen.

## Acceptance

- `npm run web:typecheck`
- `npm run web:test` (includes `WorkspaceQuickAccess.test.tsx`)
- `npm run web:build`
- Existing protected source PR, `dev` → `main` PR and independent `main` push
  checks remain required, with no security checks removed.

Production GREEN certifies the code and build pipeline, **not** a supervised
Windows installation or private Comms connection.
