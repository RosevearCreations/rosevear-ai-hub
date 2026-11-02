# Build 229 — Windows Owner Finding Triage & Source-Matched Repair Planning

## Owner workflow

The owner-only **System > Windows field acceptance & regression matrix > Finding triage & repair planning** now follows directly after the Build 228 regression matrix.

1. Open the actual installed Windows Hub and complete the 11 Build 228 field checks, recording only safe local evidence reference codes and observed results. Source CI is a separate signal.
2. If the owner saved an earlier **Copy private owner field handoff** export, paste that complete text into Build 229 and select **Replace current session observations with this handoff**. Only the recognized full Build 228 schema and consistent rows are accepted. Import resets triage and clears the paste field; imported data is still owner-reported, not independently verified.
3. Real `finding` and `blocked` observations appear as a source-matched queue. They are tied to the Build 228 case identifier, installed version, owner-reported observation outcome, evidence basis, reference and timestamp.
4. Set an **owner-selected priority** (P0 urgent, P1 high, P2 moderate, P3 low), reproduction status, separate safe retest reference, and disposition (`investigate`, `repair proposal`, `retest`, `defer`). No severity, failure or priority is invented when absent.
5. **Repair proposal** is ready for a separate owner scoping decision only with a complete Build 228 source, priority, an observed-on-Windows reproduction, and a distinct reproduction reference (the original Build 228 source code cannot be reused). An investigation can be scoped from a source-complete blocked/failing report without claiming a successful reproduction.
6. Copy the local-only **Build 229 proposed repair plan** and privately review it. The export includes source identity and missing-evidence gates, not log contents or credentials. Neither triage nor export approves a repair, performs an update, resolves a finding or certifies Windows acceptance.

## Fail-closed gates

| Gate | Meaning |
| --- | --- |
| Build 228 evidence missing | Finding/blocked mark without installed-version, witness, basis, safe reference and timestamp. |
| Build 228 source changed | Evidence reference, case status, basis, timestamp or installed version changed after triage. Owner must re-review before scoping. |
| Owner triage not started / priority needed | No real owner selection yet; no inferred severity. |
| Reproduction evidence needed | A repair proposal lacks a fresh observed reproduction and separate local reference. |
| Investigation/repair candidate — owner scoping decision required | Candidate only; **not authorized**, not independently verified and not repaired. |
| Retest requested / deferred | Remains open. A retest requires a fresh actual Windows observation to close, not this draft. |

Build 228 passes with missing evidence are separately flagged; they do not become repair candidates until an actual failure/blocker is reported. A `not_tested` entry likewise does not imply a defect.

## Privacy, scope, and initial truth

- All state is in-browser for the session. No network import, background probing, storage or device actuation was added. Import never trusts a text handoff as an independent assessor's signature, and the user should never paste addresses, personal data, keys, camera imagery or full logs.
- The authentic Windows Build 228 observations were **not available in source control or the prior owner handoff** when Build 229 was implemented. Therefore its initial on-screen triage is deliberately **zero findings / zero source-linked repair candidates**. Actual source-matched prioritization starts with owner field evidence; the build does not perform speculative repairs.
- Independent on-device acceptance, signed source proof, live six-app authorization and vault security are out of scope. Six-app integration stays **DISCONNECTED / HOLD**, private relay **OFF**, QL-275 **UNDER REVIEW / DEFERRED**, and first-party vault **SECURITY HOLD**.
- Build 230 is only a candidate and must be shaped from genuine Build 229 owner findings; no automatic next repair batch or physical Windows closure is authorized.

## Validation

- `npm run build:229:hub:test` covers default empty state, source-safe import, malformed/tampered handoffs, priority/reproduction gates, stale source invalidation, and no automatic network/device action.
- Web typecheck, web production build, full source regressions and exact-`main` five-job CI must be GREEN for *source promotion*. They do not assert that the household Windows mini-server was updated.
