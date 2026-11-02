# Build 226 — First-Party Local Vault Security Design Decision Gate

## Release boundary

Build 226 is a **decision and independent-review packet**, not a password vault, vault installation, credential migration, MFA implementation or owner-approved Windows pilot. The existing Vault section presents three direction choices and six security review questions. Selections and reading checkmarks live in React component memory only: no API, persistence, network request or secret input is added.

All six independent release milestones remain **0/6 independently verified / SECURITY HOLD** regardless of the direction chosen, review progress or a fabricated source/reviewer claim. Only a separately authorized implementation, genuine external assessment, remediation and owner-witnessed Windows field test could change that state.

## Decision alternatives

| Direction | Advantages | Burdens | Safe next action |
| --- | --- | --- | --- |
| First-party Windows-local vault (existing preferred concept) | Local control, individual household keys, tailored document workflow | We own the security lifecycle, patching, encrypted backup, factor recovery and independent security audit | Commission an independent threat-model and design review; implement only with disposable test data under separate authorization |
| Independently reviewed existing keeper | Mature client, credential handling and security updates may be available | Check current license, MFA, offline export, recovery, self-hosted edition, Windows/Tailscale compatibility and real external audits | Evaluate vendor documentation and test disposable accounts only; no migration |
| Defer | No new service or custody risk | Continue external password manager and existing recovery procedure | Keep first-party vault off until owner reprioritizes |

These are tradeoff categories, **not vendor endorsements or final approval**.

## Threat and control requirements for independent assessor

1. Stolen Windows disk, malware, compromised Hub admin, stolen browser session, tampered backup and revoked family account must not disclose encrypted records. Each household member needs independent vault identity and client-held keys. Hub roles never grant vault decryption.
2. A maintained, independently reviewed authenticated-encryption library and memory-hard password KDF must protect stored bytes and sensitive metadata. Review threat model, key lifecycle/rotation, nonces, document chunks, side channels and denial tests; do not invent cryptography.
3. FIDO2/WebAuthn passkeys or hardware keys, step-up, lost-factor handling and emergency recovery need *actual* enforcement and explicit negative tests. A checkbox or simulated factor is not live MFA.
4. The future Windows vault must be isolated from the Hub/Knowledge/AI/Secrets process, service identity, database, audit channel and private HTTPS origin. Independently inspect Caddy, firewall and Tailscale ACLs on the real server; never enable public forwarding by default.
5. Recovery must fail closed for missing keys, corrupted backups, revoked devices, partial restoration and rollback of both data and a co-located ledger. Restore only into empty isolated disposable directories; verify against an independent monotonic version witness and preserve the previous installation.
6. Commission an independent assessor of pinned source, pinned dependencies, exact Windows artifact, review logs and negative tests. Close high/critical findings with independently retested evidence, then separately request owner permission for a disposable-data Windows pilot.

## Release and acceptance evidence

- Source CI: web/desktop/backend/docs/Windows backup jobs must pass feature → dev → main. Passing does not count as any of the six independent vault milestones.
- First-party implementation: **NOT BUILT**; Windows vault runtime: **NOT INSTALLED**; cryptography: **NOT APPROVED**; independent assessor: **NOT COMMISSIONED**; independent findings closure: **NOT OBSERVED**; owner field trial: **NOT AUTHORIZED**.
- Live passwords, private documents, MFA, real backup/restore, family sharing and private relay: **OFF**.
- QL-275: **Under Review / Deferred**. Six-app integration: **DISCONNECTED / HOLD**.

## Verification

`npm run build:226:hub:test` checks no fetch, no secret fields, accessible selection, local reset, all-six-review-but-still-zero-verification, and forged evidence denial. Existing vault architecture and security regressions remain in the test gate.
