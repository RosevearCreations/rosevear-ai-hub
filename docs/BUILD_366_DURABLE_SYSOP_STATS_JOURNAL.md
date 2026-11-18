# Rosevear AI Hub Build 366 — Durable Signed Sysop Journal & Seven-App History

## Scope and authority
Build 365 main (8006bb9f693fd2418163968d1a02580fb101bd54) has six passing protected-main CI checks. It provides an owner-only read-only signed-file verifier, **not** a running collector. Build 366 adds opt-in durable receipt storage, a replay-safe local Sysop event history and integrated read-only owner UI. It does NOT install a Windows service, schedule polling, activate QL-340C, create signing keys or claim 24/7 physical runtime.

## Five substantive source-level features
1. A manually invoked Windows original-host command verifies independently pinned Ed25519 source envelopes using existing Build365 rules, then stores sanitized aggregate counters and non-identifying Sysop process observations in local SQLite. No raw signed payload, keys, secrets, camera imagery, user/tenant IDs or payment information.
2. Per-app unique event IDs and nonces are enforced transactionally. Forged, expired, wrong-source or tenant-bearing data cannot be appended.
3. History is bounded to 2048 entries and seven-day retention; unavailable metrics stay NULL rather than guessed zero.
4. Owner-only GET /api/v1/system/sysop-history-366 reads the configured original-host private journal with deterministic HOLDs, no browser mutation and no network operation.
5. Integrated historical seven-app view provides source counts, recent claimed observations, reported restarts/host boot and clear NEVER-LIVE-verification labels. New tests cover signature acceptance, tampering, replay and off-host access.

## Exact seven participant roles
- Masters: ai-data-platform (top Server Shell), rosevear-ai-hub (original Windows runtime), rosevear-comms-hub (communications).
- Governed Slave Shells: yw, icamp.
- Direct business apps: rosiedazzlers, devilndove.

## Original Windows operator activation (separate manual decision)
Apply the exact promoted production SHA to DESKTOP-AE894KC through the existing supervised Windows update process. Provision, in owner-protected private paths only, the genuine signed source envelope, separately approved Ed25519 public PEM fingerprint and exact producer source commit for every app intended to be received. Existing Build365 variables are:

    ROSEVEAR_SYSOP365_{TAG}_SIGNED_JSON_PATH
    ROSEVEAR_SYSOP365_{TAG}_PUBLIC_KEY_PATH
    ROSEVEAR_SYSOP365_{TAG}_PUBLIC_KEY_PIN
    ROSEVEAR_SYSOP365_{TAG}_SOURCE_COMMIT

Here TAG is one of AIDP, HUB, COMMS, YW, ICAMP, ROSIE, DEVIL. Never publish secrets or trust fingerprints blindly copied from the same envelope.

Configure ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH to an absolute SQLite path in an existing Windows owner-only directory outside the repository, protected by ACLs. A successful owner-approved local append creates this SQLite journal. Ensure appropriate safe supervised backup of SQLite and WAL material.

No-write signature check:

    .\.venv\Scripts\python.exe scripts\ingest-signed-sysop366.py --app rosevear-ai-hub

Explicit opt-in append:

    .\.venv\Scripts\python.exe scripts\ingest-signed-sysop366.py --app rosevear-ai-hub --append

Change the app ID to ingest another independently enrolled source. Duplicates return HOLD. The CLI refuses non-original-Windows hosts. GET view never ingests.

## Network peers still NOT automatically connected
The canonical AI Data Platform v1 protocol is at docs/contracts/rosevear-sysop-telemetry-v1.schema.json in its main. Handoffs: Hub issue #825, Comms #967, YW #846, iCamp #645, Rosie #1136, Devil #970. All producers must implement real measured aggregates or explicit nulls, sign server-side, use approved private transport and independently pinned trust. Vercel may need a secure outbound intermediary. A local signed-file claim is not authenticated live network delivery. Do not show CONNECTED before a real signed peer receipt, durable replay rejection and source/transport audit.

Windows physical pre-login recovery, Home Assistant VirtualBox/MQTT/camera and backup restoration remain separate field acceptance. The Comms QL-340C receiver remains unauthorized.

## Completion policy, not a fabricated increment
Independent owner re-baseline in the separately supplied Word report was 59% weighted Hub functional coverage, 18% field acceptance, 45% overall. Build366 targets five earned source-level points: persistent journal, durable replay policy, bounded retention/rollup, protected owner endpoint and usable 7-app history. Only after all dev/isolated-main/protected-main six-job CI gates pass, estimate 64% source, 18% field, 48% blended readiness; otherwise preserve the lower number and explain the deficit. These are management estimates, not measured acceptance.

## Next candidate
Build367 — real independently enrolled read-only source producers plus first genuine live signed peer receipts for each Master; owner-supervised trust and rollback remain prerequisites.
