# Build 045 — Installable Progressive Web App

## Scope

Build 045 adds a home-screen/desktop install option to the **existing** local web Hub. It supplies an app manifest, genuine 192/512 PNG icons, a small versioned service worker, explicit browser install/help UI, an offline *public* fallback, and web tests. It does **not** add a public server, hosted account, remote login, online device control, cloud media sync, or background work.

## Security and offline policy

The Hub is a private control panel with authentication, cameras, MQTT and physical devices; treating offline data as an ordinary caching opportunity would be unsafe.

- The worker's precache list contains **only** `/offline.html`, `/manifest.webmanifest` and public app icon PNGs.
- It may store only **same-origin** Vite-generated, fingerprinted `/assets/*.(js|css|woff|woff2|png|svg)` resources that are public build assets.
- Navigation is **network-first with no-store**. If a connection fails, it serves a static offline page saying the Hub is unreachable. It **never caches** `index.html`, signed-in app screens, session cookies, authentication responses, conversation history, user uploads, credentials, business records, camera video, or device state.
- `/api/*`, `/ws/*`, non-GET and cross-origin requests are outside the service worker interception entirely. Authentication, Home Assistant writes, voice, messaging and camera paths remain exclusively online. No background sync, replay queue, notifications or automatic actions.
- Worker update deletes only older caches with the `rosevear-pwa-static-` prefix; it does not erase unrelated browser caches.
- The installed app **still requires live reachability** of the Hub and normal login. Offline install capability does **not** imply offline commands, offline conversations, remote access, or stored secrets.

## Install and verification on Windows

The current Windows machine runs Vite at `http://127.0.0.1:5173/` and backend at `http://127.0.0.1:8765/`. The service worker registers on localhost (secure browser context), including the Vite dev shell, without intercepting `/src/**`, HMR, or authenticated API requests. No Task Scheduler/startup/go2rtc/Ollama/Home Assistant changes are required.

1. Update with `scripts/update-test-server.ps1 -ExpectedCommit <promoted-main-sha>`; verify code tests and web build pass.
2. Restart the web Vite process using the existing recovery task if old page assets remain in memory; hard-refresh the browser after the new files are installed.
3. Verify `http://127.0.0.1:5173/manifest.webmanifest`, `http://127.0.0.1:5173/sw.js`, `http://127.0.0.1:5173/icons/rosevear-192.png`, and `.../rosevear-512.png` return HTTP 200 with valid content.
4. Open the Hub from the **same computer** as `http://127.0.0.1:5173/`. Sign into the existing Hub account. In the sidebar select **Install app**, or use the Chrome/Edge browser menu **Install Rosevear AI Hub / Apps → Install this site as an app**. User click is required to show any install prompt.
5. Launch the installed app. Verify normal sign-in and the fact that Chat, Cameras and Devices **remain live-only**.
6. Disconnect the web server temporarily **without** shutting down Home Assistant/MQTT/Ollama/go2rtc, or use Chrome DevTools → Network → Offline. Reopen the installed app and verify the generic public offline page appears, with no private state or queued actions. Restore networking and press Retry connection.
7. In browser DevTools → Application → Cache Storage inspect the `rosevear-pwa-static-v045` cache. It must contain only offline.html, manifest, icons and optional fingerprinted public assets, **never** API/chat/camera URLs.
8. Check another device only using its own secure context (HTTPS on trusted LAN; planned Tailscale work is Build 046). `http://192.168.68.78:5173/` is plain HTTP and will not support browser service-worker installation on typical mobile devices. Do not expose port 8765 or disable authentication as a shortcut.

## Automated acceptance

Vitest covers manifest start/scope/display and icons, install prompt user gesture, offline fallback text, service-worker request handling for cross-origin/API/dev modules and public hashed build assets. CI runs web typecheck/test/build, backend test suite, documentation and Windows desktop compilation. There are no database migrations or new paid dependencies.

**Release distinction:** GitHub `main` CI can be GREEN before the operator confirms install/relaunch and the offline page on Windows. The PWA cannot be claimed hardware/UX-verified until a real supported browser install is observed.

## Rollback

Revert the Build 045 changes; the browser's existing service worker can continue until unregistered or superseded. From DevTools → Application → Service Workers choose **Unregister**, then in Cache Storage delete only `rosevear-pwa-static-` caches. Do not clear all site data unless intentionally signing out/removing local browser settings. The Hub backend remains unchanged apart from reported package version 0.0.45. No upgrade to remote access or cloud dependency is part of rollback.
