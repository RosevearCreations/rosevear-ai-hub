# Build 185 — QL-257 six-app owner status review and private witness challenge renewal (HELD)

29 October 2026. A source release can be **Production GREEN** while the six-app integration remains **DISCONNECTED / HOLD**.

## Implemented

- Added `scripts/ql257-hub-checkpoint.mjs`: offline, strict six-app intake of **status words only**. The tool rejects missing apps, unexpected fields, personal details, secret values, an apparent owner TEST approval, connected status, and unapplicable nonproduction tenant assertions.
- The checkpoint output identifies which operator tasks still need human attention for each source. It always says the words are *operator-stated, unauthenticated by this tool*; even all reported `ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED` roles cannot establish actual independent identity, signer possession, pin origin or original receipt provenance.
- Optional public-only QL-256 witness-envelope check reuses Build 184 cryptographic validation. A valid, fresh mathematical signature returns `CURRENT_LOCAL_ED25519_MATCH_ONLY`; an expired, altered, absent or malformed envelope returns `REJECTED_RENEW_WITH_FRESH_PRIVATE_CHALLENGE`. It never issues or signs a challenge, publishes proof B, installs a relay or grants permission.
- Added status, secret-rejection, role/tenant, denied-authorization and expired/forged signature regression tests to the existing foundation CI job.

## Operator commands (offline)

```sh
npm run integration:ql257:hub:check
npm run integration:ql257:hub:check -- --template
npm run integration:ql257:hub:check -- --checkpoint /path/to/nonsecret-status-only.json
npm run integration:ql257:hub:check -- --checkpoint /path/to/nonsecret-status-only.json --public-witness-envelope /path/to/public-witness-envelope.json
npm run integration:ql257:hub:test
```

Use `--template` to produce a JSON skeleton; change only the documented status words after the accountable human private checks. No real names, contact channels, secret store addresses, private or public key contents, HMAC credentials, tokens, passwords, original challenge contents, home IPs or host details belong in this packet. A public fingerprint can be compared by an independent reviewer outside the tool; the checkpoint accepts only `VERIFIED_OUT_OF_BAND` status, not a fingerprint claim.

## Observed source baseline and evidence limits

- Before Build 185, public `main` source was `99d64047c49678733af762ff906f288ec3ee0bb8`; matching completed GREEN main push CI run `40931269060` (29 October 2026). This is only a public source baseline, not a signed proof B.
- QL-257 owner handoff reported the original `docs/integration/ql246-source-proof.json` HTTP 404 on six app-specific earlier main commits. This build does not recharacterize those checks as current source proof, nor manufacture an original signed artifact.
- As of this build, the Rosevear AI Hub signer is `SIGNER_STATUS_UNKNOWN`. The real private custodian, distinct independent witness, separate reviewer, restricted key host, verified public pin and original receipts were **not authenticated** by this work.
- The user's pasted six-app statuses are a handoff, **not** a completed owner checkpoint or separate TEST consent. Authentic nonproduction test, exact GETs/seven denials and publication of canonical signed QL-246 proof B were **NOT RUN**.

## Owner's next nontechnical decision

Privately appoint and authenticate each app's key custodian, independent witness and separate reviewer; approve each app's restricted persistent key store. Those people privately determine whether a real Ed25519 signer exists and independently check its public SPKI pin. Yard Workers and iCamp also require actual isolated nonproduction tenant verification. Return only the status words in the QL-257 template. No secrets or private names are needed in the return.

Only after separate independent review of authentic original evidence may the owner consider a **separate**, specifically authenticated nonproduction TEST-only approval (one scoped tenant; <=30 minutes; private read-only GET health/capabilities; independent rollback). That later decision is not made in this build. The proposed Windows 24/7 relay stays uninstalled/off; no source keys are added to Vite, Cloudflare, GitHub Actions or static build variables.

**Connection: DISCONNECTED / HOLD. Owner TEST: NOT_GIVEN. Proof B: NOT_AVAILABLE. Relay: OFF.**
