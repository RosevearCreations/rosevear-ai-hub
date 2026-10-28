# QL-245 — Rosevear AI Hub truthful nonsecret source handoff

Companion application: `rosevear-ai-hub` · repository: `RosevearCreations/rosevear-ai-hub`.
This is an **implementation status**, not an actual connection return or signed source/assessor packet.

| QL-245 requirement | Current truth |
| --- | --- |
| Source SHA / five-lane GREEN Actions URL | Check the exact promoted `main` source and current GitHub Actions run; do not substitute an earlier CI run |
| Nonproduction origin and deployed revision | **NOT PROVISIONED / UNVERIFIED**; do not publish local server hostname or IP |
| Business / tenant | `rosevear-ai-hub` / `null` (HMAC canonical tenant `-`) |
| Path/scope allowlist | `GET /health`, `GET /capabilities` beneath `/api/integration/v1`; ordered `read_health`, `read_capabilities` |
| HMAC canonical request | QL-243 twelve-line, timestamp ±5 minutes, nonce replay denied and audited in private SQLite; **off by default** |
| Scoped HMAC key ID / rotation / registry receipt | **NOT PROVISIONED** / **NOT VERIFIED** / **NOT IMPLEMENTED** |
| Ed25519 source signer ID and independent public SPKI SHA-256 pin | **NOT PROVISIONED / UNVERIFIED**; no trusted key registry supplied |
| Actual authenticated source health/capability signed receipts | **UNVERIFIED**; local TestClient fixtures are not service receipts |
| Gateway-signed health/capability/audit ID and independently retrieved datastore proof | **NOT IMPLEMENTED / UNVERIFIED** |
| Seven actual denial outcomes + original trace IDs | **UNVERIFIED**; seven analogous negative scenarios pass only local synthetic source regression tests |
| Six-source QL-245 packet, assessor signature and independent external witness | **NOT IMPLEMENTED / UNVERIFIED**; no canonical signer or independent pins present |
| Distinct owner challenge and pilot approval | **NOT GIVEN** |
| Reversible kill switch/rollback witnessed on real nonproduction deployment | **NOT VERIFIED**; config remains default-disabled |
| Actual connection | **DISCONNECTED / HOLD** |

Public contract metadata only. Do not include HMAC secrets, private signing keys, customer/device data, URLs to private household services, raw audit DB, bearer tokens, OTP or fabricated `np-...` receipt IDs. The revised QL-245 offline verifier cannot establish authenticity merely from a self-signed packet; source and assessor pins must arrive through separate trusted channels.

If a future nonproduction GET test is separately approved, verify real source deployed revision, secure key issuance, the original signed gateway and source records, all seven deny cases and revocation/rollback with an independent reviewer. Only then provide sanitized nonsecret IDs to the Comms Hub QL-245 intake. All four companies and communications remain disconnected until their independent gates and later owner approval.
