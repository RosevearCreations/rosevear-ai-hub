# Build 231 — Accessibility, Roles, Backup & Resource Closure

## The owner review screen

From **System → Windows field acceptance & regression matrix → Accessibility, roles, backup & resource closure**, review only actual failed/blocked installed-Windows cases collected in Build 228, with a matching Build 229 source-scoped repair proposal.

Five review areas are available, each with two distinct safe local proof codes:

| Area | First observation | Second observation |
| --- | --- | --- |
| Standard theme | Desktop/laptop viewport showing actual clipping, contrast or layout result | Tablet viewport/contrast verification for the same installed release |
| Keyboard accessibility | Tab/Shift+Tab/Enter/Escape traversal sequence | Focus return, modal and keyboard recovery |
| Owner / household roles | Authorized owner-session role check | Separately authorized household-session denial of owner-only audit, restore and secrets |
| Encrypted backup and isolated restore | Archive integrity and off-machine copy reference | Restore rehearsal in **disposable isolated storage** with live files untouched |
| Resource budget | Actual CPU, memory, disk and Ollama measurements at normal use | Representative HA/camera/local AI contention sample and reproducible comparison |

Build 231 does **not** run device tests, retrieve measurements, operate a camera, inspect backup contents, restore, change accounts or grant privileges. Only short safe evidence **reference identifiers** can be entered. Keep logs, private addresses, photographs, secrets, and measured sensitive values outside copied packets.

## Gates and source protection

1. Start from a real owner-observed Build 228 finding/blocked result on the installed Windows Hub. Import a complete private handoff if reviewing in a later session. A passed or untested source is **not** a closure finding.
2. Triage the exact original source in Build 229, including owner priority, separate reproduction proof and repair proposal. The proposal is **not itself an authorization**.
3. For backup/resources, the prior Build 230 retest must have a separately authorized witnessed change, safe-boundary review, new installed-version evidence and a fresh owner-reported **closure candidate**. Build 230 alone does not mean independent restoration success or healthy resource use.
4. Record a distinct installed version, field outcome, observed evidence basis, two distinct fresh safe codes, owner witness and safety attestation. Explicitly click **Record fresh Build 231 Windows check** after observing the current installed device. Old timestamp/reused references cannot turn into a pass.
5. The panel detects changed original evidence, installed release, triage plan or Build 230 retest. A stale record must be reassessed. A reported failure/blocked outcome remains open.
6. Copy the **private Build 231 owner review packet** for owner and independent review. Even when its label reads *owner packet ready*, the verified independent-closure count **always remains zero** pending outside independent evidence and a separately authorized disposition.

## Actual baseline and explicit holds

- **No genuine Build 228/229/230 installed-Windows findings or measured results have been supplied for this build.** The default Build 231 queue is empty, with **0 independent closures**. The unit/UI tests use only synthetic data.
- Approval to implement this **dashboard workflow** is not approval to perform a live repair, change roles, open a secret, read camera feeds, test X10/MQTT, run an active restore or ship a changed installed Windows configuration.
- GitHub `main` Production GREEN establishes **source CI only**, not on-device Windows acceptance or independent closure.
- Six-app integration remains **DISCONNECTED / HOLD**; private relay **OFF**; QL-275 **UNDER REVIEW / DEFERRED**; first-party vault **SECURITY HOLD**.
- Next Build 232 is **not automatically queued**. Genuine owner findings, separate scope authorization and independent evidence decide whether repairs or further validation are appropriate.

## Source regressions

Run `npm run build:231:hub:test`, `npm run web:typecheck`, `npm run web:build`, and the complete web test suite. The five GitHub Actions jobs on `dev`, the review PR and exact protected `main` must separately finish GREEN before declaring **source** promotion.
