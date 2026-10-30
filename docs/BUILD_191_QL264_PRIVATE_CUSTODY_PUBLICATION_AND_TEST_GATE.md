# Build 191 — QL-264 authentic private custody decision, public signed-proof audit and reversible TEST-only gate (HELD)

30 October 2026 (Toronto). **Source production CI can be GREEN while integration is DISCONNECTED / HOLD.**

## Source-side work implemented

1. Added `scripts/ql264-hub-custody-proof-readiness.mjs`, an offline, strict, nonsecret original public decision-return inspector. It requires exact schema and fixed status vocabulary, distinct opaque custodian/witness/reviewer references, an immutable audited source SHA A, a <=15-minute return window and unaltered `NOT_GIVEN` / `NOT_RUN` / relay-OFF controls. An optional independently recorded SHA-256 compares the **public bytes only**; it does not certify a real person.
2. Any `REVIEWER_REPORTS_*` value is expressly treated as an **untrusted claim**. No dashboard, signed public metadata, self-reported custody/store/pin or code test may certify real private key existence, an authenticated witness or an authorized reviewer. Actual private names, keys, key-store paths, home network information and personal records are excluded from the return format.
3. Added opt-in, **public GitHub-only** original proof-B freshness audit using the existing QL-263 exact source A → B ancestry, exact current `main` source-push CI, stable `main` and immutable original proof GET. Both HTTP 404 and HTTP 200 preserve the private signer-signature/pin and source-proof acceptance HOLD. This audit is not the actual private reviewer decision.
4. Added a fixed local-only reversible TEST plan: GET health/capabilities, proposed <=15-minute and <=9-GET upper bounds, seven planned denials, explicit private approval and stop/rollback prerequisites. It executes **zero network requests**. The seven QL-264 planning denials are not substitutes for the separate canonical QL-246 signed-proof negative-test evidence.
5. Updated the existing QL-265 Hub **I.T. · Rosevear Comms Hub connection** panel with QL-264 HOLD wording, an optional TEST-plan preview, and explicit unverified private custody / proof status. The other local checker still makes zero requests, does not unlock activation, and cannot install a relay.

## Actual pre-build observation

| Public item | Checked result |
| --- | --- |
| Previous immutable `main` SHA | `8faeafbfe72339a26319361ad204819e48927304` |
| Exact completed GREEN `main` push CI | [41066140153](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41066140153) (five passing checks) |
| Original `docs/integration/ql246-source-proof.json` at that SHA | **HTTP 404** |
| Original QL-258 owner packet | **NOT_PROVIDED** |
| Actual private custody/nonce witness/reviewer decisions | **NOT_INDEPENDENTLY_AUTHENTICATED** |
| Genuine source proof B + independent original signer public pin | **NOT_AVAILABLE / NOT_VERIFIED** |
| Isolated actual nonproduction source host/identity | **NOT_VERIFIED** |
| Owner separately authenticated nonproduction TEST-only authorization | **NOT_GIVEN** |
| Genuine authenticated gateway GETs and seven denials | **NOT_RUN** |
| Windows mini-server private integration relay | **NOT_INSTALLED / OFF** |

All source SHAs and HTTP statuses are **dated snapshots**, not predictions of newer commits. Recheck final `main` exactly after deployment. Do not publish fake proof B, artificial signatures or simulated human attestation to satisfy CI.

## Safe operator usage

```bash
npm run integration:ql264:hub:check
npm run integration:ql264:hub:test

# Only if an original sanitized public status report was genuinely returned
npm run integration:ql264:hub:check -- --public-decision <sanitized-status.json> --source-A <audited-source-A-sha> --public-decision-sha256 <separately-recorded-public-digest>

# Separate explicit PUBLIC GitHub inspection only, after real source A / proof B are known
npm run integration:ql264:hub:check -- --public-get --source-A <audited-sha-A> --proof-B <actual-descendant-sha-B>
```

No real signer, owner TEST consent, home device access, relay installation, new tunnel, background task, secret store, credentials or real gateway GETs are created by these commands. A private authorized operator and independent reviewer must separately handle original human/source evidence and any future owner-approved test.

**Production software promotion does not override the integration HOLD.**

Next proposed **Build 192 — QL-267 Original Custody Decision Return Intake, Source Connection UI Evidence Export & TEST-Only Authorization Guard (HELD)**.
