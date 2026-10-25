# Build 136 — Vault Guided Review Routes & Session Pinboard

## Purpose

Make the increasingly detailed first-party vault security review easier for household operators to navigate without confusing reading progress with real security approval.

## Delivered interface

- A **Suggested review route** selector provides three fixed reading plans:
  1. **Design and separation:** first-party blueprint, cryptography, service/household identity, client isolation, vault-only MFA and document handling.
  2. **Independent assessment:** genuine external assessor handoff, findings/remediation, and change-impact retesting.
  3. **Recovery and Windows pilot planning:** independent anti-rollback/recovery architecture and separate Windows acceptance requirements.
- All eleven existing on-page review destinations occur in exactly one guided route. Route links preserve their documented sequence; “All review sections” retains the previous general index.
- Search and category filters from Build 135 continue to work within a route.
- Each result has an accessible **Pin/Unpin** toggle. **Show pinned sections only** and **Clear session pins** help us temporarily assemble a reading list. A pin is **never** a completion, finding closure or owner approval.
- Pins, selected route, query and categories are kept only in the mounted browser component state. Reloading or leaving the Vault view clears them, and they are never sent to an API or written to cookies, local/session storage or a backend.
- The Build 135 browser-native print sheet remains a static warning and six-milestone summary regardless of chosen route or pins.

## Security and user acceptance

- **0 / 6 VERIFIED · HOLD** remains fixed to the real unverified status. Synthetic checks, pins, routes, search and GitHub CI cannot change the status.
- No real password/note/document data, MFA registration, encrypted store, persistent keys, backup, network endpoint, Windows process or external security sign-off is introduced.
- External cryptographic assessment, Windows service separation, independent remediation/retest, explicit owner approval and a witnessed disposable-data pilot are still required before any live vault can be considered.
- Test the three guided paths against the exact in-page anchors, all-eleven coverage, canonical route ordering, combined filters, session pin reset, and immutable fail-closed security result. Validate typecheck, full Vitest, production build and GitHub feature/dev/main CI independently.

## Rollback

Revert Build 136 frontend and documentation changes. There is no migration, saved preference, Windows process, secret or physical system state to roll back.
