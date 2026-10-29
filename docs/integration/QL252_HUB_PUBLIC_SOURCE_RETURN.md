# Rosevear AI Hub — QL-252 six-app source-proof blocker return (HOLD)

**Application:** `rosevear-ai-hub` · **repo:** `RosevearCreations/rosevear-ai-hub`

The source `main` at `4faac87c3ae2e4857066d9b819663d49f133b939` was independently reported by Comms Hub QL-252 to return HTTP **404** on `docs/integration/ql246-source-proof.json` (28 October 2026 Eastern). The historical SHA is Build 178; replace with the verified Build 179 `main` SHA and its **matching** GREEN source CI after promotion.

```text
application_name: rosevear-ai-hub
repository: RosevearCreations/rosevear-ai-hub
source_sha_A: VERIFY LATEST TESTED MAIN AND MATCHING GREEN CI (DO NOT INVENT)
source_ci_run_url: VERIFY ACTIONS RUN WITH head_sha EXACTLY source_sha_A
proof_commit_sha_B: NOT_AVAILABLE
immutable_public_proof_url: NOT_AVAILABLE (QL-252 historical main file check: HTTP 404)
exact_proof_bytes_sha256: NOT_AVAILABLE
public_spki_sha256: NOT_AVAILABLE / UNTRUSTED UNTIL OUT-OF-BAND VERIFIED
out_of_band_custody_receipt_id: NOT_AVAILABLE
distinct_witness_receipt_id: NOT_AVAILABLE
owner_test_decision: NOT_GIVEN
owner_test_receipt_id: NOT_AVAILABLE
actual_gateway_test: NOT_RUN
connection_state: DISCONNECTED
private_runner: NOT_AUTHORIZED
real_original_seven_negative_cases: UNVERIFIED
first_party_password_document_vault: 0/6 SECURITY HOLD
```

Public evidence can be rechecked, **on explicit operator request only**, with:

```sh
npm run integration:ql252:hub:check -- --public-get --main <actual-lowercase-full-main-sha>
```

If a separately authorized real signer and genuine original witnessed denial evidence later exist, publish a distinct **B** descendant of source **A** and invoke the separate A/B public preflight. Never publish signing private keys, HMAC secrets, raw owner identity, LAN IP/hostnames, device data, vault records, customer records or real operator challenge values. This response provides **no** permission to enable any business, Comms Hub, private runner, device, camera, vault or network gateway connection.
