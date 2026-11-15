# Rosevear AI Hub Build 346 / QL-455 — protected signed cross-app message custody

**Scope:** Local, source-only protected SQLite outbox/inbox, atomic duplicate detection,
 bounded retry leases, dead-lettering, recipient Ed25519 ACK signature and expiry
 validation, owner-only read-only source status. **No live network transport or
 secret enrollment; source CI does not make the seven applications CONNECTED.**

## Implemented contracts

- \`cross_app_ledger346.DurableSignedMailbox346\` provides explicit trusted
  local \`enroll()\`, durable SQLite WAL/FULL write transactions, keyed OUT/IN
  replay journals, atomic one-message leases, bounded exponential retry,
  expired-message dead letter, idempotent exact inbound receives, and a separate
  destination-signed ACK record linked to message digest/evidence digest/attempt.
- All messages pass the existing seven-key pinned QL-453 strict adjacent-hop
  original signed envelope. Shared QL-454 T0–T5 identity policy remains separate;
  tenants and private customer content do not enter the governance envelope.
  **Only restricted read-only OPEN/HOLD governance or brand-health envelopes are accepted.**
- \`GET /api/v1/system/master-shell-346-mailbox\` only presents fixed non-live
  owner readiness in Master Instrument. No HTTP POST to enroll a mailbox,
  register public keys, send messages, create ACKs, or control devices.
- Protected ACK persistence means **historical custody of an authenticated
  signature**, not independent proof of a live end-to-end message delivery.
  Real network delivery, authenticated transport, durable recipient identity
  enrollment, full per-app SDK integration, and cross-tenant RLS tests are
  separate HOLD acceptance gates.

## Business-to-Master communication contract

`business_master_contract346.py` accepts a **separate signed, short-lived
read-only brand-health envelope** for each direction between Devil n Dove or
Rosie Dazzlers and **each of the three Masters**. Its only event classes are
`business.health.readonly.v1` and `master.health.readonly.v1`; tenant/customer
IDs, booking/order payloads, changes to payment state, device commands and
T5 receiver privileges are strictly forbidden. This is **12 source-level
routing pairs with durable local inbox/outbox acceptance tests**, not an
installed HTTP transport or proof that a remote app actually received a message.
Recipient enrollment, live sender→receiver transport, real signed ACK and
operator trace verification remain separate owner-gated rollout requirements.

## Windows: stop five-minute PowerShell focus theft

The existing source at \`scripts/install-hub-recovery-task.ps1\` registered a
 user-interactive \`powershell.exe\` task every five minutes without window hiding.
 New installs for Recovery, Startup, LAN Gateway and Release Adoption now use
 \`-WindowStyle Hidden\`. Existing Windows task registrations do **not**
 update themselves when GitHub code is merged.

**On original DESKTOP-AE894KC, after downloading and reviewing the verified
 source release** from the Windows repo root, open PowerShell **as the same
 existing task owner**, elevated only when performing an update:

\`\`\`powershell
# Preview only; reads four known Hub tasks, makes NO changes
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-hub-quiet-scheduled-tasks.ps1

# Explicitly apply after owner review; task action only, preserving user/triggers
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-hub-quiet-scheduled-tasks.ps1 -Apply

# Verify quiet-task readback, Windows task history, and original Hub log
Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' | Select-Object -ExpandProperty Actions
Get-Content .\logs\hub-recovery.log -Tail 20
\`\`\`

The migration refuses unrecognized scripts, different users, unexpected run
 levels, running tasks or missing trusted local file paths. It **does not**
 switch the task to another account, disable recovery, restart Windows or
 start the receiver. Windows/antivirus may still show system UI; a real original
 workstation acceptance observation is required to certify no focus loss.

## Restart button truth

- **Restart Client** in the top bar checks/reloads same-origin browser/PWA; it
  does not install an update or restart Windows/services.
- Desktop-only **Restart backend app** invokes a guarded Tauri command and
  identity-checked local maintenance script; it may be blocked by running
  recovery and does not update databases or all applications.
- **Update Hub** requests the existing enrolled Release Adoption task only
  from an authenticated local Windows owner with explicit consent; requires
  verified managed slots, backup, recovery task, readiness and rollback. The
  UI reports "requested", NOT "installed", until independent evidence.
- These source functions have static/unit tests. **Not verified live on the
  actual DESKTOP-AE894KC Windows PC.** This source-only GitHub release neither
  accesses local Task Scheduler nor changes a Windows process.

## Shared seven-app route and visual trust

| Application | Type / presentation | Communications gate |
|---|---|---|
| ai-data-platform | top Master; common Master Instrument theme | original schema/topology authority |
| rosevear-ai-hub | independent Windows Master; common theme | source QL-455 local signed mailbox |
| rosevear-comms-hub | Comms/ops Master; common theme | independently enrolled signer + ACK |
| iCamp | Slave Shell label; preserve Meadow/Orbit tenant visual | shell isolation, tenant scoped messaging |
| YW | Slave Shell label; preserve blue or futuristic theme selection | shell isolation, tenant scoped messaging |
| devilndove | internal business; preserve navy/purple/copper/gold visual | brand scoped exchange with all three Masters |
| rosiedazzlers | internal business; preserve black/gold/silver visual | booking/job exchange with all three Masters |

**Audit observation:** AI Hub and Comms Hub have identical
 \`.github/rosevear-master-theme.v1.json\` blobs. AI Data Platform does not
 currently have that same file in its \`main\` source tree: actual all-three
 theme parity remains **NOT VERIFIED** pending an independent source/runtime
 review. This build does not overwrite either Slave application's unique theme,
 nor claim it deployed Slave Shell badges into their separate apps.

The original protected Windows receiver is still **UNKNOWN**, incident **OPEN**,
 connection **HOLD**, activation and closure **false**. No web user, remote
 Master message, failed/offline Windows task or signed ACK can grant T5.

## Release and follow-up

Feature PR to dev: six CI checks. Protected main isolated exact-file PR:
 six CI checks. Independent exact-main push: six checks. Production CODE GREEN
 is not installed Windows GREEN or verified external-app connectivity.

**Next proposed Build 347 / QL-456:** independently enrolled application
 service principals, audience-bound signing keys, key rotation and revocation,
 plus first real transport pilot acceptance using a non-production signed ACK.

**Remaining proposed queue after Build 346:** Builds 347–356, ten builds.
 The +10 percentage-point per-app capability target is not yet evidenced.
 Branch retention: only \`dev\`/\`main\` should remain after each release
 when merged work is safely archived; existing divergent/unmerged branches
 must not be silently deleted.
