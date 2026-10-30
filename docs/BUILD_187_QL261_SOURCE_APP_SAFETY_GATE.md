# Build 187 — QL-261 source-app nonproduction GET boundary and exact owner packet review

29 October 2026 (Toronto) · Source software may be **Production GREEN** while integration remains **DISCONNECTED / HOLD**.

## Implemented and tested

1. Reassessed the *already implemented* server-only `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`: disabled by default, nonproduction `APP_ENV` only, exact `ai-data-platform` caller and `rosevear-ai-hub` business, `tenant=-`, HMAC-SHA256 with independent `np-` key ID, signed timestamp/nonce, durable SQLite replay/audit, no query/body, no extra endpoints, and no commands. All responses disclose only coarse static identity, two read-only scopes and DISCONNECTED/HOLD state.
2. Added explicit no-cache, pragma and content sniffing response headers for these two synthetic-only GETs. Added regression coverage that blocks actual socket connections during signed in-process GETs; asserts only fixed identity/scopes and no home device/camera/MQTT/vault/customer details; rejects POST dispatch and a production environment even if other synthetic credentials are set.
3. Added `scripts/ql261-hub-source-return.mjs`: offline strict intake of the *exact* sanitized QL-258 Rosevear AI Hub JSON from Comms Hub, outputting an allowlisted public/nonsecret return. Unknown fields, arbitrary names/paths, approval claims, cross-app identities and changes to the historical SHA are rejected. DONE is still an unverified owner self-report. No packet was supplied to this build; the tool never invents one.
4. Wired Node regression tests into source CI. The backend's full pytest suite also executes the synthetic API check. This build does **not** inspect, create or export a private signing key, install relay software, touch Windows startup/network settings, or make authenticated gateway GET requests.

## Acceptance checklist — actual status

| QL-261 check | Evidence / disposition |
|---|---|
| Nonproduction health/capabilities syntax and schema | **SYNTHETIC TEST ADDED**, in-process; not an original gateway receipt |
| No private home-system access in this build | **SOURCE TEST BLOCKS SOCKET CONNECT**; no live Windows/device/MQTT/Vault operations executed |
| Genuine signed A→B and independently pinned signer | **BLOCKED**: real authenticated custodian, separate nonce witness, reviewer and approved key store not supplied |
| Explicit stop/rollback before future relay | **NOT APPLICABLE YET**: relay uninstalled/OFF; an actual later installation requires a separate authenticated TEST-only owner decision, written rollback and reviewer |

Source baseline before Build 187: immutable `main` `2678983cb077f38b825ce8f113390fe8236f51bb`, exact completed GREEN source CI [40971506348](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40971506348); original proof path `docs/integration/ql246-source-proof.json` observed **HTTP 404** at that immutable SHA. This is source A **candidate** evidence only, never B. Verify the newer Build 187 `main` SHA and its own CI/immutable proof path after promotion; do not auto-trust it.

## Offline source return command

```sh
npm run integration:ql261:hub:check
npm run integration:ql261:hub:test
npm run integration:ql261:hub:check -- --owner-packet /path/to/actual-sanitized-ql258-hub-return.json
```

Only run the third form after the owner actually copies a nonsecret `rosevear-ai-hub` packet from the Comms Hub worksheet; no real names, identities, private tokens, signer PEM, HMAC, home IPs or secret paths. Existing `integration:ql258:hub:check -- --public-get --source <actual-current-main-SHA>` remains the **public GitHub only** source/proof freshness check, separate from this offline packet parser.

## Required actual private actions before signed proof B

1. Owner privately chooses a restricted persistent app-specific signer host and separately authenticates the signing-key custodian, nonce witness and reviewer. The public repository **cannot** determine signer existence. Status stays `SIGNER_STATUS_UNKNOWN` until approved operator assessment.
2. If no real signer exists, obtain separate explicit owner provisioning authority. Authorized custodian privately creates/retains an app-specific Ed25519 key; independent witness checks public SPKI over a trusted separate channel. Never place private keys in GitHub, Cloudflare, VITE code, chat, or a public packet.
3. Only after the authorized evidence sequence, sign original canonical QL-246 source proof referring to audited source commit A; place the actual original JSON at `docs/integration/ql246-source-proof.json` in distinct descendant B. Independently check A→B ancestry, raw bytes, signature, source CI and trusted pin, then separately decide on future TEST-only GET (≤30 min).
4. The optional Windows relay stays **NOT INSTALLED / OFF**. No scheduler, tunnel, DNS, network route, device permission or password vault change in this build. Future TEST and installation are separate decisions and require a documented stop/rollback before starting.

**Owner TEST: NOT_GIVEN · Authenticated gateway GETs: NOT_RUN · Proof B: NOT_AVAILABLE · Integration: DISCONNECTED / HOLD.**

Next proposed **Build 188 — QL-261 Actual Owner Packet Receipt Reconciliation, Independent Signer-Custody Evidence Gate & Source-Proof A→B Publication Readiness (HELD).**
