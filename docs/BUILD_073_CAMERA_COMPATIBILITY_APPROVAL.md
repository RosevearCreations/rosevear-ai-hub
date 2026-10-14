# Build 073 — Model-Specific Camera Compatibility Verification & Owner-Approved Connections

## Delivered boundary
Build 073 upgrades the Build 072 browser-session worksheet into a browser-local persistent model inventory. Owner/administrator users may record the manufacturer, exact model, location, proposed compatibility method, and evidence reference. Changing a method or evidence invalidates previous approval. Approval requires a nonempty evidence note of at least 8 characters and a reviewed method other than 'unverified' or 'unsupported'.

The approval is **planning-only**. No camera is registered, activated, tested, streamed, scanned or modified. Existing encrypted RTSP and ONVIF flows remain separately gated by the earlier builds. Alexa video viewing is not proof that a third-party API or local RTSP feed exists. No Alexa tokens are extracted or intercepted.

## Storage and security limitations
- Records persist only within the current browser's localStorage; they do not synchronize across devices and are not stored in the Hub's SQLite database.
- Any person who can access the same browser profile can access this local inventory. Do not enter passwords, camera URLs, account IDs or other secrets as evidence.
- Owner/admin authorization controls edit actions in the application UI, **not** a server-side inventory API. Therefore it is not appropriate as a security-critical approval ledger.
- Export JSON can be saved privately. Browser storage clearing deletes the inventory.
- Do not present approval as confirmation of camera compatibility, actual integration or video playback.

## Acceptance
1. As owner/admin, add a Blink model and littlelf model and assign manual evidence.
2. Confirm unverified or unsupported methods cannot be approved; a supported proposed method plus evidence can be approved as a plan.
3. Edit an approved entry and verify approval clears.
4. Refresh browser and confirm entries persist. Export and inspect JSON without secrets.
5. Verify an ordinary household/read-only account cannot edit or approve.
6. Verify Home Assistant, MQTT, go2rtc and existing camera registrations are unchanged.
7. Require green docs/backend/web/backup-Windows/desktop-Windows PR checks and independently verify post-merge main production checks. Private Windows runtime remains field acceptance.

## Next proposed
Build 074 — Server-backed Camera Inventory & Authorization Ledger, with audited identity-bound approvals, device-safe migrations, and reversible storage. This is required before activating any approved connection automatically.
