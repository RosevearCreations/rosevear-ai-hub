# Build 213 — Camera Inventory Compatibility & Connection Diagnostics

## Scope

The existing server-backed owner-reviewed camera model inventory now includes readable camera-source guidance for Blink, littlelf, Nooie, Netvue, Bell/Alarm.com and SkyBell. Unknown models remain unknown; brand names do not establish RTSP, ONVIF or cloud access. Saved model plans show distinct unverified, Alexa-only, unsupported, documentation-pending and owner-reviewed statuses. Even an approved plan explicitly leaves live-feed connectivity unverified.

## Owner Windows acceptance checklist (not implied by source CI)

1. Check the exact camera brand/model and the manufacturer/account's authorized access route. Identify whether a supported local feed exists or access is cloud-only.
2. Ensure any separate credentials and account authority are verified privately; never paste passwords, tokens, RTSP URLs or private IPs into public evidence or notes.
3. Review a saved compatibility record and supporting non-secret documentation, then approve the *plan* only if authorized.
4. Separately verify on-device streaming, network connectivity and playback on the actual Windows Hub. Record field acceptance and any missing/unsupported devices without fabricating success.

No network scan, third-party login, stream scraping, credential extraction, camera control, provider write or recording activation was added. QL-275 stays deferred/Under Review, with the wider gateway disconnected and relay off.

## Verification

Run `npm run build:213:hub:test` and `npm run web:build`. Source CI does not verify actual installed Windows hardware or camera accounts.
