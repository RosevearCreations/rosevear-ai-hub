# Build 046 — Private Remote Access via Tailscale

## Scope and threat boundary

This build provides an **opt-in, private HTTPS** access path from approved tailnet devices to the Windows Rosevear AI Hub, without opening either the Bell Fibe or DECO router, exposing a public domain, or buying a web-hosting tier. It is **not** a public deployment, cloud relay of application data, Tailscale Funnel, or unattended third-party account enrollment.

Architecture:

```text
Approved phone/laptop with Tailscale
  → https://<Windows-device>.<tailnet>.ts.net/ (Tailscale Serve HTTPS 443)
  → authenticated Tailscale tailnet policy
  → tailscaled PRIVATE HTTPS reverse proxy
  → http://127.0.0.1:8765 on the Windows server
  → FastAPI /api/v1/*, /health, /version AND production PWA dist/
```

Both the PWA and authenticated API use **one origin** on remote browsers. This fixes the old problem where the browser tried to fetch `127.0.0.1:8765` on the *remote device*. The existing local Vite/Tauri experience continues to call the localhost API on the server. HTTPS-set Hub session cookies use `Secure`, `HttpOnly`, and `SameSite=Strict`. Host authentication **does not** replace app sign-in; the original Hub users, roles, allowlists, confirmation and audit checks remain in force.

### What is deliberately NOT exposed

- No `tailscale funnel`, public HTTPS endpoint, DNS publishing, reverse proxy on WAN, router port forward, Windows firewall opening, wildcard CORS or `0.0.0.0` bind.
- The API stays on **127.0.0.1:8765**, Ollama on 127.0.0.1:11434, and go2rtc's API/RTSP/WebRTC ports stay loopback-only. Home Assistant and MQTT retain their original private bindings and credentials.
- No Tailscale auth keys, machine identity, device IPs, passwords or sensitive state are stored in GitHub or the UI.
- The Build 045 service worker still cannot cache private Chat, auth, camera, business, notification or device-control API data and cannot queue actions offline.
- Browser audio/microphone and video playback are **device-dependent**. A camera viewer hardcoded to a local go2rtc port will not suddenly work from another device; exposing ports 1984/8554/8555 is not an acceptable workaround. Live remote camera streaming needs a separate reviewed, authenticated same-origin proxy later.
- Remote clients must be enrolled by the owner into the private tailnet and explicitly granted access by Tailscale access policy. Membership alone may be broader than desired.

## Installing/activating (explicit user approval)

No GitHub Action installs Tailscale or activates exposure; only the owner can do so on Windows.

1. Update the Windows test server to the **exact green** Build 046 `main` SHA using the existing `scripts/update-test-server.ps1 -ExpectedCommit <SHA>`. The updater builds `apps/web/dist`; no schema migration is required. The existing startup and recovery tasks, `.env` and user data must remain unchanged.
2. Restart **only** the Hub API using the existing verified recovery task if `http://127.0.0.1:8765/version` still shows the previous release. Confirm it reports `0.0.46`.
3. On the *server*, verify `http://127.0.0.1:8765/`, `http://127.0.0.1:8765/manifest.webmanifest`, `http://127.0.0.1:8765/api/v1/auth/status`, and `http://127.0.0.1:8765/health` respond. The production frontend is served directly by the loopback API; do **not** route Tailscale to Vite's development port 5173.
4. Install and sign into the official Windows Tailscale application: <https://tailscale.com/download/windows>. Do not post screenshots containing Tailscale auth keys, recovery keys or account identifiers. Sign in on the desired phone/laptop using the official Tailscale client as an authorized member/device of the same tailnet.
5. In the Tailscale admin console, verify tailnet HTTPS certificates are enabled and set **explicit device/user grants/ACLs** so only approved household accounts/devices can access port 443 on the Windows host. Review any pre-existing Tailscale Serve or Funnel configuration; never enable Funnel for this Hub.
6. On the Windows server, run PowerShell from the repository (normal or Administrator as required by your Tailscale client):

   ```powershell
   cd C:\Users\Ree\rosevearaihub
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-tailscale-serve.ps1
   ```

   This is a **check-only** run. It verifies loopback binding, the updated app/manifest, Tailscale connectivity and detects existing Serve/Funnel settings without modifying them. It fails closed if the API is bound to LAN, Tailscale is offline, or a Serve/Funnel configuration already exists.
7. Only after confirming it is safe, explicitly opt in:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-tailscale-serve.ps1 -Enable
   ```

   This invokes **only** `tailscale serve --bg --https=443 http://127.0.0.1:8765`. It does not call Funnel. Tailscale might require its official browser-based consent to enable HTTPS certificates. Background Serve persists while Tailscale is connected.
8. Run `tailscale serve status`; open the exact `https://...ts.net` URL it prints on **another approved tailnet device**. Verify a valid TLS connection, Hub sign-in, one permitted authenticated read, PWA manifest/install offer, and correct `/api/v1/auth/status` on the **same** HTTPS origin. A 401 until signing in is correct. Verify an unapproved/off-tailnet device **cannot** reach it. Do not report GREEN until both tests succeed.
9. For rollback, first verify the exact hosted path is yours, then run `tailscale serve --https=443 off` (do not use `tailscale serve reset` if other services exist). Confirm `tailscale serve status` has no Hub endpoint. Stop Tailscale access separately if desired; local Hub operation remains intact.

### Operational checks and limitations

- If the remote PWA shell loads but API calls fail: inspect the browser network tab. Requests must go to `https://your-node.your-tailnet.ts.net/api/v1/...`, not to the remote machine's `http://127.0.0.1:8765`.
- If `/version` stays old: restart only the Python API, not Home Assistant, Ollama, MQTT or go2rtc. The static production app is mounted when the API process starts and the Vite dist exists.
- If tailnet HTTPS is not ready: resolve Tailscale device login, admin certificate consent and grants; do **not** weaken the browser secure-context requirement or use plaintext LAN HTTP.
- If login fails: use the original Hub account. Never bootstrap a new owner on an existing database, disable cookie security or add `*` to CORS.
- Changes to remote access require a new threat-model review before allowing sensitive business operations or camera streams. Build 049's security audit will examine exposure and account policy further.
- This build is **not** a VPN/SSO login integration. Being on a tailnet does not automatically sign anyone into the Hub.

### Test coverage and release criteria

- Backend tests: production dist served on API port without shadowing API/health, disabled mode fail closed, private files outside dist inaccessible, secure cookies under HTTPS and localhost compatibility.
- Frontend tests: local hosts use loopback, tailnet host uses same-origin API, public/insecure origins never labeled private. Existing PWA offline tests continue to pass.
- Script: refuses non-loopback bind, missing assets, offline/unavailable Tailscale, and conflicting Serve/Funnel config. Explicit `-Enable` is required; no automatic activation in CI.
- CI: Ruff/pytest, web TypeScript/Vitest/Vite, docs and Windows desktop artifact. No migrations, subscriptions, router edits or provider secrets.
- Release GREEN = commit on `main` plus separate successful push-triggered Production CI. Operational **remote-access acceptance** is independent and requires actual Windows Tailscale setup, trusted-device login and denial testing.

Official reference: <https://tailscale.com/docs/reference/tailscale-cli/serve> and <https://tailscale.com/docs/features/tailscale-serve>.
