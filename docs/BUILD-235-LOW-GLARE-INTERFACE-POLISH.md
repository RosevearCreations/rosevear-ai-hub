# Build 235 — Dark Mode Usability Corrections & General Interface Polish

**Owner authorization (2026-11-03):** both Dark Mode corrections and wider interface improvements, source-only. Build 234's authentic owner field-finding / independent repair gates remain unchanged; this build is not a field-evidence-driven repair authorization.

## Changes

1. **Observed source-level Dark Mode regression:** sign-out forced `standard`, overriding the user-selected low-glare appearance. Sign-out now resets sensitive workspace/session state while preserving the display theme only, which is held in the existing local browser preference. No password, token, session, device ID, or customer content is saved by the theme code.
2. **No white sign-in surprise:** loading, backend-unavailable and sign-in views respect the selected theme. Dark Mode is near-black, Standard uses midnight blue, and the explicitly selectable High contrast presentation stays bright. Signed-out users can change display theme without signing in or invoking backend operations.
3. **Easier navigation:** an always-available, keyboard-native appearance selector in the authenticated top bar mirrors the existing sidebar choice. Dark Mode header/sidebar/hero surfaces now use lower-glare neutrals, with clearer selected-navigation borders and visible focus rings. Small screens wrap the selector rather than clipping it.

## Verification

- `npm run build:235:hub:test` and `npm run build:235:app:test`: auth-cookie acceptance, pre-login theme selection, top-bar/sidebar synchronization, sign-out persistence, the existing Build 228 Windows acceptance and Build 234 no-repair evidence guard tests. The focused App script isolates the resource-heavy shell cases; the full CI suite separately exercises every App case.
- `npm run web:typecheck` and `npm run web:build`.
- Full web suite and five required GitHub Actions jobs on the exact `dev` / `main` commits before reporting source Production GREEN.
- Actual owner Windows low-glare acceptance requires manual field checks, not CI inference. Record any failed/blocked Build 233 review separately under Build 234 and obtain separate permission for any substantive repair.

## Unchanged safety boundaries

- No Windows device/camera action, restart, backup restore, network probe, role/security change, external reviewer authentication or independently verified closure.
- All six cross-app integrations remain **DISCONNECTED / HOLD**; private relay **OFF**; QL-275 **Under Review**; password/document vault **SECURITY HOLD**; zero authenticated gateway GETs and no inferred owner TEST approval.
- Presentation changes do not imply installation on the owner Windows mini-server. Verify locally after source promotion.
