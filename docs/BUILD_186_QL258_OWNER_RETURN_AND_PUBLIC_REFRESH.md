# Build 186 — QL-258 Comms Hub owner return intake and exact public source refresh

29 October 2026 · Integration **DISCONNECTED / HOLD**; source software release may be GREEN independently.

## What changed

1. Added **Ql258HubHandoffPanel** to the owner-only Home Operations field-trial workbench, directly after the QL-256 source custody panels. Paste only the QL-258 `rosevear-ai-hub` sanitized JSON copied from Comms Hub's **Six-app evidence & activation HOLD** worksheet. The panel checks the exact fixed QL-258 schema, all seven progress fields, dated source snapshot, tenant exemption and 12 live pilot holds. It rejects other apps, unknown fields, private input, forged approvals, altered source claims and connected status. Its safe result can be copied manually. Input and review are cleared on reload or by the Clear button; no API, database, network or browser storage writes occur.
2. `apps/web/src/ql258HubHandoff.ts` is the strict parser, independent of the Comms Hub codebase. `OWNER_REPORTS_DONE_NOT_VERIFIED` means only an owner-reported action; no source proof, role authentication or Windows service permission is conferred.
3. `scripts/ql258-hub-public-refresh.mjs` is **offline by default**. With explicit `--public-get` and exact current SHA it reads only GitHub's public `main` branch, matching completed GREEN main-push CI and immutable raw proof path, then rechecks that `main` did not move during the check. Missing/mismatched/failed CI, stale SHA and branch drift fail closed. Even HTTP 200 is a *public file candidate*, not original authenticated proof B, valid independent signer pin or TEST authorization.
4. Added synthetic Node proof-fetch regressions and React/parser tests to CI. No runtime config, HMAC key, private Ed25519 key, Worker binding, GitHub secret, Windows startup task or home network setting was changed.

## How we use it

- In Comms Hub choose **Rosevear AI Hub**, mark only actions actually attempted, and copy **sanitized Rosevear AI Hub handoff**. Paste that JSON into Build 186's owner workbench and choose **Review QL-258 status-only packet**.
- The QL-258 immutable source snapshot `99d64047c49678733af762ff906f288ec3ee0bb8` is dated. The previous Build 185 source reached actual `main` `8d6faa77d7a44f8f97cd51d0acd209fe00b2c32c`, with completed GREEN main push CI `40940267518`. Do not silently update the old QL-258 `mainSha` field; request a new independent public check at the *new* source instead.
- Source refresh (only public GitHub, no gateway):

```sh
npm run integration:ql258:hub:check
npm run integration:ql258:hub:test
npm run integration:ql258:hub:check -- --public-get --source <actual-current-main-40-character-SHA>
```

The last command **fails closed** if `main` moved. Its output is source evidence only; a genuine signed A→B proof requires independent private signer custody, an authentic Ed25519 signature, original receipts and a separate trusted pin review. No original QL-246 proof B was created in this build.

## Actual operator decisions still needed

1. Privately assign and independently authenticate the signer custodian, distinct witness and separate reviewer.
2. Approve an app-specific restricted persistent private key store. Authorized operators privately inspect a real signer and provision only if absent; no chat, repository or CI signing material.
3. Independently check the true public SPKI pin and out-of-band witness challenge. A self-reported DONE label cannot substitute.
4. Only after genuine source signing, original audit/denial receipts and independent review consider a separate owner-approved, reversible nonproduction TEST-only window (at most 30 minutes, health/capabilities GET only, no writes). The proposed Windows mini-server remains off.

**No new variables or bindings are required. Owner TEST NOT_GIVEN. Twelve live pilot holds remain. Integration DISCONNECTED / HOLD.**
