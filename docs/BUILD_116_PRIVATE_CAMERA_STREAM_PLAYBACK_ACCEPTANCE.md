# Build 116 — Private Camera Stream Health & Playback Acceptance

## Scope

Provides an **owner-supervised, session-only** acceptance workbench for one already-registered camera at a time. CI is software build evidence; it cannot claim that an actual camera displayed moving video on the installed Windows server. **No camera is automatically enrolled, enabled, synced, reconfigured, rebooted, or accepted.**

This build makes the existing main camera tiles start/stop on demand instead of loading camera video automatically. It also refreshes the Cameras and Devices section help, adds a circled information guide directly on the workbench, and improves card legibility on desktop/mobile.

## Operator sequence on the actual Windows Hub

1. Sign in as an Owner/Administrator **on the Windows server's browser** using its local Hub URL. Another laptop/phone's `localhost` addresses its own device and must not be used as a go2rtc proxy. Do not forward unauthenticated go2rtc services over LAN/Tailscale.
2. In **Cameras**, identify physical camera hardware first. For newly discovered identities, use the existing manual ONVIF review and registry approval. They remain **disabled** by default. Only deliberately enable a confirmed camera through existing administrative controls.
3. Check **Local video transport**. Both go2rtc API and RTSP listeners must be reported as **local-only**. The selected registry entry must be enabled; its stream binding must be enabled and encrypted at rest. No plaintext source is displayed by the review workbench.
4. Select the exact recognized camera in **Private stream and playback acceptance**. Use **Run a fresh private probe**. The API's positive producer result is a prerequisite, **not proof of playback**.
5. Choose **Start private preview**. Personally observe live *moving* video of that exact camera. If the video is blank, stale, frozen, or the wrong camera, stop playback and keep acceptance on hold. Do not paste endpoint URLs/passwords into help/chat/issues.
6. Check the moving-video observation **only after** seeing it. Choose **Recheck this same private stream**, confirm the registered identity has not changed, then **Stop private preview**. A later changed identity or expired probe again blocks private playback.
7. Keep the actual installed Windows field acceptance separate. The green session indicator is not a signed, saved or portable acceptance receipt. Build 118 is planned to consolidate explicit device/camera field decisions, not to silently import these ephemeral checkboxes.

## Fail-closed behavior

- Browser is not running on `localhost` / `127.0.0.1` on the Hub machine: **HOLD**. This avoids mistakenly connecting to the *client's* local go2rtc instance. A separate authenticated same-origin video gateway would require a later security review.
- go2rtc offline, either listener not loopback-only, viewer URL not exact source identity / loopback origin, RTSP source not encrypted, disabled camera/stream, stale/unprobed health, mismatched host or stream: **HOLD**.
- First manual probe may run even while health is untested, but only when exact identity, private viewer address, enabled registry and local listener checks are in place.
- Probe returns zero producers, failure, wrong camera ID, or invalid timestamp: clear in-session evidence and **HOLD**.
- Camera selection changes, page reloads, stream binding changes, or a manual evidence reset: **HOLD**.
- Camera tiles never load a viewer until clicked, and stop removes the player. An independently running private viewer is not proof of physical field acceptance.

## Security and operations

The workbench calls only existing authenticated endpoints for per-camera `POST .../stream/probe` and existing read-only inventory/dashboard/transport data. There is no new persistent schema, permission grant, credentials endpoint, export, cross-origin gateway, or automatic background probe. Existing manual administrator camera operations remain separate.

Browser state stores only identity fingerprints, probe times and a manual moving-video checkbox. It never stores source URLs, encrypted secrets, screenshots, clips, or passwords. Server-side probe audit behavior is unchanged. Do not write sensitive source endpoint information into GitHub tickets or knowledge-base entries.

## Verification and promotion

- Unit tests cover loopback/private URL fail-closed handling, stream mismatch, disabled/unencrypted camera, stale evidence and initial untested-probe eligibility.
- React tests cover the explicit probe → human observation → repeat probe → session review sequence and clearing observation on camera change, plus on-demand tile start/stop.
- Require TypeScript, all web tests and production bundle. GitHub feature PR → protected `dev` push checks, followed by protected `dev` → `main` PR checks and **independent** `main` post-merge push success with Windows artifact.
- **Source Production CI GREEN is not evidence that the installed Windows Hub has been updated or that actual household cameras were field accepted.**
