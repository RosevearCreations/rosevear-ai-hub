# Build 192 — QL-267 original public custody decision intake, source UI export and TEST-only gate (HELD)

30 October 2026 (Toronto) · **Production software CI is independent of integration DISCONNECTED / HOLD.**

## Delivered

1. Added `apps/web/src/ql267HubEvidence.ts`: a strictly in-memory intake of the **original sanitized public QL-264 decision-status** schema. It checks exact field names/order, the correct Rosevear AI Hub identity, a 15-minute bounded public status window, distinct opaque custodian/witness/reviewer references, exact approved enums and `NOT_GIVEN` / `NOT_RUN` / relay-OFF gates. An absent packet stays `NOT_RECEIVED`; unknown/private/invalid/replayed claims are `REJECTED_UNTRUSTED_OR_MALFORMED`.
2. The intake is intentionally **not** an authenticator. A `REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND` field remains a public report only. The source's original custody, separate human nonce witness, independent reviewer, real signer store/key, genuine SPKI pin and authentic source proof B still require separate authorized private verification.
3. The existing **I.T. · Rosevear Comms Hub connection** panel now permits local paste, **Validate and prepare sanitized Hub handoff (offline)**, **Copy sanitized Hub handoff**, and **Clear in-memory handoff**. The pasted text is cleared immediately after validation; the fixed-field export omits all opaque role receipt IDs, raw input, personal data, key/store information, credential material and private endpoint detail. It is shown as selectable text if the browser denies clipboard access. No data is automatically transmitted or persisted.
4. `makeQl267HubSafeHandoff` returns only fixed public status words, the last verified **historical** source SHA / CI / original proof HTTP status, source SHA as an **unverified claim**, and twelve unchanged live-pilot holds. It refuses any trust upgrade: no owner TEST-only permission, nonproduction slot, authenticated GETs or relay installation.
5. Added source parser/UI regressions for absent/valid/unsafe public returns, secret-field rejection, role-ID collision, expiration, malformed grants, offline export/clear and the previous QL-264 no-network preview. CI verifies these through the existing web tests/type check/build. No real home system is contacted.

## Original public source facts before Build 192

| Item | Dated 30 October 2026 observation |
| --- | --- |
| Previous immutable source `main` | `9d0536a54fbe3024851efa1f600d4a302d0c0d01` |
| Exact completed successful `main` push CI | [Run 41073975078](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41073975078) |
| Original `docs/integration/ql246-source-proof.json` at prior SHA | **HTTP 404** |
| Original QL-264 public custody decision packet | **NOT_PROVIDED** |
| Actually authenticated custodian, separate witness and independent reviewer | **NOT_VERIFIED** |
| Actual restricted persistent signer and out-of-band signer SPKI pin | **UNKNOWN / NOT_VERIFIED** |
| Actual signed original proof B and source A→B independent approval | **NOT_AVAILABLE** |
| Verified isolated nonproduction source identity | **NOT_VERIFIED** |
| Separately authenticated owner TEST-only authorization | **NOT_GIVEN** |
| Authenticated private gateway GETs / real denial receipts | **NOT_RUN** |
| Windows mini-server Comms integration relay | **NOT_INSTALLED / OFF** |

The historical source SHA above must **not** be presented as the later Build 192 `main` SHA. Check the final immutable production SHA, exact CI and original proof again once promoted.

## How we use it

1. In the Hub interface, open **I.T. → Rosevear Comms Hub connection**. Do not paste anything unless a genuine *sanitized public status* was returned through an approved process.
2. Choose **Validate and prepare sanitized Hub handoff (offline)**. Copy only the fixed nonsecret output with **Copy sanitized Hub handoff**; if clipboard access is unavailable, manually select its visible JSON. **Clear in-memory handoff** removes that panel's current raw/status export.
3. Give the resulting public source disposition to the Comms Hub QL-267/QL-268 evidence review. It does not fit, imitate or replace the Comms Hub **six-app** QL-266 owner walkthrough packet; it is a distinct **one-source** status export.
4. Separately authenticated source operators must still privately appoint real human custody roles, verify actual private signer existence/store and independent public pin, then publish genuine QL-246 signed proof A→B for external review. Do not publish generated test keys, fake signed receipts or real names.
5. Only after private verification and separate explicit owner TEST approval may reviewers consider a maximum 15-minute, 9-read-only-GET isolated nonproduction test with genuine denial evidence and tested rollback. **This build does not schedule or execute it.**

**No secrets, Supabase variable, home IP, tunnel, Windows task, gateway credential, calls, SMS, dispatch, camera or vault actions are changed.**

Next proposed **Build 193 — QL-268 Original Signed Proof-B Publication Exception Review, Nonproduction Isolation Evidence & Conditional GET Slot HOLD Audit**.
