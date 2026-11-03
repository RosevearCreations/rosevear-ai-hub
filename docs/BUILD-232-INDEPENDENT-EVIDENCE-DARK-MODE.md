# Build 232 — Independent Windows Evidence Reconciliation, Owner Decisions & Dark Mode

## New low-glare Dark Mode

Open the authenticated Hub and locate **Workspaces → Display theme** in the left sidebar.

- Choose **Dark Mode** for near-black/slate panels and readable pale text. It is the default when there is no previously saved valid display theme.
- Choose **Standard** for the existing midnight-blue UI.
- Choose **High contrast** for the brighter high-contrast presentation if needed.
- The theme switch is immediate. A recognized theme name is stored in local browser storage for return visits. No password, device state, account credentials or remote preference is stored.
- Owners can also save a named Dark Mode view in **System → Owner preferences & saved views**, then apply it again. Existing Standard and High contrast saved views remain compatible.
- Sidebar buttons, keyboard focus rings, search dialog, forms, tables and the Windows evidence review cards are darkened together. This is a presentation change, not a connectivity or role change.

## Owner and separate reviewer workflow

Navigate to **System → Windows field acceptance & regression matrix → Windows independent evidence reconciliation & authorized closure decisions**.

1. Start from a genuine owner-observed Build 228 installed-Windows finding or blocker. Build 229 must source-match the original with an owner-scoped repair proposal.
2. Backup/resources also require a current Build 230 candidate. All five Build 231 scopes require two distinct witnessed references, an installed version and a fresh owner-recorded packet.
3. Enter only short, safe **tracking identifiers** from a separately obtained reviewer result: reviewer tracking code, independent evidence receipt, evidence type and result (corroborated, conflict, insufficient). Attest that a separate reviewer supplied it; explicitly **record fresh reviewer reference**. The software **does not authenticate the reviewer identity or the receipt**.
4. For a corroborated reviewer claim, select an owner decision: request a separate closure review, request another retest, or defer. Enter a distinct owner decision reference and explicitly record its fresh time. A closure-review request additionally requires an explicit separate authorization checkbox.
5. A conflicting/insufficient independent result cannot request closure, but an owner may record a separate retest request or defer disposition. Any original, plan, retest, owner packet, reviewer result or decision change invalidates the earlier review until it is recorded again.
6. Copy the **private Build 232 reconciliation & owner decision packet** to a private local record for authentic outside review. No packet content is uploaded. No issue is independently verified or automatically closed by this screen.

## Source truth and security limits

- No authentic installed-Windows acceptance records or independently witnessed reviewer receipts were available for this build. All real review totals start at **0**. Synthetic fixtures exist only in automated tests.
- The verified-closure count stays **0** even if a user enters an owner-requested closure review. An external reviewer must authenticate their own evidence and a separate owner must decide whether to close the real field issue; this app cannot substitute for those actions.
- This build does not restart the Windows PC, operate Home Assistant or X10/MQTT, open private camera streams, change roles, run a backup/restore or authorize a live fix.
- Six-app integration remains **DISCONNECTED / HOLD**; private relay **OFF**; QL-275 **UNDER REVIEW / DEFERRED**; first-party vault **SECURITY HOLD**.
- GitHub `main` Production GREEN is source CI and does not prove that the installed mini-server has updated, passed a field walkthrough or independently resolved issues.

## Reproducible source checks

- `npm run build:232:hub:test` exercises empty/no-network defaults, upstream identity and freshness, independent reviewer and owner-decision separation, blocked/conflicting evidence, typed-code safety, Dark Mode storage and strict saved-view parsing.
- `npm run web:typecheck`, `npm run web:build`, full web tests and five GitHub Actions jobs on `dev`, PR and exact protected `main` are required for source promotion.
- No automatic Build 233 is authorized. Field findings and separately approved owner priorities determine any next change.
