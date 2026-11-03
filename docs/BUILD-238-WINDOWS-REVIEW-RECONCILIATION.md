# Build 238 — Windows UI Review Response Intake, Evidence Reconciliation & Repair Decision HOLD

## Delivered
An owner-only, initially collapsed **Build 238** worksheet directly below Build 237 inside **System → Build 236**. It consumes the same browser-session evidence chain: genuine owner Build 236 finding → fresh same-symptom Build 237 retest → matching, separately witnessed UI-only review request. The default state has **no** reviewer replies, authenticated reviews, independently accepted Windows observations, repair permissions or executed repairs.

The owner can manually record that a reply was received, more evidence was requested, or a review was declined. This is an **owner statement**, not proof of the sender's identity. No outside reviewer is contacted or authenticated; typed receipts cannot establish authenticity or give repair permission.

## Owner steps
1. On the installed Windows Hub, record a real finding and a separately witnessed current UI review request in Builds 236 and 237.
2. Open the Build 238 section and its response worksheet. Only requests still eligible against the exact Build 236/237 source/version/theme appear as current candidates.
3. If a real response arrives through an independently approved channel, classify it as reply received, more evidence required or declined. Enter a **new distinct reference code**, acknowledge that this is only our own report and select **Record owner-reported response**.
4. Check the resulting status. Duplicate codes, missing acknowledgment, stale source, changed decision or response, and out-of-order timestamps cannot become valid records. When the upstream request changes, the old response shows **not ready**; re-evaluate from fresh real evidence.
5. Copy the redacted session-only reconciliation if needed. Keep actual emails, names, private URLs, addresses, images, IDs, tokens and logs **outside** this worksheet.

## Boundaries
- No live network requests, provider messages, device actions, Windows installation, UI patching, filesystem persistence or secrets.
- No automated decision, authenticated external review, independently verified closure, repair grant or repair execution. Every original finding remains open.
- Six apps **DISCONNECTED/HOLD**; relay **OFF**; QL-275 **UNDER REVIEW**; vault **SECURITY HOLD**; authenticated gateway GETs **0**.
- React state exists only in the current browser session; closing the screen may discard unsaved entries.
- GitHub source CI GREEN verifies the release code; owners must separately inspect the actual Windows host and authorize any future scope-specific correction.

## Verification and release
- `npm run build:238:hub:test`, `npm run web:typecheck`, `npm run web:build`.
- Protected PR and dev/main push workflows must pass 5/5 required jobs; verify the exact main SHA before calling source Production GREEN.
- Rollback: a reviewed revert of the 238 data model, panel integration, tests, CSS, docs and test workflow. Never use a forced branch rewrite.

## Next authorized proposal
**Build 239 — Windows UI Review Evidence Provenance, Owner Decision Packet & Conditional Repair Authorization Gate.** Requires authentic source evidence and separate explicit owner approval before any UI repair; proposal only until authorized.
