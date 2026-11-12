# Rosevear AI Hub Build 322 — QL-431 Post-Re-entry Pilot Health, Signed Shutdown and Incident Custody

## Verified production baselines (November 12, 2026)

| Protected contract | Immutable release commit |
| --- | --- |
| Rosevear AI Hub Build 321 | `dbc3fd8ae7f8df3bfc85a402a00b0954648ec543` |
| Comms Hub QL-431 native reference | `f28f14f67d3ecd5fad9972d6f0500c14de0f89b7` |
| AI Data Platform controller Build 380 | `ccd291f22e15750392fa3995dc3d5811c506cd05` |

Comms Hub QL-431 native contract: `runtimes/master-telemetry/ql431-post-reentry-continuity.mjs`. A later Comms Hub revision must be reconciled separately before interpreting live evidence.

## Protected operator steps

1. On original Windows host `DESKTOP-AE894KC`, use independent operator verification of the original one-use QL-430 accepted record from the Build 321 private journal. The prior signed pilot must be a separately supervised, already accepted `ISOLATED_ONE_TEST_ON` / `VERIFIED_CONNECTED_PILOT` with the **slave gate still HOLD**. A successful GitHub release or dashboard flag is not accepted evidence of a live pilot. Do not pass private keys, operator secrets, or receiver transports to a browser.

2. Call `run_ql431_post_reentry_health322` only inside that original-host protected backend with the exact QL-430 accepted record digest, an original-host session/custody attestor, a separate read-only independently signed receiver adapter, a protected shutdown adapter and independently enrolled Ed25519 public signer pins. Master pins, independent receiver pin and original shutdown pin must be distinct. The routine does **not schedule** its own observations; each is an explicitly supervised, bounded single-cycle invocation.

3. For a healthy observation, each of the three Masters (AI Hub, Comms Hub and AI Data Platform) signs a fresh strict QL-431 envelope referencing identical protected ceremony, episode, source/controller revision, QL-430 acceptance digest, healthy status and a strictly increasing sequence. The independent receiver signer provides a fresh, exact-scope signed `ISOLATED_ONE_TEST_ON` readback tied to the same observation ID. The private original-host `ProtectedContinuityJournal322` appends and FULL-syncs a linked `HEALTH` checkpoint, then reopens and verifies the full chain. A successful **single snapshot** may return `VERIFIED_CONNECTED_PILOT` for that one isolated test; this is **not** universal CONNECTED, a continuously monitored receiver, a service availability guarantee or measured uptime.

4. On missing, forged, replayed, stale or conflicting Master/receiver health, persist a single `PENDING` incident linked to the last durable high-water checkpoint **before** calling the protected receiver's `disable_one_test`. The same observation, incident and one-use chain scope are bound to the shutdown request. A signed original-host shutdown acknowledgement must prove OFF with exact reason, scope, incident and fresh timestamp. Separately, an independently pinned receiver signer must return a fresh **OFF** readback referencing the original signed shutdown digest. Only after that verification can the original-host journal durably append and reopen the irreversible `OFF` entry.

5. If an original-host pending incident cannot be written because custody is unwritable or tampered, the protection requests an emergency shutdown but conservatively leaves receiver state UNKNOWN and connection HOLD; it cannot claim successful durable OFF. A shutdown exception, unconfirmed disable, forged original signature, invalid independent OFF signature, missing readback or failed durable OFF commit is **HOLD**, requiring direct original-host operator recovery. A disable acknowledgement alone never equals independent OFF.

6. After the original-host signed OFF receipt has been reopened, obtain fresh separately signed incident-custody reports from **each of three Masters**, all bound to the exact shutdown record digest and signed independent receiver-OFF digest. The owner and distinct reviewer then sign the exact ordered three-Master report digest and `ACKNOWLEDGE_FAIL_CLOSED_INCIDENT_KEEP_RECEIVER_OFF`. The protected `reconcile_ql431_incident322` requires independent physical operator, Master, owner and external custody callbacks before committing the terminal `RECONCILED` entry. **Reconciliation never reactivates**: receiver OFF, connection HOLD, other application slave gate HOLD.

7. Following incident closure, a **new independently owner-supervised QL-429/430 ceremony**, signer/replay restoration and fresh original-host acceptance are needed before re-entry. No background auto-restart or browser path is installed. Continuous signed health uptime would require separate supervised QL-425/426-style monitoring and independent runtime evidence, not inferred from GitHub CI.

## Custody and limitations

The local original-host SQLite chain stores indexed hash-linked canonical metadata, FULL-sync commits, exclusive writer transaction, exact previous-digest transitions, and verifies the whole chain on each original-host read. Transitions are monotonic `HEALTH*` → `PENDING` → `OFF` → `RECONCILED`; a terminal incident cannot be replayed or reversed. These local checks cannot detect deletion of the **entire** private store by a privileged operator: export checkpoint hashes to an independently administered immutable external anchor before treating custody as physically durable.

The owner's authenticated `GET /api/v1/system/master-shell-322-acceptance` returns a read-only `Cache-Control: private, no-store` *source* projection. The dashboard never accepts signatures, physical signer enrollment, receiver controls, or live claims, and remains **receiver OFF / connection HOLD / owner HOLD / Master sync HOLD** absent independent proof.

New synthetic tests cover ordered signed health, replay and signed heartbeat forgery, original-host attestation, signed fail-closed OFF, forged shutdown and remote-off, fail-closed shutdown exceptions, interrupted custody, tamper detection, three independent incident signers, independent dual owner, one-use incident terminal transition, and the never-CONNECTED UI. Tests use generated Ed25519 keys and mock adapters; **no** real receiver is enabled or monitored through GitHub Actions.

`MASTER360-AIHUB-322-ACK | source=rosevear-ai-hub | source321=dbc3fd8ae7f8df3bfc85a402a00b0954648ec543 | comms431=f28f14f67d3ecd5fad9972d6f0500c14de0f89b7 | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | original-host-ql430-accepted=HOLD | three-signed-healthy-heartbeats=HOLD | signed-receiver-on=HOLD | durable-sequence-watermarks=HOLD | pending-incident=HOLD | signed-shutdown=HOLD | independent-off=HOLD | three-master-incident=HOLD | owner-signoff=HOLD | reconciliation=HOLD | receiver=OFF | connection=HOLD | uptime=UNKNOWN | slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next queued: Rosevear AI Hub Build 323 — QL-432 External Incident Checkpoint Anchor Readback, Original-Host Recovery Revalidation & Owner-Gated Isolated Pilot Continuity Review.**
