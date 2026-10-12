# Build 051 — Production Readiness and Roadmap Renewal

## Release purpose and non-scope

The first 50 builds established a working local-first Hub, private AI and
knowledge, Home Assistant, MQTT, cameras, the PWA, business connectors,
private browser networking, backups, and release-hardening tests. Build 051
provides a **read-only local production-readiness smoke check** and a
concrete next-phase application roadmap. It does **not** certify real
household readiness simply because GitHub CI passes.

No new public API, login, service, cloud cost, data migration, task scheduler,
camera install, master key, remote proxy or destructive recovery action is
introduced. Our Windows server stays unchanged until an operator installs a
verified release.

## Code readiness checks (new)

Run the new Python command only from the Hub's own Windows virtualenv or
its test environment. It makes exactly seven unauthenticated GET requests,
all to the fixed host 127.0.0.1 on port 8765:

- GET /health: response must identify Rosevear AI Hub and status ok
- GET /version: must match the **installed package** version (0.0.51 on
  this release), preventing misleading GUI or stale API version reports
- GET /docs, /redoc, and /openapi.json: each must return HTTP 404
- GET /api/v1/auth/me: must reject an anonymous client with HTTP 401,
  Cache-Control: no-store, X-Frame-Options DENY, X-Content-Type-Options
  nosniff and Referrer-Policy no-referrer
- GET /api/v1/system/resource-budget: same private-route guards

The client disables environment proxies and redirects and uses bounded
two-second requests. No session cookie, headers, credentials, URL argument,
user-controlled host, POST, mutation, camera stream, MQTT message or
Home Assistant write is used. HTTP failures or exceptions fail closed.
The command prints only PASS/FAIL and count; it never logs response bodies.
An optional JSON evidence file uses exclusive create to avoid replacing
old evidence and contains only boolean check results, UTC time, installed
version, and explicit "not tested" manual gates.

Tests exercise the real FastAPI routes in isolated SQLite fixtures, plus
stale versions, accidentally public private routes, redirects, unreachable
API, private-exception redaction, and no-overwrite evidence.

## Windows operator preflight

**After** main Production GREEN and the normal commit-pinned Windows update,
restart only the Hub API and check that the expected version is 0.0.51.
Open PowerShell on the server, not on Templar:

    cd C:\Users\Ree\rosevearaihub
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-production-readiness.ps1

For a metadata-only report in a uniquely named temporary file:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-production-readiness.ps1 -SaveEvidence

The PowerShell wrapper refuses a missing API listener, or any binding other
than 127.0.0.1 / ::1 on port 8765. It does **not** change listener
binding, Caddy, the Windows Firewall, Tailscale, Ollama, MQTT, Home
Assistant or cameras. The backend probe requires IPv4 127.0.0.1.

A failed preflight is evidence for troubleshooting, **not permission** to
disable security, bypass the update tests, port-forward the API, reconfigure
routers or expose the Hub on the public internet.

## Production acceptance matrix — honest statuses

| Requirement | Code/CI evidence | On our actual server |
| --- | --- | --- |
| Python backend, web, Windows desktop and docs | Full GitHub build gates | Recheck release after local update |
| Version/health/private HTTP endpoints | Automated Build 051 regression suite | Read-only PowerShell readiness script |
| Loopback binding on API port 8765 | Wrapper guards and PowerShell parse CI | Must PASS on actual server |
| Caddy HTTPS on approved household LAN only | Prior opt-in script checks | Verify Windows Firewall and LAN-only reachability |
| Trusted private Caddy CA certificate | Documented verification method | **OPEN**: fix Chrome "Not secure" after fingerprint verification |
| Tailscale private remote access and ACLs | Opt-in Serve and policy guidance | **OPEN**: replace broad allow-all, test allowed and denied devices |
| Owner/admin authentication, access control | Automated role and session tests | Test approved household accounts and logout |
| Frigate optional object analytics | Optional adapter is designed to degrade | **OFFLINE is acceptable** unless explicitly installing it |
| Build 050 synthetic recovery | Linux and actual Windows CI | Run once locally on test server |
| Real encrypted backup and off-machine copy | Isolated restore tooling | **OPEN**: verified real archive, offline passphrase and escrow |
| RPO/RTO / VM, MQTT, Ollama and Frigate backups | Documented limits | **OPEN**: plan separate service recovery |
| Local Ollama and available resource headroom | Build 048 read-only budget snapshot | 2026-10-11 screenshot looked within advisory guidelines; retest |
| Device and business write safeguards | Explicit confirmations and regression tests | Never use hazardous physical actions as smoke tests |

**GitHub Production GREEN means reproducible code release checks passed.**
It is not a security audit of the household router, a real recovery drill,
a live camera stress test, or a guarantee that each external service is up.

## Rollback and security notes

- To roll back a failed local update, use the last known verified commit
  through the existing Windows update/rollback procedure, with a preserved
  SQLite and config backup. Restart only the Hub API after ensuring its
  listener is owned by the expected process; don't kill unrelated services.
- No schema change. Version 0.0.51 supplies a new optional CLI and script;
  removal/rollback does not require moving private data.
- Existing confidential details stay out of reports and CI logs. Never post
  owner passwords, Caddy CA private keys, MQTT credentials, camera RTSP
  credentials or backup passphrases into issues or chat.
- No probe may follow a redirect off-loopback or accept a user-supplied
  target URL.
- Windows packaging validation and synthetic backup tests remain required
  gates in all three release stages (dev, production PR, main).

## Renewed roadmap direction

The infrastructure foundation is complete enough to pivot to practical
daily-use applications rather than repeat single-project audits. The next
phase should make Home, Devices, Cameras, Automations and Business information
useful through clear operator workflows without new unattended physical
actions. Detailed planned builds 052–060 are in BUILD_ROADMAP.md.

**Next queued: Build 052 — Unified Operations Dashboard & Guided Onboarding.**

Future app builds are plans, not already-implemented functionality.
Keep Frigate optional, and allow work on multiple business/workshop projects
without embedding a single project into the system core.

References:

- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- Tailscale access policies: https://tailscale.com/kb/1018/acls
- FastAPI security dependencies: https://fastapi.tiangolo.com/tutorial/security/
- NIST contingency planning SP 800-34: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final
