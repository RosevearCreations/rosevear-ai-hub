# Build 049 — Threat Model and Security Review

## Trust boundaries and scope

This is a **code and configuration threat review**, not a network penetration
test or a claim that a home's devices are fully secured. The Hub handles
household knowledge, recordings/camera metadata, encrypted connector credentials
and integrations with real-world systems. The core boundary is an authenticated
FastAPI service listening on 127.0.0.1:8765, behind optional restricted
LAN-only Caddy HTTPS (8443) and private Tailscale Serve. Home Assistant,
Ollama, MQTT, camera sources, and connected businesses are separate systems
that must enforce their own permissions.

**Exposure assumptions**: an untrusted device may join household Wi-Fi;
a tailnet member may be granted access too broadly; a session cookie may be
stolen on a compromised client; a knowledge document or remote integration
may contain misleading instructions; backup media may be lost; physical
device side effects have higher impact than general chat responses.

## Threat register (prioritized)

| ID | Risk and trust boundary | Severity | Build 049 mitigation | Residual/acceptance |
| --- | --- | --- | --- | --- |
| T-01 | API docs/OpenAPI reveal private control and integration surface to unauthenticated clients | Medium | Disable HTTP /docs, /redoc, /openapi.json; local app.openapi() still works | Manually verify after local update |
| T-02 | Stolen user session remains valid after account password rotation | High | Revoke all that user's unrevoked HubSession rows within password-update transaction; unchanged owner session remains | Compromised browser/host still needs separate remediation |
| T-03 | Shared-browser cache or embedded frames expose private authenticated API responses | Medium | no-store on /api/v1/*; nosniff, no-referrer, DENY frames on HTTP responses | Browser/server extension risks remain; static PWA shell cache remains unchanged |
| T-04 | Tailnet broad allow-all policy or compromised remote client reaches Hub | High | No automatic rule mutation; controlled checklist for tailnet grants to approved users/devices and Hub HTTPS only | **OPEN manual check**, never treat Tailscale login alone as proof of restricted ACL |
| T-05 | LAN HTTPS private CA not trusted / broad subnet permits unauthorized machine reachability | High | No change to working Caddy/firewall; verify client CA fingerprint and scoped rules; Hub password remains required | **OPEN manual check**; a trusted root CA allows cert trust, not account authorization |
| T-06 | Prompt injection from PDFs, business data, voice or camera events causes privileged execution | High | Review of existing confirmation/role separation; no additional autonomous execution | Test high-risk controls in Build 050+; physical interlocks remain mandatory |
| T-07 | Stolen backup files or misplaced secret escrow compromise database/confidentiality | High | Reuse encrypted Build 047 archive and safe staged restore; master key and passphrase outside Git and offline | **OPEN operator drill** and off-machine protected copies |
| T-08 | Device abuse through malicious input, cameras/ONVIF, or internal services | High | Existing allowlists, private IP checks, authenticated camera API, blocked Level-3 tools | Review actual network segmentation and source equipment independently |
| T-09 | Account brute-force on exposed private HTTPS | Medium | Network private and Argon2 password hashes; no new per-IP auth throttling in this build | **OPEN** future per-account rate limit / incident lockouts (avoid lockout DoS) |
| T-10 | Windows PC malware, lost user profile, or backup service outage | High | Reviewed operator recovery, do not install remote scripts automatically | **OPEN** OS patching, BitLocker/drive encryption, protected backups, recovery drill |

Severity is a qualitative prioritization, not a CVSS score or evidence that a
real exploit occurred. Existing controls must not be interpreted as independently
verified until local test steps pass.

## Code changes included

- Password change through the Owner/Admin user-management API revokes every
  existing session of the **target** account atomically with its new password;
  other users remain signed in. The current session is revoked if an owner
  rotates their own password; sign in again with the new one.
- Disable public HTTP access to interactive docs and OpenAPI routes by
  default. Internal Python tooling can still call FastAPI app.openapi().
  This does not disable /health, /version or application functionality.
- Browser protection headers: X-Content-Type-Options nosniff,
  X-Frame-Options DENY, Referrer-Policy no-referrer; Cache-Control no-store
  for /api/v1/ endpoints including error responses.
- No CSP introduced without proving Tauri, PWA, cameras, streaming, and
  browser voice still work. Do not equate no-store with clearing previously
  cached browser data.
- No database migration, listener, firewall, Caddy, Tailscale, camera, HA,
  Ollama or MQTT change. No new paid service.

## Manual Windows / Templar acceptance checklist

**After** code reaches GREEN on main and the server is updated:

1. From server PowerShell run the normal commit-pinned update command; restart
   only Hub API using the existing safe recovery procedure.
2. Confirm /version is 0.0.49 and /health is ok at 127.0.0.1:8765. Anonymous
   GET /docs, /redoc, /openapi.json should fail (404, not a page of sensitive
   routes); authenticated accounts should still use the application normally.
3. In an authenticated browser, verify System resource snapshot and camera
   pages still require appropriate roles. Test after signing out: administrative
   endpoints return 401, not a response from a browser cache.
4. Test password change for a **spare test account** only: an existing session
   on a second trusted browser should be refused until logging in with the new
   password. Do not rotate the primary owner's real password as a smoke test.
5. On the server run PowerShell Get-NetTCPConnection -State Listen and inspect
   Hub port 8765: **only** 127.0.0.1 and/or ::1 should listen. Caddy may listen
   on the approved local IP and TCP 8443; no router port forwarding or Funnel.
6. In the Windows Firewall inbound rules, verify Hub LAN 8443 is limited to
   intended private profile, remote address ranges, and approved interface.
7. In Tailscale admin console, replace **all-users/all-devices/all-ports**
   rule with only approved remote identities/devices and required private Hub
   HTTPS port. Verify using the Tailscale policy test facility, then try
   both approved and deliberately unapproved clients. Tailnet membership
   alone **is not** the restriction.
8. Resolve Chrome's "Not secure" indicator through securely verified private
   Caddy CA certificate trust. Verify SHA256 against server before importing
   only the *public* root certificate. Never bypass invalid certificate
   warnings, export root.key or put credentials into an untrusted browser.
9. Check that the Hub remains reachable on the approved LAN HTTPS address and
   that Templar does not require Tailscale while on the same approved LAN.
   Test remote access separately from outside the LAN.
10. Review backup passphrase escrow and OS encryption. Keep a current protected
    backup, then perform the Build 050 **offline** recovery drill after
    preparing and recording a rollback plan.

Recording each local result as PASS, FAIL or NOT TESTED is the operator's
security acceptance record. GitHub CI cannot determine household ACL rules,
firewall posture, Chrome certificate trust or remote-client permissions.

## Testing / rollback

Backend tests cover disabled HTTP docs, private API no-store headers,
anti-framing/referrer/mime headers and target-only session revocation.
Full backend/web/docs/Windows-backup/Windows-desktop workflow gates are
required on dev, PR and post-merge main. Any gate failure blocks release.

Rollback to previous verified main code version through controlled local
update/rollback; restart only Hub API. No schema migration and no Windows
listener changes. Existing sessions already revoked due to changed passwords
stay revoked; reverting the app does not restore them.

## Deferred security work

Build 050 drills restores and continuity; later work should explicitly
evaluate session-creation rate limiting (without locking owners out),
CSRF/origin enforcement for browser mutations, CSP compatibility,
vulnerability/dependency scans, private HTTP request destination validation
and stronger network/device segmentation. None is claimed implemented by
this review.

Sources:
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
- Tailscale access controls: https://tailscale.com/kb/1018/acls
- Caddy internal CA: https://caddyserver.com/docs/caddyfile/directives/tls#internal
