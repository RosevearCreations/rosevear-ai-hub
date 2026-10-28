# Build 171 — Independent Source Drift Follow-Up Outcome Aging & Owner Evidence Continuity

## Local private operator review

1. Select two **chronological Build 170** private source rechecks for one original held reassignment watch; never regress the linked Build 169 follow-up index.
2. Recompute whether the later Build 170 recheck cites an owner observation **witnessed after the earlier recheck**, plus a distinct later pseudonymous source identity check. Merely re-exporting a receipt or selecting an earlier check cannot renew evidence.
3. Flag repeated 8+ day overdue source checks, missing source, 3+ day and 8+ day earlier recheck aging, changed owner claims and unresolved identity, alias, version or access differences. Confirmed aliases are unverified operator claims, not authenticated device identity.
4. A fixed-category `PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT` note is append-only and permanently HELD. A new record requires a **non-imported later Build 170 recheck**, witnessed installed Windows version, personal comparison and a separate HOLD acknowledgment. Category must be supported by current evidence; no automatic notification, assignment or action.
5. Export full Build 148–171 nested private JSON capped at 6.25 MB. Imported claims reset Windows witness, remain historical and cannot authorize a fresh note. Earlier complete Build 170 receipts compare read-only as strict historical prefixes; no partial snippets or changed old evidence accepted.

## QL-243 secure connectivity handoff

The attached six-app QL-243 document was reviewed. AI Data Platform remains the **sole** gateway and the Hub the local source of truth. A disabled-by-default, strict nonproduction-only HMAC GET boundary is staged in `server/src/rosevear_ai_hub/api/integration_v1.py` for private coarse service health and a single declared `read_service_health` scope. The backend denies revoked, stale, replayed, wrong-source, cross-business/tenant, signature-tampered, mutating and unknown requests. Replay and metadata-only decisions use a persistent private SQLite ledger.

**Do not activate** this boundary without real server-side scoped secrets, explicitly authorized nonproduction HTTPS, gateway registry, out-of-band public-key pinning and independent testing. The QL-243 exact Ed25519 gateway-signed receipt format, gateway durability proof, independent owner identity witness and owner pilot authorization are *not* provided or claimed by Build 171. No `POST /events`, `/commands`, gateway client, customer record, camera/vault access or smart-device action exists here. Refer to `docs/ROSEVEAR_INTEGRATION_CONTRACT_V1_AI_HUB_HANDOFF.md` for precise still-held handoff items.

## Verification and promotion gates

- Focused Build 171 model/UI tests and isolated server QL-243 auth/negative tests.
- `npm run web:test`, `npm run web:build`, `npm run web:typecheck`, `git diff --check`; Python CI jobs also test the backend.
- Feature PR → `dev` independent GREEN → promotion PR → `main` independent GREEN at exact SHA, and matching code trees.
- Actual Windows physical field acceptance, independent reviewer, first-party password/document Vault **0/6 SECURITY HOLD**, gateway handshake and live owner authorization remain separate and unverified.

**Next expected:** Build 172 — Independent Recheck Outcome Exception Recurrence & Owner Continuity Freshness.
