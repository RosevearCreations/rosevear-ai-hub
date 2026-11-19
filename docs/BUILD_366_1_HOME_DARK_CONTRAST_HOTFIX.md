# Rosevear AI Hub Build 366.1 — Dark Home surface and contrast runtime hotfix

## Owner-reported defect
On November 19, 2026, the original Windows Hub showed **Dark Mode** selected, but the Home Operations command centre retained a stark white background. Existing light-theme CSS made the Home Operations heading and several room-navigation labels almost invisible. Status cards remained dark, producing mismatched surfaces.

Build 262 already introduced dark Home Operations CSS. This is a corrective hotfix to ensure a later-served legacy light stylesheet or visual theme cascade cannot reintroduce the reported white surface. It does not consume the next substantive Build 367 milestone or claim a 5–10 percentage point increase.

## Scoped change
- Import `homeContrast366Hotfix.css` after the existing styles so the display-only repair is included in the Vite application bundle.
- Force the Home Operations base surface to the selected *dark theme* palette; remove the hard-coded legacy white Home background for dark visual contexts.
- Restore readable headings, eyebrow, last-observed status, quick navigation, rooms, controls, help card and focus indicators. Preserve service status semantics.
- Apply to Dark, Standard and other non-daylight dark Master skins using shared palette tokens.
- Preserve **Daylight**, independent **High Contrast**, and native forced-colors access; do not impose dark colours there.
- No edits to backend, private tokens, Home Assistant, Caddy, Windows startup, firewall, integrations, data or device commands.

## Regression and acceptance
Run `node --test scripts/home-contrast-366-1.test.mjs`, `npm run web:typecheck`, `npm run web:test`, and `npm run web:build` against the exact changed checkout.

On the original Windows client, load the newly built/served frontend through its existing **Update Hub** supervised process. Use **Restart Client** if the browser/PWA has cached old CSS; changing GitHub alone does not update the original Windows service. With Dark Mode selected, confirm the entire Home Operations surface is dark and heading, room label and drop-down are readable on desktop and mobile. Verify Daylight and High Contrast independently.

A protected-main commit and passing CI, if independently observed, certify only source/build. Physical Windows installation, source identity, guest/MQTT/camera acceptance and signed peer receipts remain separately gated. Do not declare original-host production GREEN based on source promotion alone.

## Branch preservation
Because `dev` and `main` diverged before this hotfix, mirror **only the isolated four-file visual patch** to both existing branches; do not merge unrelated history or rewrite either branch. The next substantive queued Build 367 remains live independently enrolled read-only signed producers and genuine peer receipts.
