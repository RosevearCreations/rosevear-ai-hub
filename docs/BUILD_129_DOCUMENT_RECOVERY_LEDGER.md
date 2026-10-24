# Build 129 — Document Recovery & Anti-Rollback Ledger Design

**Architecture and disposable simulation only.** The first-party Windows vault has no installed service, independent identity, real document intake, MFA, durable version witness, encrypted backup or recovery endpoint. This release cannot restore anything. Source CI success is **not** production vault security acceptance.

## What the synthetic tests demonstrate

`apps/web/src/vaultSyntheticRecoveryLedger.test.ts` holds every helper inside a Vitest-only module. It uses invented household/document IDs, fictitious envelope labels, revision numbers and volatile in-memory Maps. No persisted cryptography, real files, credentials, browser storage, network or file API is involved. There is **no trusted checkpoint**: the test Map is explicitly a teaching proxy for a future independent witness.

| Hypothetical test | Expected result |
| --- | --- |
| Complete snapshot exactly matches a supplied witness | Simulated match, **not** approval to restore |
| Earlier complete, authenticated envelope | Deny stale revision |
| Same revision with different envelope | Deny conflicting version/fork |
| Snapshot advertises a revision beyond the witness | Deny unverified future revision |
| Missing witness or wrong owner/document scope | Hold for independent verification |
| Incomplete snapshot | Deny recovery |
| Consecutive new revision with exact previous receipt | Simulated compare-and-swap advance only |
| Two writers use the same predecessor | First advances in simulation, later stale proposal denied |
| Skipped/decreased revision, reused envelope ID | Deny |
| Crash before version witness update | Future snapshot not yet witnessed and denied |
| Crash after witness advance but before complete snapshot availability | Incomplete snapshot denied; future design must enforce real atomicity |
| **Both original ciphertext and local witness rolled back together** | **Old data is falsely accepted.** The simulation deliberately proves a co-located mutable ledger is insufficient. |

The Build 128 tests already show that AES-GCM authenticated decryption succeeds again for an intact old envelope. These Build 129 tests show one *possible policy shape*, and specifically where it fails if the supposed witness can be rolled back. They do not implement or select a security-certified logging, signature, transparency, monotonic hardware counter or storage system.

## Design decisions requiring independent review

1. **Trust anchor ownership:** independently protected, current owner-held version evidence that a stolen/restored Windows server cannot silently rewrite. Decide availability, anti-fork verification and offline failure mode. A checksum, local Map, timestamp, ordinary database or a backup of the ledger together with the ciphertext does not meet this requirement.
2. **Atomic commit protocol:** how encrypted manifest, durable owner/document mapping, predecessor receipt and independently witnessed head advance are ordered; how conflicts, power loss, partial writes and rollback are reconciled without exposing plaintext.
3. **Recovery safety:** verify all chunks, complete manifest and authenticated metadata, checkpoint freshness, legitimate owner/household rights and cryptographic authenticity before restoring. A stale but intact backup must not silently become authoritative.
4. **Backup key custody:** independently encrypted, tested offline copies and backup device/recovery materials. Avoid a Hub admin override or machine-local plaintext master key, and plan for key loss, changed Windows ACLs and lost MFA factors.
5. **User experience and privacy:** explicit preview of non-sensitive revision/backup ages and risk; no plaintext titles, filenames, secret values, keys or MFA seeds in Hub alerts, Knowledge indexing, AI chats or logs.
6. **Field verification:** independent security assessment plus owner-supervised Windows tests for device theft, ransomware/co-rollback, expired/revoked member access, concurrent writes, power interruption, offline restore, Windows reboot and LAN/Tailscale restrictions, all using disposable accounts only.

## Implemented source boundaries

- `vaultRecoveryLedgerReview.ts` is a pure, read-only policy/description module. Forged approval flags never enable a service, document intake, backup, MFA or restore.
- `VaultArchitectureView.tsx` displays six review gates, six denial scenarios, circled-i contextual explanation and prominent **RECOVERY OFF / HOLD** state; it has no recovery form, file picker, upload, activation control or network path.
- All simulated reconciliation logic is in a `.test.ts` file, not imported into shipped Hub assets. There is no new npm dependency or crypto library selection.

## Primary references

- [RFC 9162 — Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162.html) — example of an append-only transparency-log model with consistency proofs; **not** an approved implementation for this vault.
- [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html) — explanation of real transactional crash-atomicity considerations; no SQLite vault store is installed.
- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) — contingency planning, recovery strategy and test exercises.
- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto/) — authenticated encryption does not itself provide a trusted version witness.
- [Build 128 synthetic document integrity tests](BUILD_128_SYNTHETIC_DOCUMENT_PIPELINE.md), [Build 127 separate service boundary](BUILD_127_VAULT_SERVICE_IDENTITY_BOUNDARY.md).
