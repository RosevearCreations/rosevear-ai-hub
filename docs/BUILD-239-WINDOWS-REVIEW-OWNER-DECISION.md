# Build 239 — Windows UI Review Evidence Provenance, Owner Decision Packet & Conditional Repair Authorization Gate

## Delivered and intentional HOLD

Build 239 adds a collapsed, keyboard-accessible owner worksheet beneath Build 238 in **System → Build 236 → 237 → 238 → 239**. It takes only *current, unchanged* owner-reported Build 238 replies. No synthetic reply or source is inserted.

The owner may report seeing a private correspondence, existing local review artifact or supervised conversation, with a new sanitized metadata code and separate acknowledgment. This does **not authenticate** an external reviewer, verify a message, prove the Windows host was updated, or certify a fix.

After the owner reports the source, a separate decision can be **defer**, **request retest**, **request independently authenticated proof**, or **request a conditional UI-only repair authorization review**. The last is a request to begin *future* scoped review, **not** approval. It requires the same UI-only area as the original Build 236 symptom, a distinct rollback-plan reference, a distinct later owner-decision code and separate owner acknowledgment.

A changed theme, installed-version report, original observation, retest, owner decision, Build 238 reply or Build 239 source invalidates downstream snapshots. A missing/untrusted/duplicate receipt never counts as ready.

The counters for independently authenticated outside reviews, independent real-Windows acceptance, repairs authorized/executed, and installations are **hard-coded to 0**. Every original finding stays open. No backend, network, scheduled task, VM, hardware, data or code repair action is performed by this worksheet.

## Owner process

1. On the installed Windows Hub, record a real Build 236 finding and matching Build 237 owner retest + UI review request.
2. Record a genuine personally received Build 238 reply. Requests for more evidence or declined review are **not** eligible for conditional repair review.
3. Open Build 239. Identify the kind of source we personally observed using a **new, unique evidence code** and acknowledgment. Record it after the reply date.
4. Select the *next owner request*, not a repair action. For an authorization **review** request, choose precisely the original UI area and a distinct rollback-plan reference. A separate decision code and acknowledgment are required, later than the source record.
5. Copy the redacted session-only owner packet if needed. This does not send anything or verify anyone. Keep actual correspondence, names, credentials, private addresses, photos, logs and device identifiers outside the form.
6. A future implementation requires independently authenticated source evidence, current installed-Windows verification, separately scoped owner repair authorization and a new authorized build. Neither a Build 239 form nor a GREEN source CI run grants any of these.

## November restart procedure review

The owner also requested a review before a planned Windows restart. The current consolidated, **non-mutating** operator checklist is [Supervised Windows Restart Checklist](WINDOWS_SUPERVISED_RESTART_2026.md). This build corrects an old missing mandatory `-LanIPv4` argument in Build 117, identifies the four distinct original/managed/gateway tasks, points old Build 030 updater guidance to the current release-slot process, and distinguishes built PWA from optional Vite on port 5173.

No restart, Windows task installation, Home Assistant VM change, migration, backup, gateway/firewall change or physical field acceptance was performed by this code release. The actual installed Windows checkout may be older; use only scripts present in the trusted installed checkout and observe their HOLD results.

## Security, tests, release, rollback

- Six-app integration **DISCONNECTED/HOLD**, private relay **OFF**, QL-275 **UNDER REVIEW**, vault **SECURITY HOLD**, authenticated gateway GETs **0**.
- `npm run build:239:hub:test`, web TypeScript, production bundle, full web suite, backend, backup and desktop CI. Require dev, PR and exact-main success.
- Revert Build 239 files through a reviewed PR if needed. No destructive branch rewrite, database or local Windows change.
- GitHub source GREEN can coexist with an installed Windows **FIELD HOLD**.

## Next proposed

**Build 240 — Supervised Windows Restart Field Evidence, Startup Dependency Reconciliation & Recovery Follow-Up.** Scope must follow authentic owner post-reboot observations; no automatic repair or VM startup is pre-authorized.
