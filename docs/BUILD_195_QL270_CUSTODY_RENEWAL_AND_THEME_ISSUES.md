# Build 195 — QL-270 original proof-B source recheck, public custody renewal and Standard theme issue resolution (HELD)

30 October 2026 (Toronto) · `RosevearCreations/rosevear-ai-hub`

## Real implementation

1. **Immutable source recheck.** The previous promoted `main` commit was independently read via GitHub API at `4db6746cbb862b5a4b972c918601ef5c6f3ee927`; the original `docs/integration/ql246-source-proof.json` still returned **HTTP 404**, while exact main push CI [41116285506](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41116285506) had conclusion **success**. This is a dated original source observation, not a future proof-B verdict.
2. **QL-270 public renewal UI.** In I.T. → Comms Hub, review only a strict, in-memory, size-bounded public custody/pin status candidate. Fixed schema requires repository, immutable proof-B SHA, two *distinct* 64-hex public digest fingerprints, 200/404 status claim, <10-minute fresh issue/expiry and held owner/gateway/relay fields. Unknown fields, private material, stale or forged approvals are rejected. Raw inputs are cleared after screening. An optional earlier QL-269 proof-B claim is compared for agreement or conflict, but two matching public claims never independently authenticate signer SPKI, cryptographic signature, original custody or a live signed proof file.
3. **Fixed-field HOLD audit.** Export contains no digest values, signature bytes, private role IDs, personal details, credentials, home URLs, or private challenges. Genuine original B retrieval, A→B ancestry, signer/pin, custody roles, tenant isolation, owner TEST-only approval and reversible stop plan remain **NOT VERIFIED/NOT GIVEN**. Authenticated gateway GETs = **0**, private Windows relay **OFF**, conditional slot **HELD/UNSCHEDULED**.
4. **Standard theme issue review.** The real System owner panel is now mounted while moving between actual workspaces, preserving findings during navigation. Each of five cards opens its actual destination (Home, System, Business or Audit). The owner may mark a fixed visual issue category, request engineering follow-up and record an owner-observed local retest; it does **not** assert that software was fixed. Safe session-only report contains fixed categories and explicitly states no independent signature, server persistence or integration authorization. Administrators remain read-only.
5. **Template interpretation.** The supplied generic Workshop Operations UI specification informs a compact topbar shortcut row, responsive dark command-centre cards, preserved left rail, accessible labels, real-source status and actionable drill-downs. No sample products, sales, counts or fictional makers are inserted into the local AI Hub. The existing Standard / High contrast options remain available.

## Actual verification boundaries

| Gate | Build 195 state |
| --- | --- |
| Last independently checked original proof file | **HTTP 404** at Build 194 immutable main SHA |
| Exact Build 194 main CI | **GREEN 5/5** (run `41116285506`) |
| Original signed descendant proof B | NOT VERIFIED |
| Independent custodian / witness / reviewer, genuine pinned signer | NOT VERIFIED |
| Isolated nonproduction contract and per-app credential | NOT VERIFIED / NOT ISSUED |
| Explicit owner TEST-only authorization and approved rollback | NOT GIVEN / NOT APPROVED |
| Live integration traffic and Windows relay installation | 0 GETs / OFF |

This build deliberately does not fetch external source code from the installed Hub, request test credentials, enable device access, alter Home Assistant/MQTT/cameras/vaults, or schedule gateway traffic. A static source CI success does not prove a live Windows installation or an authorized connectivity trial.

## Test and release acceptance

- Focused: `npm run integration:ql270:hub:test`.
- Full web: `npm run web:typecheck`, `npm run web:build`, `npm run web:test`.
- Keep GitHub docs/backend/web/Windows desktop/Windows backup checks GREEN on the reviewed feature PR, `dev` push, promotion PR, and final `main` push.
- Owner still needs to manually exercise the updated installed Hub and record any remaining Standard theme visual issues; synthetic web tests cannot sign off a physical device.

**Next Build 196 — QL-271 Original Proof-B Evidence Return Verification, Independent Reviewer Disposition & Standard Theme On-Device Acceptance (HELD).**
