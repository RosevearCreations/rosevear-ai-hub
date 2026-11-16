# Rosevear AI Hub Build 350 / QL-459 — three-Master Windows service custody and live Slave telemetry

## Architecture and delivery boundary

`ai-data-platform` is the planned **top-level Server Shell**. `rosevear-ai-hub` is the **original Windows automation runtime** on `DESKTOP-AE894KC`. `rosevear-comms-hub` is the **communications module**. All remain independently deployable; their visual modules share the instrument design and offer independent instrument/nebula/aurora themes. The iCamp and Yard Workers Slave Shells stay separate and preserve their own brand themes. No Vercel promotion, inter-app lockstep, automatic receiver activation or repository merging in this release.

**Build 350 adds working opt-in code**, not a claim that the Windows services, recovery tasks or peers have already been installed. The UI's `/api/v1/system/server-shell-350` is owner-only and strictly GET. It reads actual local original-host SCM observation journal entries and cryptographically rechecks recent Slave signed health reports. Missing/expired/invalid sources produce UNKNOWN/HOLD, never synthetic success.

### Windows SCM module map (fixed and allowlisted)

| Master module | Windows Service Control Manager name |
| --- | --- |
| ai-data-platform | `Rosevear-AIDataPlatform` |
| rosevear-ai-hub | `Rosevear-AIHub` |
| rosevear-comms-hub | `Rosevear-CommsHub` |

These are intended names for **future independent Windows service installation**. They are not claimed to exist yet. The actual Windows host must install services with these names under owner supervision and verify service identity, privilege boundaries, process status, log rotation, startup restart policy and failure rollback. The supervisor does **not** install or register services.

### Original-host owner setup (manual, no keys in Git)

1. On `DESKTOP-AE894KC` provision the signed Build 349 enrollment manifest, 32-byte raw Ed25519 owner public key and independently pinned SHA-256; keep private signing key offline. Set `ROSEVEAR_QL458_MANIFEST_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PIN`.
2. Prepare owner-only directory for `ROSEVEAR_QL459_CUSTODY_DB` and `ROSEVEAR_QL459_TELEMETRY_DB`. Protect the service account, database, WAL files, cert/key files, and grant directory using Windows ACLs. Never place these in a synced or public web path.
3. A `--observe` operation only queries SCM status and records fresh observations: `python scripts/hub_master_supervisor350.py --observe`. No service starts.
4. To change one Master service, sign a **separate, expiring owner permit** bound to the exact Build 349 `manifestDigest`, host, module ID, fixed service name, random nonce and action. Set `action=start` or `stop`, expiry no longer than 60 seconds. Run `python scripts/hub_master_supervisor350.py --action --permit C:\\Protected\\permit.json` locally as an authorized Windows administrator. The signed permit carries `schema=rosevear.hub.signed-local-service-permit350.v1`, `originalHost`, `manifestDigest`, `moduleId`, `serviceName`, `action`, `nonce`, `issuedAtMs`, `expiresAtMs`. Signature is lowercase hex Ed25519 of canonical, sorted-key JSON. The watcher never trusts a browser command, anonymous remote API, arbitrary EXE path or physical receiver service.
5. Optional `--watch` observes the three services every 60 seconds until stopped. Optional `--recovery-grants C:\\Protected\\Grants` allows only separately signed `recover` grants, one per intended module, expiring in at most **24 hours**. Recovery is strictly limited to stopped services, **3 attempts per hour per module** and at least **10 minutes apart**; failed service observations and stale grants never trigger actions. This optional watcher is **not automatically installed or enabled** and must itself be supervised with a Windows service or Task Scheduler, owner approval, and measured reboot/rollback acceptance. No `TinyFish` dependency.
6. Every action is journal-reserved before SCM operations so the same permit cannot replay. SCM returns are followed by actual state readback; UNKNOWN/PENDING_RECHECK never becomes a verified success. Service stop is independent of other Masters; no protocol 1.0 peer is forced to upgrade.

### Authenticated iCamp and Yard Workers health

- Peers separately implement **GET** `/internal/rosevear/health/read-only/v1`, returning a signed JSON envelope `{payload,signature}`. The payload is `rosevear.service.slave-health350.v1`, protocol `1.1`, issuer `YW` or `iCamp`, audience `rosevear-ai-hub`, keyId, unique nonce, issuedAtMs, expiresAtMs (up to 90 seconds), state `HEALTHY/DEGRADED/UNHEALTHY`, uptimeSec, recentErrors and queueLag. The remote implementation is **not part of this Hub-only release**; until each app is updated, those metrics remain UNKNOWN.
- The original Windows host uses verified TLS 1.2+, CA chain validation, hostname verification, pinned peer leaf, mTLS client cert and **independently enrolled Ed25519 peer public key**. Only authenticated exact-schema, fresh observations are persisted into SQLite with replay protection. The local owner-only read API revalidates the signature, its key registry and the signed manifest fingerprint before displaying metrics.
- Supply `ROSEVEAR_QL459_REGISTRY_PATH` with an **owner-signed, host-scoped public-key registry** using schema `rosevear.hub.signed-slave-key-registry350.v1`; its payload includes originalHost, manifestDigest, issuedAtMs, expiresAtMs and keys with issuer, keyId, publicDerBase64, activeFromMs, activeUntilMs, revokedAtMs. Set `ROSEVEAR_QL459_TLS_CA`, `ROSEVEAR_QL459_TLS_CERT`, `ROSEVEAR_QL459_TLS_KEY` to locally protected mTLS paths.
- Run `python scripts/hub_slave_probe350.py --peer YW` or `--peer iCamp` for one authorized real probe; `--watch` loops every 60 seconds until interrupted or a fail-closed error. It is not installed as a 24/7 task by a GitHub source merge.

## Acceptance ceremony and safety

Source CI validates signed grants, off-host denial, independent module isolation, nonce replay, recovery rate limiting, unsigned/expired peer telemetry, sign-verified local registry, invalid REST mutations, and existing web/desktop/backend regressions. Production acceptance additionally requires actual **original Windows host** startup/service installation, three service identities, observed SCM readback, a protected service-account and backup test, installed watchdog, reboots/recovery, peer TLS identity proofs and signed Slave samples. Until then: **CODE GREEN ≠ ORIGINAL-HOST RUNTIME GREEN**. Original physical receiver stays **UNKNOWN**, incident **OPEN**, activation **DENIED**. No physical receiver commands or Home Assistant actuator permissions are exposed by this build.

## Next proposed Build 351 / QL-460

Original-host Windows supervisor service adoption and reboot/rollback drills, independently witnessed activation windows, home-automation read-only status adapter, per-module event bus, and scoped issue alerts and acknowledgements without inter-app lockstep or receiver authority.
