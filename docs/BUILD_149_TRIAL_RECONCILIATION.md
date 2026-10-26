# Build 149 — Owner Trial Finding Reconciliation, Repair Handoff & Safe Retest Comparison

## Source capability

Inside the owner/admin-only **System → Home operations field trial & follow-ups** workbench, Build 149 adds **Finding reconciliation & safe repair handoffs**. It uses the nine Build 148 trial cases and their existing owner-witnessed history; no new device or Windows APIs are introduced.

- All `issue` and `blocked` events remain in order with their original timestamps, even after an owner records a later pass. A single case may have several failures, but only one most-recent baseline is suggested for a new draft. Older handoffs still reference their exact original observation index.
- Results are grouped by subsystem and filterable by coarse severity, next-action role, outstanding/improved status and recurring cases. Severity is an **informational triage heuristic** (high/moderate/low), never a safety rating, work permission or claim about physical device health.
- Each manual repair guide is constrained to a fixed reviewed template for Home, Devices, Cameras, Home Assistant, MQTT, Workshop, Windows, Accessibility or private access. No freeform credentials, IPs, paths, camera URLs or MQTT payloads are collected.
- Operators deliberately draft an internal handoff, explicitly attest to reviewing that exact source finding, and separately prepare it for private manual delivery. These stages **do not send a task**, apply a configuration change, restart Windows, operate a camera, control HA, publish MQTT or release workshop equipment.
- Comparing later observations against the original handoff yields: *awaiting retest*, *still open*, *changed finding*, or *owner-observed improvement awaiting independent review*. No comparison automatically closes a handoff or certifies the household Windows installation.

## Receipt compatibility and privacy

Build 149 imports the original `rosevear_owner_field_trial` v1 receipt and its own `rosevear_owner_trial_reconciliation` v1 wrapper. The wrapper contains a validated Build 148 receipt plus at most 100 small, structured handoff records; all histories remain bounded. It requires unconditional `FIELD_ACCEPTANCE_HOLD` and `INDEPENDENT_REVIEW_HOLD`, rejects unexpected handoff fields, duplicate baseline records, unsupported stages, inconsistent timestamps or unverifiable source indices.

Imported observations and handoff stages are **historical operator claims**, never verified signatures or fresh installation evidence. Import resets the manual Windows witness check and the handoff review checkbox. Replacing a nonempty browser session prompts first. Trial-only export remains available; reconciliation export explicitly includes the internal handoffs. Downloads should be retained privately, not posted to public issues or CI artifacts. Refresh or sign-out clears unsaved browser-session data.

The first-party Vault continues to read **0/6 SECURITY HOLD**. Source pipeline success is independent of actual Windows/device field acceptance.

## Tests

```sh
npm run web:typecheck
npm --workspace apps/web exec vitest run src/ownerFieldTrial.test.ts src/ownerTrialReconciliation.test.ts src/OwnerFieldTrialWorkbench.test.tsx src/App.test.tsx
npm run web:test
npm run web:build
```

Acceptance cases cover old/new receipt compatibility, repeated findings, role and severity categorization, exact-baseline retest comparisons, explicit review progression, malformed or secret-bearing data rejection, import freshness reset and unconditional acceptance holds.

## Promotion and field trial

Promote via green feature→`dev` PR, green independent `dev` push, green `dev`→`main` PR and green independent `main` push. No pipeline is an owner witness. An independent visit to the actual Windows installation and explicitly recorded device/camera/accessibility results are still required before any later physical acceptance decision.
