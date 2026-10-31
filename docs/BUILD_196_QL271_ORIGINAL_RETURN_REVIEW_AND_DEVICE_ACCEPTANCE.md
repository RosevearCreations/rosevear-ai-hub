# Build 196 — QL-271 Original Proof-B Evidence Return Verification, Independent Reviewer Disposition & Standard Theme On-Device Acceptance (HELD)

## Real source recheck, 31 October 2026 (UTC)

- Repository: `RosevearCreations/rosevear-ai-hub`.
- Immutable Build 195 `main`: `3845613bb7b7af6bb4fa97fb10b72c2600ba0e84`.
- Source exact-main Actions run: `41150092231` — five of five jobs `success`.
- Original required path: `docs/integration/ql246-source-proof.json` at that immutable SHA: **HTTP 404 / NOT_FOUND** from GitHub contents API.
- Thus the original signed B is **not retrieved**. No descendant/source proof, signer signature, independently pinned SPKI, reviewer custody, authenticated gateway GET, TEST authorization, or local Windows relay may be inferred. Integration remains **DISCONNECTED / HOLD**.

## QL-271 public return screen

The *actual* System → Comms Hub connection I.T. workbench now follows QL-269/QL-270 with the QL-271 original-return review. The form is optional and entirely in memory. It does **not** fetch a remote source, request a token, send a network probe or activate a gateway. Do not paste private signer/custodian/pin receipts, signature bytes, human identities, password material, secrets, challenges, physical addresses or home infrastructure locations.

`rosevear.ql271.public-original-review-return.v1` accepts **exactly 15 public metadata fields**, no more and no less:

| Field | Allowed form |
| --- | --- |
| `schema` | `rosevear.ql271.public-original-review-return.v1` |
| `repository` | `RosevearCreations/rosevear-ai-hub` |
| `observed_main_sha` | exact Build 195 immutable `main` above |
| `claimed_proof_http_status` | integer `200` or `404`, flagged if reported `200` contradicts observed `404` |
| `source_a_commit`, `candidate_proof_b_commit` | distinct, lowercase, 40-hex SHA claims (not verified ancestry) |
| `source_to_b_claim` | `NOT_REVIEWED` / `REVIEWER_REPORTS_DESCENDANT` |
| `signature_claim` | `NOT_VERIFIED` / `REVIEWER_REPORTS_VALID` |
| `pin_claim` | `NOT_VERIFIED` / `REVIEWER_REPORTS_PIN_MATCH` |
| `reviewer_disposition` | `HOLD` / `REVIEW_PENDING` only; never `APPROVED` |
| `reviewer_separation_claim` | `NOT_VERIFIED` / `REVIEWER_REPORTS_INDEPENDENT` |
| `observed_at` | recent integer UTC epoch **milliseconds**, no older than 10 minutes, never future |
| `owner_test_authorization` | exactly `NOT_GIVEN` |
| `authenticated_gateway_gets` | exactly integer `0` |
| `windows_private_relay` | exactly `OFF` |

Size is limited to 4096 characters; extra keys, hidden raw evidence, stale timestamps, malformed values, approval grants, relay activation and GET counts above zero all reject. A well-formed claim is **UNVERIFIED_PUBLIC_REVIEW_CLAIM**, not a verified original B. The sanitized report compares the candidate B to the previous *in-memory public QL-270 claim* (missing/matching/conflicting), retains the independently observed 404 and marks every private/activation gate NOT VERIFIED / HELD.

An independent reviewer must obtain the real original from its authoritative origin, verify source A→B with immutable git object evidence, cryptographically validate the signer and out-of-band SPKI, confirm distinct private human reviewer/custodian roles and tenant isolation, and return custody decisions through an independently approved secure channel. This app deliberately does not claim those actions occurred.

## Real Standard Theme on-device owner observations

The existing System Standard Theme panel now provides real-screen inspection for Home, System, Business and Audit, followed by five tests to be performed on the **physical Windows Hub or an actually connected client**:

1. Real navigation and functional shortcuts.
2. Narrow window and zoom readability.
3. Keyboard operation and visible focus.
4. Source-backed status and honest empty/error states.
5. Reload/reconnect behavior.

First choose a **coarse device category** (local Hub server, remote Windows client or other actual browser). Then record each as not checked / personally observed pass / personally observed fail. The form never reads hostname, IP, serial, user-agent, screenshots, tokens or machine identity. Switching the device category resets all device findings; resetting the session clears them. Administrators cannot report owner findings. The session-only visual report labels full observed passes `OWNER_REPORTED_DEVICE_CHECKS_PASS_UNVERIFIED` and always says `independentlyWitnessedPhysicalAcceptance: NOT_VERIFIED`. A rendered webpage, CI result, or signed-in session cannot validate an actual Windows installation by itself.

## Verification and release boundary

- `npm run web:typecheck`, `npm run integration:ql271:hub:test`, `npm run web:build`, full `apps/web` suite.
- `.github/workflows/foundation.yml` keeps backend, docs, web, Windows desktop and Windows backup job gates plus focused QL-271 regression coverage.
- No server install, Home Assistant/VM, MQTT, cameras, live credentials, signed evidence, owner TEST enablement, outbound action or background probe is part of Build 196.
- Production source CI GREEN must **never** be called an independent on-device test or a released cross-app connection.

Next proposed: **Build 197 — QL-272 Independent Proof-B Publication Recheck, Reviewer Evidence Provenance & Windows Theme Retest Disposition (HELD).**
