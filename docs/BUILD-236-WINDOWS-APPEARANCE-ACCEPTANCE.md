# Build 236 — Windows Dark Mode & Responsive Navigation Owner Acceptance, Visual Regression Review and Evidence-Based Follow-Up

**Owner authorization (2026-11-03):** Build 236 source-only owner acceptance and follow-up workflow after Build 235's promoted UI polish. This is not permission to run unsupervised tests on the Windows mini-server or repair a device, service, account, camera, network or vault.

## Owner walkthrough

1. Open **System** as an owner or administrator, then expand **Build 236 Windows visual acceptance worksheet**. The longer forms are not rendered until selected.
2. On our actual installed Windows Hub, verify the installed version and check the **I personally observed** box. Choose Dark Mode; the form refuses to count an acceptance in another theme.
3. Review each screen and viewport: signed-out loading and error states; sign-out Dark Mode retention; quick selector/sidebar synchronization; header/hero/status contrast; narrow or tablet layout; keyboard focus at 200% zoom; reload and appearance persistence.
4. For each personally observed case, choose result and actual Windows viewport, enter one distinct code-only evidence reference, and record the current owner timestamp. A finding/blocked observation additionally needs a fixed issue category.
5. Genuine findings remain open. A separate owner decision can request a retest, defer, or request an outside review, with a new distinct reference, consent and fresh timestamp. A review *request* is not outside authentication or a repair authorization.
6. Copy the private redacted packet when needed for separate independent review. Nothing is uploaded or saved beyond the current browser session; navigating to another authorized workspace preserves the worksheet until the System view is closed or the session resets.

## Validation and boundaries

- `npm run build:236:hub:test` covers empty evidence, stale source/version/viewport, duplicate references, narrow-layout guards, observed-pass freshness, distinct follow-up consent and time, owner-only manual navigation and no API side effects.
- `npm run web:typecheck`, `npm run web:build`, the full web suite and five exact SHA GitHub Actions jobs on both `dev` and `main` are mandatory source release checks.
- At rollout there are **zero actual owner Windows observations**, **zero verified installed-Windows acceptances**, **zero independently authenticated reviewers**, and **zero authorized or executed repairs**. Passing source CI must never be substituted for these checks.
- Build 233/234 source-linked conditional review and owner repair permission stay separate. Six apps remain **DISCONNECTED / HOLD**, private relay **OFF**, QL-275 **Under Review**, vault **SECURITY HOLD**, authenticated gateway GETs **zero**.
- Never paste private IPs, URLs, full logs, camera imagery, account identifiers, credentials or customer data into references.
