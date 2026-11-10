# AI Hub 305 — Ree Original Windows Installed Release and Master360 One-TEST

## Source reconciliation

Owner token: `MASTER360-AIHUB-CONTINUE`. AI Data controller `main`
`4b45b435fa7b6fc83b94e31556648fe4190a9f53`, contract
`docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json`. AI Hub Build 304
`main` `1a52acf4fc756088d0a1ab38b350f96fccce2a1b`.
Comms Hub QL-411 `main` at `e8ec7853133725bbdf51893548a20cac67ebfbed`.
Its protected format is defined by
`runtimes/master-telemetry/ql411-protected-telemetry.mjs`. QL-412 is the next
proposed Comms build, **not** a verified receiver contract on that revision.

## Read-only Ree-host acceptance (the actual Windows machine still needs review)

The owner-only `GET /api/v1/system/master-shell-305-readiness` reports:

- Exact original Windows host check for `DESKTOP-AE894KC`, with no fallback to
  Jack's independent `TEMPLAR` laptop or a Linux/cloud runner.
- Existing Build 304 persistent 7-day SQLite observation count, current/stale
  states, and local TCP availability for API 8765, web client 5173, Caddy 8443.
- A bounded read of the existing release pointer from
  `logs/hub-deployment/active.json`. Even if its SHA matches Build 304, this
  is **not** independent loaded-process-to-launcher verification; it remains HOLD.
- Nothing in this endpoint installs Build 305, runs/restarts software, creates
  tasks or changes the existing Recovery task.

On Ree's machine, an owner must separately confirm the existing approved
launcher is running a Build 304/305 installed revision and has both
`ROSEVEAR_MASTER_LOCAL_MONITOR_303=1` and
`ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST=1` in the actual running process.
Do not create another Windows Scheduled Task. After a few minutes of real
sampling, open I.T. → Integration Health → Build 305 and click **Refresh**.
Observed TCP percentages are sample counts, not a user-facing uptime SLA.

## Protected QL-411 format / QL-412 one-TEST handoff

Build 304's signed summary is **not** directly consumable by the QL-411
receiver. Build 305 adds a separate backend-only `prepare_ql411_one_test305`
component with the exact QL-411 `rosevear.ql411.ree-telemetry.v1` payload:
source ID, `DESKTOP-AE894KC`, independently pinned installed source revision,
UTC capture time, opaque episode ID, and 2–1440 actual measured loopback
observations (24-hour maximum). It uses the QL-411 required JS
`JSON.stringify` byte order, Ed25519 SPKI pin, padded base64 signature and
the three canonical service IDs. The local `capture_one_supervised_probe305`
performs **one** explicit source-only TCP latency observation and returns
actual measured times; a supervised protected adapter must collect multiple
observations without a second background scheduler.

It refuses to produce an envelope unless all of these independently supplied
protected host assertions are true:

1. Ree original host and current persisted Build 304 monitoring are present.
2. Installed process revision and measured observations are independently
   matched, not merely read from an unsigned release pointer.
3. Source and Master owners, independent reviewer and owner consent approve
   exactly one nonrevoked TEST.
4. A durable atomic per-episode claim succeeds on the protected source.
5. Source private signer is available only to the protected host adapter and
   produces a signature verified against the independently enrolled public
   key; no key material is embedded in the envelope.

This function returns an **offline signed candidate**, never sends HTTP,
activates Comms, or marks CONNECTED. The receiver must separately use its own
durable replay ledger, enrolled pin, independent owner audit, authorized
transport and signed ACK before a real one-TEST acceptance can be claimed.
An unsigned QL-411 operator claim is not a QL-412 signed receipt.

## Three-Master state to return

The machine-readable response at
`docs/master-shell/MASTER360_AIHUB_305_ACK.json` is a **code-only receipt**.
Actual installed-release proof, original-host durable history, signer
enrollment, signed one-TEST and receiver ACK remain HOLD until independently
observed. AI Data Platform must retain
`HOLD_NEXT_MASTER_INTEGRATION_STAGE` for slave onboarding.

**Next proposed Build 306:** Ree Windows Installed-Release Owner Acceptance,
Protected One-TEST Evidence Import & Three-Master Uptime Trend Reconciliation.
