# Rosevear AI Hub Build 367 — Independently Pinned Source Enrollment & Private Signed Telemetry

**Implementation date:** 2026-11-19. **Original host:** DESKTOP-AE894KC. **Scope:** source code + owner-initiated one-pass network receiver, not autonomous live enrollment and not authority to activate private Comms receiver QL-340C.

## Deliverables and actual limits

1. **Independent seven-source enrollment contract.** Fixed app IDs `ai-data-platform`, `rosevear-ai-hub`, `rosevear-comms-hub`, `yw`, `icamp`, `rosiedazzlers`, `devilndove`. Each has a distinct approval-supplied exact source SHA-1 Git commit, raw Ed25519 public key pin, private CA bundle and read-only token file; no private signing key crosses apps.
2. **Secure private one-pass GET collector.** Only explicit operator CLI `--once --app` on the original Windows host, a bounded 5-second TLS handshake with certificate identity verification, permitted private IPv4 or tailnet address, exact read path `/internal/rosevear/sysop/telemetry/v1`, GET-only and no redirects/proxies. Explicitly rejects public hosts, credentials/query parameters, forged data and oversized responses. HTTP 200 alone is never acceptance.
3. **Cryptographically verified aggregate.** Reuses Build 365's pinned public Ed25519 verifier, exact commit/source/schema, 90-second freshness, non-sensitive metric allowlist and prohibition on control authorization. Missing values remain null.
4. **Durable operator evidence.** Only after a real verified GET, reuse Build 366's private SQLite replay-safe original-host journal. Add a narrowly scoped `verified_tls_sources367` table containing non-sensitive source ID, event ID, commit and times; never response payload, IP, URL, token, CA, certificate, customer IDs or signed messages. Duplicate IDs and nonces are rejected. Seven-day/2048 record bound.
5. **Visible safe owner readback.** Owner-only GET `/api/v1/system/sysop-live-367` and a seven-source System dashboard count genuine TLS+signed read receipts separately from unverified three-Master *delivery acknowledgements*. Browser cannot enroll, poll, start services, send messages or control devices. All unavailable sources remain HOLD.

## Original-host enrollment (owner-supervised, separate from GitHub CI)

For each source `TAG` in `AIDP`, `HUB`, `COMMS`, `YW`, `ICAMP`, `ROSIE`, `DEVIL`, provision:
- `ROSEVEAR_SYSOP367_{TAG}_URL` = exact owner-approved `https://<private-IPv4>:443/internal/rosevear/sysop/telemetry/v1` or TCP 8443. Only RFC1918 addresses or approved 100.64/10 tailnet IPs accepted. HTTPS certificate SAN MUST match literal IP.
- `ROSEVEAR_SYSOP367_{TAG}_READ_TOKEN_PATH` = **absolute** private on-disk path to a distinct read-only source bearer token (24–256 ASCII-safe chars), never an inline value.
- `ROSEVEAR_SYSOP367_{TAG}_TLS_CA_PATH` = absolute private path to independently approved CA PEM. TLS uses that CA with required peer-certificate verification, TLS 1.2+, no proxy or redirect.
- Existing Build365 `ROSEVEAR_SYSOP365_{TAG}_PUBLIC_KEY_PATH`, `_PUBLIC_KEY_PIN` (SHA-256 of raw Ed25519 key), `_SOURCE_COMMIT` (exact 40 lowercase SHA-1 hex). Pin/key/commit must be independently attested; source-provided pin is not sufficient.
- Existing `ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH` = absolute owner-only SQLite journal path outside repository. Must be backed up including its WAL consistently.

Only **after** a real producer serves a current signed envelope at the exact endpoint, a separate owner-approved operator may run:

```powershell
cd C:\Users\ree\rosevearaihub
.\.venv\Scripts\python.exe scripts\collect-signed-sysop367.py --app rosevear-ai-hub --once
```

Repeat separately for each genuinely deployed source. Do not run this command automatically or enroll a token by copying source data into GitHub. No process supervisor, scheduled task, service installation or loop is created. If a legitimate source is not available at the private endpoint, return HOLD; do not invent one or weaken TLS.

## Three-Master communication is NOT yet proven

A successful authenticated TLS GET plus correct Ed25519 signed source proves a **bounded, verified read receipt at collection time**. It is not equivalent to a two-way Master-to-Master message delivery, signed receiver ACK, original host pre-login reboot witness, 24/7 uptime, or distinct owner authorization. The owner dashboard explicitly shows `verifiedThreeMasterDeliveryAcks: 0`, `threeMasterRuntimeGreen: false`, `allSevenLiveConnected: false` and `commsPrivateReceiverAuthorized: false` unless a later protocol with independently validated ACK authority is implemented.

At this source release no real private per-app URL/token/CA or remote service has been enrolled by the GitHub tool. **Runtime live source count is unknown (do not infer seven from passing tests)**. The original Windows server remains the only authorized place to perform the private one-pass enrolment. Source CI proves code contract, not field installation.

## Regression/release gate
- `server/tests/test_live_sources367.py`: synthetic Ed25519, exact private URL, no public SSRF, expiry/tamper/replay, bounded response, protected-only owner GET, false Connected/ACK denial.
- `apps/web/src/SysopLive367.test.tsx`: exact schema, seven IDs, bounds and falsified green flags.
- `scripts/build-367-contract.test.mjs`: explicit feature wiring and immutable next-20 backlog.
- Protected feature PR to `dev` if required; isolated protected `main` PR; all six CI gates and exact-`main` independent push must pass before claiming **production source GREEN**.
- Original-host install/command/peer TLS/response/nonce/expiry/retention and 24h+ uptime need separate manual signed acceptance; rollback removes only the source patch and never destroys existing journal or original services.

## Expanded functionality baseline and why percent dropped
Prior Build366's 64% target used a **narrower denominator** and was not host field proof. Owner added network topology, device discovery, Creality printer monitoring, Alexa, Apple, Samsung, grocery board, and robust UI/security coverage. See `docs/contracts/hub-feature-progress367.json` for 24 equal-weight Hub-native categories, each with a 0–100 **planning estimate**. **Expanded feature estimate is 41.3%; field acceptance remains 18% planning-only; 65/35 blended readiness is 33.1%.** A lower overall baseline reflects new scope, not deletion of prior implementations. Payroll, HST, storefront and business accounting remain the responsibility of their individual apps.

**Next 20 builds:** `docs/BUILD_QUEUE_368_387_HOME_NETWORK_MASTERS.md`; **Build 368 — Private network trust foundation & safe device identity** through **Build 387 — End-to-end household and Masters acceptance campaign**. Build 387 is not an automatic 100%-done certificate.
