# Rosevear AI Hub Build 303 — Original Windows pilot and Master Shell source observability

## What is deployed in source code

- A separately callable, protected **one-receipt cryptographic component verifier** checks the exact QL-364 source health and receipt structures, canonical Ed25519 signed bytes, an independently injected DER public-key pin, key ID, source revision, request/operation identity, TEST-only scope and expiry. No HTTP intake endpoint is added; it never self-enrolls keys or accepts a receipt as authorized. Valid synthetic signatures are **component-valid/HOLD**, not a signed owner decision.
- An owner-only `/api/v1/system/master-shell-local-uptime` route exposes a **local-only**, bounded sampler. It checks TCP availability on `127.0.0.1` ports **8765** (API), **5173** (web), and **8443** (Caddy). TCP reachability is **not full service health**; the dashboard labels it accordingly. Sampling is every 60 seconds, at most 1,440 observations in memory, reset at restart; stale after 130 seconds. No tokens, camera data, customer information or external network addresses are accessed.
- The sampler is **disabled by default**. It can run only when the Python backend starts on Windows host `DESKTOP-AE894KC` **and** `ROSEVEAR_MASTER_LOCAL_MONITOR_303=1`. The Linux CI runner, Jack's laptop `TEMPLAR` and other machines do not sample. The flag is deliberately not silently set from GitHub because installing and restarting the original host is a separate, witnessed action.
- An optional `ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST=1` also holds the **existing AI Hub Python automation event worker** off any non-Ree Windows host. It is opt-in to avoid silently changing deployed automation behavior; it is **not** a transfer mechanism for external applications or their schedules.
- The AI Hub Integration Health page now has a manual, owner-only server monitoring view; the protected-intake review can prepare an explicitly acknowledged, sanitized, no-send one-candidate pilot reconciliation for both Master applications. It shows no invented original receipts or authenticated integration state.

## Cross-app coordination inspected on 2026-11-10

| Application | Inspected `main` SHA | Contract ownership | Build 303 handoff |
| --- | --- | --- | --- |
| AI Data Platform | `1deadd7ab98f1060e8e1ac0b77f63c4c1472b04a` | Source health, monitored measurements, drift, completion/readiness; Build 353 source ACK remains HOLD | `monitoring` section, local provenance and sample count; **no publish**, awaiting authenticated ingestion contract |
| Rosevear Comms Hub | `670ab9c8573084a5c0b8e7394795efeee4dde2af` | QL-408 independent protected adapter and seven audit gates; QL-409 source-scoped exception history and receiver-OFF worklist | `incidentOperations` section, sanitized issue codes and explicit receiver OFF; **no ticket/alert** without owner-gated receiver |
| Rosevear AI Hub | Build 302 source baseline `0b2435f0fa787df009c4661d8d70b39e0528ca25` | Original Windows source authority, device and local automation control, one-receipt proof | Builds 301/302/303 guarded workflow and source-only health snapshot |

The three applications remain **independent applications**; this build begins the contract-level Master Shell integration, not a repository/codebase merge or credential exchange. There is no application-to-application remote control, autonomous outbound messaging, database write, device action or customer read.

## Ree original Windows host operator sequence

1. On the **original** `DESKTOP-AE894KC`, independently confirm the running Python server and installed `main` revision against GitHub and verify the owner login. Never treat GitHub CI GREEN as installed-Windows proof.
2. In an approved maintenance window, set `ROSEVEAR_MASTER_LOCAL_MONITOR_303=1` and (after reviewing existing Hub automation) `ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST=1` in **the environment of the actual Python server launcher**, then restart that server through its approved existing method. The repository does not alter existing scheduled tasks, launchers or credentials. Do not configure this on Jack's laptop.
3. Open the authenticated owner UI → Integration Health → **Original-host uptime and Master Shell coordination** → Refresh. Check samples and freshness; unknown/failed reachability cannot be marked operational. For an always-on source monitor, ensure the existing approved Windows Recovery task starts that Python backend reliably.
4. In Build 302 protected operator review, open **Build 303 supervised pilot**, inspect one metadata candidate and source exception labels, and download only the sanitized `HOLD` report after acknowledgement. Never paste private keys, original signed receipt bytes or witness evidence into a browser or GitHub.
5. After a separate authenticated original-host signer/issuer enrollment, independent reviewer/witness and Master owner approval, purpose-limited consent, durable atomic replay ledger and protected receiver enrollment, run **one separately authorized nonproduction GET** through the existing QL-364 pathway. Verify the true source-signed receipt server-side. The installed code does not do this automatically.

### Trust and operational readiness

- **Source code and CI:** tracked by normal PR checks.
- **Original Windows host:** not independently attested by GitHub; opt-in monitor must be installed/activated there.
- **One source receipt:** no live original source signing or independent receiver acceptance performed by this build.
- **Master Shell:** AI Data Platform and Comms Hub both `DISCONNECTED / HOLD`; Comms receiver `OFF`.
- **Automation:** Build 303 uptime checks run only on Ree's local Python host after opt-in. Existing cloud automation, private Comms receiver, scheduled tasks and other app jobs have **not** been migrated or disabled. A separately reviewed inventory and safe cutover is required before claiming *all* suite automation runs on Ree's server.

## Verification

`uv run --extra dev pytest -q server/tests/test_master_shell_uptime303.py server/tests/test_protected_receipt_pilot303.py server/tests/test_ql364_source_health.py`

`npm --workspace apps/web run test -- masterShellUptime303.test.ts WindowsSupervisedPilot303Panel.test.tsx windowsProtectedOperator302.test.ts WindowsProtectedOperator302Panel.test.tsx`

`npm --workspace apps/web run build`

## Next proposed build

**Rosevear AI Hub 304 — Ree Server Monitoring Persistence, Signed Read-Only Master Telemetry Contract & Comms Incident Handoff Acceptance.** Never activate without independently authenticated source/receiver authority.
