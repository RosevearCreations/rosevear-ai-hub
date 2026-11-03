# Build 241 — Windows Post-Restart Owner Evidence Reconciliation & Conditional Repair Readiness

**Source-only.** The Windows mini-server has not been rebooted, inspected, updated or repaired by this build. GitHub main CI GREEN is not installed host acceptance. No real owner post-restart result has been supplied in this build. Zero genuine exceptions are prepopulated.

## Owner workflow

1. Perform the [supervised restart](WINDOWS_SUPERVISED_RESTART_2026.md) locally only after verifying off-machine Hub and separate HA backups, existing tasks, and original HA VM. Never start duplicate services or import another VirtualBox guest to force green.
2. In **System → Build 240**, record real owner-observed results and copy its **code-only JSON handoff** privately. It is not a signed Windows boot receipt.
3. In **System → Build 241**, import that exact handoff. Actual witnessed reboot, sign-in and a full five-minute recovery cycle are required; changed, missing, duplicate or stale source details must be re-observed. The worksheet makes no network calls.
4. Preserve all eight checks in order: existing tasks → Hub API → installed login → original HA VirtualBox guest → authenticated MQTT → Ollama service/model → trusted private HTTPS → authorized moving camera video. The first unresolved dependency supplies its next safe read-only check.
5. Only owner-reported **failed**, **partial**, or **not-configured** checks with valid Build 240 evidence become owner-exception candidates. **Untested**, invalid or stale observations remain evidence HOLD, not proof of a defect. A **working** self-report is not an independent acceptance certificate.
6. Personally inspect the original observation. Record the source basis, a new distinct safe code and a separate owner acknowledgment. Reused codes, changed observations, stale snapshots and missing witnesses block decisions.
7. Select **defer**, **request real retest**, **request independent proof**, or **conditional exact-scope repair authorization REVIEW**. Repair review is possible only for source-linked failed/partial results, and requires a matching scope, separate rollback code, distinct decision receipt and explicit request-only acknowledgement. It is **not permission to repair**.
8. Copy the redacted owner packet privately. All form state is browser-session-only: no database, provider API, GitHub operation, network upload or external delivery occurs.

## Code, CI and safety

- apps/web/src/windowsRestart241.ts: deterministic provenance, source binding, stale/duplicate and exact-scope no-repair gates.
- apps/web/src/WindowsRestart241Panel.tsx: owner/admin-only keyboard accessible, low-glare System worksheet.
- apps/web/src/windowsRestart241.test.tsx: zero-evidence defaults, original source binding, duplicate/stale rejection, safe disposition, nonconfigured and working differences and no-network UI.
- .github/workflows/foundation.yml: focused Build 241 regressions plus full backend, web, Windows backup, desktop and documentation checks.

**Unchanged source holds:** independent Windows acceptance NO; repairs authorized/executed NO; Windows installation NOT PROVEN; six-app integration DISCONNECTED/HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD. No device or application runtime state is altered by this worksheet.

**Proposed Build 242:** owner-supplied first-failure retest evidence, source-matched recovery follow-up and owner authorization decision, never a fabricated defect or broad change order.
