# Build 137 — Vault Reading Progress & Continue-Where-You-Left-Off (session-only)

## Purpose and scope

Help household operators work through the eleven existing first-party Vault review headings in a long page, without representing this reading as external security verification, independent findings closure or Windows pilot approval.

## Delivered

- **Mark read for this visit / Mark unread** on each of the eleven fixed review links; accessible `aria-pressed` state with keyboard-operable buttons.
- **Reading progress** for the selected Build 136 route, plus overall 11-heading count. Each count is derived only from fixed known section IDs, not from user-supplied titles or security findings.
- **Continue to next unread section** links to the next internal review anchor in the route's prescribed order, even when ordinary topic, category or pin filters hide that section. Completed route shows a clear disclaimer instead of an approval badge.
- **Show unread headings only**, composable with topic, category, guided route and session pin filters. The zero-results reset turns off the unread filter without altering the actual reading markers.
- **Reset reading markers** deliberately clears all markers and the unread-only setting; leaving or refreshing the Vault page also clears every marker. No persistent storage, network requests, backend, Windows tasks, credential intake, documents or real audit checklist was added.

## Independent security boundary

Reading 11/11 headings is not completion of any of the six real security milestones. The dashboard remains **0 / 6 VERIFIED · HOLD** regardless of reader activity, routes, filters or attempted forged claims. A real vault implementation, vetted production cryptography, independent assessment and retests, separate owner approval and a witnessed disposable-data Windows pilot remain prerequisites. All live password, document, MFA, backup, recovery and installation operations remain **OFF**.

The Build 135 browser-native print summary intentionally excludes current reading progress and personal session state. The page contains no input for household secrets or private documents.

## Verification and rollback

- Pure tests check route ordering, non-duplicated progress, invalid/untrusted section IDs, unread filter composition and unchanged security denial invariants.
- React tests exercise progress, next-link destinations, unread-only filter, marker reset, per-session unmount and an all-read state that explicitly never implies audit approval.
- Run `npm run web:typecheck`, `npm run web:test`, `npm run web:build`, plus independent GitHub feature, dev and main CI.
- Revert Build 137 interface and documentation if required; there is no database migration, stored user state, Windows service or runtime installation to undo.
