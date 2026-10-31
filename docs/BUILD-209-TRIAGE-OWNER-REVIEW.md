# Build 209 — Diagnostic triage priorities, saved retest view recovery and owner completion follow-up

Build 209 adds a deterministic five-level priority readback to the **two most recent on-demand** diagnostic classifications. Attention outranks unknown, then optional, then apparent return-to-ready. Each changed row includes source, previous and current classification, sampled time and a manual-check link. This is not a server uptime history, incident ticket or verified Windows repair.

Owner-only **Clear saved retest view (show all)** removes only the fixed-choice browser-tab view preference. It does not alter observed Windows failures, retest dispositions, owner audit baseline or saved checkpoint. Administrator/read-only views cannot change this preference. The completion worksheet now highlights the next missing owner action, all unfinished tasks, locally open visual findings and pending retests with direct anchor links. A completed worksheet is not a signed field acceptance.

QL-275 is **Under Review / owner-deferred**. Cross-app integration remains **DISCONNECTED/HOLD**, private relay **OFF**, authenticated gateway GETs **0**, and owner TEST authorization remains **NOT GIVEN**. The first-party vault remains at **0/6 independently verified — SECURITY HOLD**.

Validation: `npm run build:209:hub:test`; full web tests, TypeScript/Vite production build and required GitHub CI. Source CI does not install or verify the physical Windows Hub.

**Active future batch:** Builds 209–228, defined in [`BUILD_QUEUE_209_228.md`](BUILD_QUEUE_209_228.md). Upon verified promotion of this build, 19 planned builds remain.

**Next Build 210 — Windows Startup Dependency Map & Guided Recovery Readback (QL-275 Deferred).**
