# Build 147 — Responsive Command Shell, Theme Polish & Contextual Help Refresh

## Purpose and scope

Build 147 improves usability of the existing authenticated Rosevear AI Hub without changing its backend, household machine, integrations, authorizations or safety controls. It builds on the operational screens from Builds 138–146.

## Implementation

- The desktop sidebar has a current-screen indicator, a visible screen finder, a breadcrumb and session-only **Comfortable/Compact** and **Standard/High contrast** choices.
- At widths up to 760 px, primary navigation becomes an explicit **Open menu** disclosure. It closes after navigation. At widths up to 420 px, the menu stacks rather than creating a horizontal scroll trap.
- **Ctrl+K / Cmd+K** opens a dialog with keyboard focus, case-insensitive route search, Escape-to-close, and focus restoration. Tab remains inside the modal; Enter in the search box selects the first visible match. The eligible route list is supplied by the existing authenticated role gate; hidden owner/admin routes cannot be found by a less privileged user.
- New circled-**i** information disclosures on shell settings, Home shortcuts, source health and room context cards explain data provenance and limitations. They do not fetch data or change service state.
- Section Help closes on route changes or Escape and restores keyboard focus. System Help identifies the observational Windows console and command-shell limitations.
- Vault Help now explicitly reflects the planned first-party, locally hosted household vault instead of instructing installation of a third-party password manager. It keeps the independent security milestone hold and prohibits credential entry into this Hub preview.
- No user preference or search text is written to local storage or sent to an API. Reset on sign-out; refresh returns to defaults.

## Safety and operator boundary

- The finder navigates only. It **cannot** execute Home Assistant scenes, publish MQTT, start/stop Windows services, control workshop machinery, play unreviewed camera endpoints or access secrets.
- High-contrast mode is a presentation choice, not a change to identity, permissions, data retention or cryptography.
- Source-level tests and CI **do not** establish household Windows startup, physical device health, camera playback, accessibility on a real assistive-technology setup or local rollout acceptance.
- The first-party password/document Vault remains **0/6 independently verified — SECURITY HOLD**. This release adds no vault credential storage or activation.

## Verification

Run from `apps/web`:

```sh
npm run typecheck
npx vitest run src/CommandShell.test.tsx src/HelpSystem.test.tsx src/App.test.tsx src/HomeOperationsHub.test.tsx
npm run test
npm run build
```

Acceptance scenarios:

1. Load an authenticated owner/admin UI at desktop and narrow widths. Open and close the mobile menu; navigate to a screen and check the menu collapses.
2. Use keyboard Ctrl/Cmd+K, type part of a route, choose it and confirm focus restoration after Escape. Ensure a role-restricted account cannot find unauthorized entries.
3. Select Compact and High contrast, verify focused controls remain identifiable; sign out or refresh and confirm preferences do not persist.
4. Expand contextual help on the Home screen and read accurate status/source notes. Verify System and Vault Help make no promise of real Windows commands or usable password storage.
5. Independently inspect the signed-in household Windows installation after deployment; record any mobile, screen-reader, integration or playback gaps for Build 148. Do not mark physical Production GREEN based solely on GitHub CI.

## Promotion evidence

Use reviewed feature branch → `dev` PR → independently green `dev` CI → `main` PR → independently green `main` CI. Record exact PRs, SHA and workflow result in the promotion handoff. Production GREEN here means GitHub source checks are green; real Windows rollout requires separately observed evidence.
