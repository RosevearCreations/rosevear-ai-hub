# Build 130 — Independent Windows Vault Security & Owner Acceptance Protocol

**Review-only release. No Windows installation, operational vault, account enrollment, private files, credential intake, MFA, backup or recovery.** The Hub's source build may be GREEN while the first-party vault remains **SECURITY HOLD**. Build 130 creates a protocol for future independent assessment and owner-observed disposable-data acceptance; it does not execute, sign or complete that protocol.

## Scope and authority separation

| Evidence class | Who can produce it later | Authority today |
| --- | --- | --- |
| Source tests / GitHub CI / Windows executable build | GitHub CI | Verifies changes compile/test; **not** local Windows acceptance |
| Independent design/source/dependency audit | Security reviewer independent of implementer | **Absent**; cannot be simulated by a checkbox or Hub owner/admin role |
| Installed binary, service identity, private origin and ACL evidence | Reviewer and owner on the actual Windows host | **Absent**; no vault service is installed |
| Negative session/MFA, document, backup and rollback exercise | Supervised disposable-account pilot after separate authorization | **Not performed**; Build 129's ledger is hypothetical |
| Owner's final field disposition | Household owner after reviewing all independent findings and observations | **HOLD**; no signoff collected by Hub or source repository |

The future acceptance packet must bind an exact reviewed source commit, dependency inventory, verified Windows executable hash, Windows host identity *without publishing private network or personal identifiers*, the independent review revision, observation times, named accountable witnesses **stored privately outside Hub** and any unresolved findings. Evidence tampering, environment drift and failed or missing tests invalidate earlier review. There is currently no signing, trusted timestamp or attestations infrastructure; no feature in this build claims otherwise.

## Eight mandatory future field gates

1. **Independent application and cryptography review:** independently examine first-party source, pinned dependencies, AES-GCM context/nonce policy, future approved KDF, identity, WebAuthn, file pipeline, key custody, backup/recovery design and negative tests. Resolve findings before a pilot.
2. **Verified Windows build provenance:** pin review to exact Git commit, reproducible/artifact provenance as applicable, reviewed Windows executable, verified package/dependencies and a controlled update/rollback process. CI GREEN cannot substitute for examining the installation.
3. **Dedicated Windows process and ACLs:** prove a least-privilege process identity, private restricted storage, no inherited Hub privileges, protected logs and correctly scoped service permissions; independently inspect startup/shutdown and reboot behaviour.
4. **Private HTTPS, LAN and Tailscale:** on real devices, verify trusted private origin and certificate, no public inbound forwarding, properly restricted firewall, limited remote peer identity and no Hub cookie reuse.
5. **Separate household identity and step-up MFA:** exercise each independently authorized account, real factor failure, session revocation, recovery denial and owner-privilege boundary without any real household credentials.
6. **Client lock and leakage resistance:** check idle lock, stolen/lost device, clipboard/autofill boundaries, browser persistence and no plaintext in Hub logs, Knowledge, AI, backups, error reports or diagnostics.
7. **Disposable documents, backup and independent anti-rollback witness:** reject active content and forged chunks; validate complete encrypted backup, invalid manifest, changed owner and old snapshot; demonstrate that an actually independent trusted version witness survives server rollback.
8. **Owner-supervised Windows disaster acceptance:** separately authorized owner/reviewer observe offline or failed service, power interruption, reboot, stolen device, revoked account, negative MFA, recovery and LAN/remote restrictions. Unknown or failed results remain HOLD.

## Order of future approvals

1. Commission independent security review of the actual implementation and selected libraries. An audit cannot be waived by a green workflow or an owner checkbox.
2. Review findings and select a supported independent version witness, durable commit, backup and emergency recovery designs. Reject any co-located checkpoint that can be rolled back with the ciphertext.
3. Obtain a separate owner decision to install a disposable-data Windows pilot. Do not stop/replace the existing Hub or alter Home Assistant, Caddy, cameras, Ollama or automatic startup as part of this source-only release.
4. On the real Windows machine, validate the exact build, isolated process/ACLs, protected network path, vault identity and MFA. Use dedicated disposable accounts and invented documents only.
5. Record positive **and** negative field observations, incident/recovery runs and security findings, with evidence sealed in an appropriate privately controlled review location. Re-run after any relevant drift.
6. Only after independent sign-off, owner witnessed results and a **new explicit authorization** may a later build propose production deployment or real secrets. Build 130 has **no** code path to do so.

## Implemented synthetic boundary

- `vaultWindowsAcceptanceProtocol.ts` lists the eight review gates and six denial scenarios as public guidance; `assessVaultWindowsAcceptance` returns fixed HOLD/disabled status regardless of forged approval claims.
- `inspectSyntheticWindowsEvidence` accepts a deliberately invented, bounded `DISPOSABLE_SIMULATION` packet with exactly eight known control IDs, an explicit synthetic provenance token and `PASS`, `FAIL` or `NOT_OBSERVED` outcomes. Missing, duplicate, unknown, tampered or additional owner/reviewer/personal fields are rejected. Even eight synthetic passes yield **COMPLETE_SYNTHETIC_CHECKLIST_ONLY**, never owner security acceptance.
- Unit tests exercise forged signoff, drift, synthetic incompleteness, duplicate/missing controls, added secret fields and fail-closed status. There are no file APIs, network calls, trust signatures, receipt persistence, upload widgets, browser credential forms or runtime vault endpoints.
- The authenticated Vault page displays an expanded circled-i explanation, review gates and negative cases without accepting an audit report or real field observations. No field proof is stored or fabricated.

## Stop conditions

Missing audit; unreviewed library or live cryptography; unsigned/unpinned installed binary; broad service ACL; exposed origin; Hub-cookie authentication; disabled MFA; plaintext leakage; missing independent rollback witness; failed backup; revoked-user bypass; absent owner observation; changed release identity; or any unknown result **must** prevent production vault use. Reports and CI logs must omit passwords, key material, token values, private files, recovery secrets and personally identifying observations.

## Primary references

- [NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final): planning and independent technical assessment methodology.
- [OWASP Application Security Verification Standard 5.0](https://asvs.owasp.org/): application verification requirements for future independently testable implementation.
- [Microsoft Service Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights): Windows service access controls and risks of granting excessive permissions.
- [NIST SP 800-34 Rev. 1 — Contingency Planning](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final): recovery exercise and plan maintenance principles.
- [Build 129 recovery ledger and co-rollback limitation](BUILD_129_DOCUMENT_RECOVERY_LEDGER.md), [Build 125 threat model and candidate libraries](BUILD_125_VAULT_THREAT_CRYPTO_REVIEW.md), [Build 122 field test foundation](BUILD_122_VAULT_SECURITY_WINDOWS_ACCEPTANCE.md).

**Next direction:** owner may commission independent review and authorize a distinct, isolated disposable Windows pilot after the prerequisite implementation has been secured. No later build number alone grants that authority.
