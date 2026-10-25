# Build 135 — Vault Review Finder & Print-Safe Readiness Summary

## Delivered scope

The signed-in **Vault** architecture screen now provides an operator-friendly topic finder over the eleven read-only security review sections introduced in Build 134. An eighty-character maximum, transient browser search and explicit review-category filter operate only on static section labels and descriptions. The finder never searches credentials, personal files, accounts, integrations or a backend database.

The screen also includes a **Print safety and readiness summary** control. This invokes the browser's native print preview; print-only styles isolate the page warning, six actual unverified readiness milestones and their explanatory text. Internal navigation, app sidebar, lengthy technical panels, interactive controls and help disclosures are omitted from the printed summary. The browser/user decides whether to print or save; the Hub does not upload, create or persist a report.

## Operator workflow

1. Open the authenticated **Vault** page, still labelled **SECURITY HOLD**.
2. Use **Find by topic** (for example, `Windows`, `hardware factors`, or `rollback`) and optionally **Review category**.
3. Follow a matching heading link to its existing on-page documentation. If no heading matches, select **Show all review sections** to reset both filters.
4. Optionally select **Print safety and readiness summary** to inspect the safe, concise six-milestone status in the native print preview. This is *not* a security audit or approval certificate.

## Independent security boundaries

- All six milestones remain actually **NOT VERIFIED**; the counter is always **0 / 6 VERIFIED · HOLD**.
- No actual first-party encrypted vault service or persistent storage exists. No password, document, passkey registration, backup, restore or Windows deployment is enabled.
- Search input is ephemeral and in-page, does not submit a form or invoke an API, and is not retained in local/session storage.
- Print contains only static non-secret review information. It does not send a message, upload evidence, approve a milestone or substitute for an independent review.
- A successful GitHub workflow proves checked source only. Independent security analysis, verified Windows process/identity/HTTPS isolation, retesting and separate owner-authorized disposable pilot are still required before any live credential/document use.

## Acceptance and rollback

Acceptance requires TypeScript typecheck, the full Vitest suite, production web build, and branch-protected feature/dev/promotion/main GitHub checks. New UI tests cover keyboard-addressable local links, filtering, zero-result reset, browser-only print invocation and absence of network submission. Pure tests cover bounded fixed-index search, category selection and preservation of the immutable security hold.

Rollback is limited to reverting Build 135 source/UI changes. There is no migration, state to erase, installed service or home-server operational change.
