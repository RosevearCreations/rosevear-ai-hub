# Build 199 — QL-274 Immutable Source Publication Exception Renewal, Custodian Return Witness Reconciliation & Windows Owner Follow-Up Retest Audit (HELD)

## Real immutable original source recheck

On 31 October 2026 UTC, queried GitHub at exact promoted Build 198 `main` `29e1fbe490c020efd34d598c080a7da72c9bffd5` for `docs/integration/ql246-source-proof.json`. GitHub returned **HTTP 404 / NOT_FOUND**, while the [matching main workflow 41160623174 passed 5/5](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41160623174). A GREEN source build does not sign or publish the original. The human signer, key/ancestry, independent custodian, out-of-band pin challenge and any actual Windows field witness remain **NOT INDEPENDENTLY VERIFIED**.

No private relay is installed or activated; owner TEST-only authorization NOT GIVEN, authenticated gateway GET count **0**, conditional GET window unscheduled and integration **DISCONNECTED / HOLD**.

## Real System I.T. interface: QL-274 public-return reconciliation

The existing QL-271→QL-273 evidence disclosures remain intact, with QL-274 as a further collapsed-by-default disclosure beneath the origin/custody action ledger. The screen gives direct manual GitHub links to the immutable original and its matching CI. No internal API or auth gateway GET is invoked.

Sanitized public metadata screen accepts only exact JSON shape (14 keys, max 4096 characters), never a signed original or private return:

| Key | Permitted value |
| --- | --- |
| `schema` | `rosevear.ql274.public-custodian-return.v1` |
| `repository` | `RosevearCreations/rosevear-ai-hub` |
| `observed_main_sha` | `29e1fbe490c020efd34d598c080a7da72c9bffd5` |
| `original_proof_path` | `docs/integration/ql246-source-proof.json` |
| `claimed_original_http_status` | `200` or `404` (reported 200 contradicts independently observed 404) |
| `candidate_b_sha` | lowercase 40-hex public B claim; compared with QL-272 session claim |
| `public_return_digest` | lowercase 64-hex public fingerprint (shape-screened, never exported) |
| `reported_signer_custody` | `NOT_ATTESTED` or `REPORTED_RETURN_SENT_PRIVATELY` |
| `reported_reviewer_separation` | `NOT_ATTESTED` or `REPORTED_SEPARATE_ROLES` |
| `reported_pin_witness` | `NOT_ATTESTED` or `REPORTED_PRIVATE_WITNESS` |
| `observed_at` | integer epoch milliseconds, now or no older than 10 minutes |
| `owner_test_authorization` | exactly `NOT_GIVEN` |
| `authenticated_gateway_gets` | exactly integer `0` |
| `windows_private_relay` | exactly `OFF` |

Raw input is cleared after screening and is not sent to a server. Any extra key, stale/future claim, invalid digest or SHA, unauthorized owner TEST, nonzero GET or enabled relay is rejected. Output is a fixed-field HOLD exception with independent source 404, public B comparison and *reported-only* witness flags; no raw data, private receipt, pinned key, digest or human identity is certified. Even a matching public claim cannot satisfy independent signature or custodian proof.

## Real Standard Theme: owner retest change audit

The existing five on-device checks, failed-check retests and engineering follow-up selectors remain. Build 199 adds a **Capture owner retest baseline (local)** button enabled only for an owner on a selected Windows Hub or Windows client with a previously failed check. After capture, changing an affected retest or follow-up produces per-check transition summaries. The normal owner handoff report includes the bounded before/after statuses and changed-count; nothing goes to a backend or a credential vault.

Changing device category or an original observation clears the baseline. A non-Windows device, administrator role or absence of failed checks cannot record a Windows baseline. The comparison cannot prove actual installation, engineering repair, independent Windows witness or signed acceptance; all remain NOT VERIFIED regardless of owner-reported improvement.

## Validation and next blocker

Run `npm run web:typecheck`, `npm run integration:ql274:hub:test`, `npm run web:build`, full web regressions and the five-job GitHub CI on feature, `dev`, production PR and immutable `main` push.

**Specific next external action:** authorized original signer must publish the genuine signed Proof-B at the agreed exact immutable path, deliver genuine A→B ancestry and complete independent private reviewer/custodian and out-of-band SPKI pin verification. Only after those checks and separate TEST-only owner authorization can a bounded isolated nonproduction GET window be considered. The actual Windows machine still needs an owner retest and independent witness.

Next proposed: **Build 200 — QL-275 Original Proof-B Arrival Verification, Independent Witness Exception Closure & Windows Owner Retest Follow-Up Review (HELD).**
