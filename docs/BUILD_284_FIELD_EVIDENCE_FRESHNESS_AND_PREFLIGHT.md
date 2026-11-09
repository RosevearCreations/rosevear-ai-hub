# Rosevear AI Hub Build 284 — field evidence freshness and Master Shell reporting preflight

## Scope

Build 283 defined the proposed source module inventory, with percentages based on five source-review milestones from Build 281. Build 284 adds a **manual, account-scoped, browser-local owner report** for each applicable AI Hub module. No new Master Shell transport, signed recipient identity or independent reviewer proof is introduced.

### Owner workflow

1. Sign into an AI Hub account with permission to administer the System / I.T. integration area.
2. Expand **Master Shell proposed reporting and integration gap assessment**.
3. Review the **Installed-system evidence preflight**. Each applicable module starts as **no observation** unless that account has previously recorded an owner field report in this browser.
4. After personally checking the actual device or Windows service, choose **Owner reports working** or **Report issue**. The result is timestamped using the browser clock. Do not enter credentials, network addresses or raw private notes: there is no free-text field.
5. Use the pending / recorded / all selector to find unfinished, stale and problem modules. Owner-reported issues stay in the pending list even when recently recorded.
6. Preview the strictly redacted candidate. **There is no Send, Publish, Connect or Approve action.**

## Freshness and trust model

| Status | Meaning |
| --- | --- |
| `NO_OBSERVATION` | No owner report exists in the current account's browser storage. |
| `CURRENT_OWNER_REPORT` | Owner entered a result no more than 30 days ago; **not independent validation**. |
| `STALE_OWNER_REPORT` | More than 30 days elapsed; revisit the physical service/device. |
| `CLOCK_CHECK` | Local timestamp lies more than five minutes in the future, or the current clock cannot be trusted. |

The storage record is versioned, bounded and narrowed to known module ID, one of two allowed outcomes and local timestamp. Unsupported statuses, foreign module IDs (including N/A business responsibilities), malformed records, duplicates and surplus private fields are ignored. Every owner account uses a different storage key. Storage failure is visible and never faked as success.

**Owner-reported success is never upgraded to independent acceptance.** The preflight always has `independentlyVerifiedModules=0`, `transmission=NOT_CONFIGURED`, and `BLOCKED_INDEPENDENT_FIELD_PROOF_AND_SHARED_CONTRACT_PENDING` until future versions explicitly implement independently verified and owner-approved evidence handling.

## Inter-application contracts remain unchanged

- AI Data Platform: authoritative suite-wide completion, module taxonomy, evidence verification and telemetry receiving policy must be approved before a signed status feed is published.
- Rosevear Comms Hub: maintain existing QL-365D source identity, manifest, signer/custody and private GET safeguards; do not treat client-local report as a Comms incident or authenticated connection receipt.
- AI Hub: collects only its own local status observations; never assumes responsibility for business storefront, payroll, worker portals or other apps' completion.
- One-to-one, one-to-many, many-to-one and many-to-many delivery remain **design goals with explicit policy gates**, not activated by this build.

## Test and deployment boundary

Run the complete frontend typecheck, production bundle and regression suite, plus `node --test scripts/ql365d-source-attachment.test.mjs`; require all six protected CI jobs for source PR, production candidate PR and fresh exact `main` push SHA.

`main` CI GREEN is **source release acceptance only**. Ree's installed Windows revision, Home Assistant, MQTT, Ollama, cameras, X10 hardware and actual field observations still need their own independently checked evidence. A locally clicked observation is neither a live service probe nor a signed verifier receipt.

## Next recommended build

**Build 285 — Windows Installed-Version Verification, Service Discovery & Live Health Evidence.** This should introduce clearly distinguished genuine local probes and device acceptance checklists, retaining the above separation between source, owner reports and independent verification.
