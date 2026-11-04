# Build 242 — Windows Restart Exception Retest, First-Failure Recovery Verification & Owner Repair Decision Handoff

**Source change only.** GitHub CI GREEN is not a Windows mini-server install, a witnessed reboot, restored services or independent Windows acceptance. No actual owner post-reboot observations were provided for this build; the Build 242 owner queue begins empty.

## Implemented owner workflow

1. Open **System → Build 240** on the installed PC *if that version is present*. Perform only the previously documented supervised restart and record eight true owner-observed dependency checks, including task history, API, web, original HA guest, MQTT, Ollama model, trusted private HTTPS and moving camera video.
2. Import Build 240's private code-only JSON into **System → Build 241**, record actual source provenance and a separate owner next-step request. Build 241 now provides **Copy Build 241 code-only JSON handoff for Build 242**; no remote upload occurs.
3. Import the exact Build 241 JSON into **System → Build 242**. Its schema, original Build 240 reboot gate, source snapshots, receipt codes and Build 241 decisions are revalidated. Unknown private fields are discarded.
4. Inspect the **first unresolved** dependency in original startup order before downstream work. A later failing device or camera cannot be declared recovered or repair-ready while prior tasks/API/VM checks are unverified.
5. For an eligible Build 241 follow-up request, personally retest on the physical Windows device. Record a *new* code, direct-screen/task-history/existing-log basis, owner witness and fresh source-bound timestamp. Reused codes, stale snapshots, missing witness or changed Build 241 decision block progress.
6. Select **defer**, **request another supervised retest**, **request independent proof** or **conditional exact-scope repair authorization REVIEW**. The last option requires an actual fresh failed/partial result, exact affected dependency and a separate rollback reference and decision receipt. It is not repair authorization or execution.
7. Copy a redacted owner decision packet privately. Only safe metadata codes are exported; no credentials, IPs, URLs, camera identifiers, raw logs or messages. The form is session-only, not a background service.

## 2026 visual refresh — real client UI

- A prominent **Dark Mode** toggle in the logged-in top-right header, plus the existing Appearance dropdown and sidebar Display theme control.
- An explicit **Turn on Dark Mode** button before sign-in, alongside the existing Display theme selector.
- New real stylesheet **apps/web/src/modern2026.css**, imported after the prior theme: refreshed midnight/low-glare palette, purple/cyan accent hierarchy, raised rounded cards, modern action buttons, refined text fields/dropdowns, stateful hover/focus indicators, mobile layout guards, high-contrast preservation and reduced-motion support.
- Display preference remains a *local client preference* and survives sign-out. It does not store tokens or alter backend/device roles.
- An older installed Windows client may not show these controls until a separately approved, verified Windows release-slot update has been completed. See **docs/WINDOWS_RELEASE_SLOTS.md**; do not run the obsolete Build 030 updater just to see styling.

## Safety and verification

- apps/web/src/windowsRestart242.ts and WindowsRestart242Panel.tsx: owner-reported source/decision gates, read-only on-device retest worksheet.
- apps/web/src/windowsRestart241.ts and WindowsRestart241Panel.tsx: versioned, privately copied Build 241 handoff; incoming data sanitization and snapshot integrity.
- apps/web/src/windowsRestart242.test.tsx: zero-evidence defaults, first-failure order, stale/duplicate and scope gates, no-action front end, safe JSON import/export and owner-reported-only recovery.
- App.test.tsx exercises header and login Dark Mode controls and saved choice; Windows regressions and full web/backend/backup/desktop checks remain required in foundation.yml.

**Holds remain:** no independently verified installed Windows recovery, no authorized/executed repairs or local VM actions, six-app integration DISCONNECTED/HOLD, private relay OFF, vault SECURITY HOLD, QL-275 UNDER REVIEW.

**Next proposed build 243:** owner-provided supervised restart exception disposition, independent evidence continuity and controlled repair execution *readiness* (scope conditional on real observed findings; no automatic Windows action).
