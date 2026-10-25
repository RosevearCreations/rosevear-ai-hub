# Build 131 — Independent Vault Security Findings & Remediation Triage

**Status: planning and invented-data tests only.** Build 130 defines the independent assessor/Windows owner acceptance protocol. Build 131 prepares a narrowly scoped findings and retest model; it does **not** create real findings, engage a reviewer, install a Windows vault, produce an attestation or authorize secret/document entry. Hub source CI GREEN must never be read as independent vault safety approval.

## What independent review must cover

The first-party password/document vault remains an architecture, not an installed protected service. A future independent review must pin the exact released source and dependency set; validate client-side cryptographic/key boundaries, individual household identity, real MFA, locked clients, ciphertext-only Windows process, private HTTPS/Tailscale access, upload/active-content defences, offline backup and independently protected anti-rollback witness. The assessor's findings, methodology and evidence must be retained in an owner-controlled private review location, with secrets and unnecessary personal details excluded from Hub, GitHub, logs and AI.

Six review and remediation stages are implemented as static Hub guidance:

1. **Audit scope and independence:** identify review boundaries, accepted scope and a genuinely independent reviewer. This has **not** happened.
2. **Safe finding evidence:** future findings need a unique opaque ID, affected exact release, relevant test/control reference, reproduction steps and a protected external location for technical proof; no password, seed, private document or personal file name in Hub.
3. **Risk triage:** determine severity and demonstrated exposure; no silent waiver of authentication, plaintext leakage, key loss, rollback, network or Windows ACL issues. Critical and high unresolved issues are explicit blockers.
4. **Remediation:** assign the future engineering owner and change scope; record which precise source/dependency/build configuration changes, without moving a risk to “fixed” merely because code was merged.
5. **Independent retest:** original negative test plus related regression coverage must run against the changed artifact and real intended boundary. A different executable/reviewer scope reopens unverified conclusions.
6. **Owner handoff:** findings disposition is **not** an installation permission. A separate owner authorization and observed, disposable-data Windows acceptance remain mandatory after an independent reviewer clears the relevant implementation.

## Synthetic test model (not a signed findings ledger)

`apps/web/src/vaultSecurityFindingsReview.ts` includes `triageSyntheticVaultFindings`, a pure classifier with no file, API, network, browser store or Windows access. It accepts **only** an invented fixture:

- schema `rosevear-vault-synthetic-findings/v1`, environment `IN_MEMORY_SIMULATION`, source revision `SIMULATED_SOURCE`;
- up to 12 issues with opaque `DEMO-000`–`DEMO-999` IDs, six fixed review-stage IDs, severity `CRITICAL/HIGH/MEDIUM/LOW`, disposition `OPEN/FIX_PROPOSED/RETEST_REQUIRED/SIMULATED_RETEST_PASS`, and provenance `SYNTHETIC`;
- exact allowlisted fields only; duplicate identifiers, unknown stage/status, forged owner approval, “risk accepted”, purported external evidence, release drift and attached secret/personal data fail closed.

| Fictional outcome | Synthetic classification | Real vault permission |
| --- | --- | --- |
| At least one unresolved critical/high | `SYNTHETIC_BLOCKERS` | **HOLD** |
| Only low/medium issues still unresolved | `SYNTHETIC_RETEST_PENDING` | **HOLD** |
| All invented findings marked simulated-retest-pass | `NO_OPEN_SYNTHETIC_FINDINGS_NOT_AN_AUDIT` | **HOLD** |
| Empty invented findings list | `NO_OPEN_SYNTHETIC_FINDINGS_NOT_AN_AUDIT` | **HOLD** |
| Extra/unknown/forged/malformed data | `INVALID_SYNTHETIC_PACKET` | **HOLD** |

The result reports only generic classification and synthetic blocker/retest counts. No report text or submitted fields are echoed into the app, and no remediation/test result can change the hard-coded acceptance status.

The read-only Vault page displays six future review stages, six denial cases, contextual circled-i help and **AUDIT NOT PERFORMED / HOLD**. `assessVaultSecurityFindingsReview` always denies runtime operations, storage, MFA, backup, document intake, Windows installation and owner acceptance regardless of any fabricated external sign-off flags.

## Distinguish release verification from owner field security

- GitHub PR/dev/main GREEN is a source build and regression result only.
- A future independent reviewer must inspect the actual cryptographic and service code, not just this policy module.
- The owner must separately authorize any disposable-account Windows pilot and witness the actual negative cases on the local server.
- Our present Build 129 anti-rollback witness is only a hypothetical in-memory Map; co-rollback is still a documented failure if ciphertext and checkpoint can be rewound together.
- No real credentials/documents, passphrase derivation or key custody, vault-only MFA, secure backup/restore or installed Windows first-party vault exist in Build 131.

## Primary references

- [NIST SP 800-218 — Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final) — security vulnerability response and secure development practices.
- [NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final) — assessment findings and mitigation planning.
- [OWASP ASVS 5.0.0](https://asvs.owasp.org/) — testable application security requirements for a future implemented vault.
- [Build 130 independent Windows acceptance protocol](BUILD_130_WINDOWS_VAULT_ACCEPTANCE_PROTOCOL.md), [Build 129 recovery and rollback limits](BUILD_129_DOCUMENT_RECOVERY_LEDGER.md).

**Next milestone:** preparation for real independent security review and bounded corrective work only after the specific code, cryptographic choices, trust anchor and operator approvals exist. Build numbers and synthetic “all pass” cannot lift the production vault security HOLD.
