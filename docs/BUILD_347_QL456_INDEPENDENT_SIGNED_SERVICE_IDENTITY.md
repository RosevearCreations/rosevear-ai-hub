# Rosevear AI Hub Build 347 / QL-456 — independently negotiated service identity

## Protocol 1.1 without seven-app lockstep

AI Data Platform Build 408 establishes **1.1 additive, backwards compatible with 1.0**. This Hub implementation never requires YW, iCamp, or AI Data Platform to deploy concurrently, especially while Vercel quotas are exhausted.

- `negotiate347`: exact capability allowlist; 1.1 preferred when advertised; 1.0 remains usable for the original adjacent read-only governance route. Unknown, incompatible or unavailable peer capability is held **without blocking unrelated local Hub activity**.
- Direct, read-only `devilndove` and `rosiedazzlers` health routes are allowed separately to/from each of three Masters **only under 1.1**. No customer/order/payment/booking payload, no cross-tenant access and no physical receiver authority.
- `Registry347`: separate public Ed25519 key per independently enrolled peer, protected pin digest, key ID, 90-day maximum validity, 24-hour maximum key-generation overlap and immediate revocation cut-off. No raw secret sharing.
- `verify_readonly_delivery347`: strict signed issuer/audience/method/path/body-digest, sender-bound trusted TLS identity, 300-second maximum freshness, exact capability and read-only status body, fail-closed on mismatched keys, expiry or unsupported versions. `NonceLedger347`: protected SQLite WAL/FULL atomic nonce + message-ID replay prevention.
- No untrusted public HTTP enrollment route, generic dispatcher, live sender/receiver client, automatic key generation, DNS claims or network event publishing. The target path in the contract is **not mounted**. TLS peer facts and protected public pins MUST come from a separately configured real authenticated transport adapter, never from user-supplied JSON.
- No peer database replication, breaking 1.0 migration, or app-to-app release coupling. Existing Build 346 mailbox remains intact.

## Acceptance / production truth

Python security tests cover a signed 1.1 business->Master event, a genuine signed 1.0 adjacent governance request, fallbacks, tamper, revocation, replay, key pin, TLS and payload restrictions. They establish **source readiness**, not live CONNECTED delivery.

**Current incident is OPEN, receiver physical OFF is UNKNOWN, T5 activation DENIED and all remote link assertions HOLD** until independent original-host and peer runtime evidence is presented. Code CI GREEN is not physical deployment or live transport verification.

## Owner release boundaries

This build changes **Rosevear AI Hub only**. AI Data Platform Build 408 is an external referenced policy; YW and iCamp remain unchanged, with their Slave Shell labels and individual themes preserved. All three Masters retain the shared Master Instrument target; this Hub build makes no cross-repo theme changes. No seven-repo synchronized releases required.

After Build 347, next proposed **Build 348 / QL-457**: approved local TLS transport adapter integration, enrolled peer pin custody, per-capability independent runtime health and operator-verifiable delivery/ACK pilot, without remote original-host control.
