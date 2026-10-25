# Build 132 — Independent Vault Assessor Handoff & Evidence Readiness

**Status: read-only review preparation.** This is a planning aid for obtaining an independent security assessment of a *future* first-party locally hosted password and document vault. It is not an audit, reviewer engagement, evidence upload, user signoff, installable vault or authorization to store any secrets. GitHub CI GREEN applies to source tests only.

## Why an assessor packet is not yet an assessment

Builds 119–131 prepared security boundaries, threat scenarios, disposable Web Crypto tests, a hypothetical recovery ledger, a Windows field protocol and simulated remediation triage. They have not shipped a real first-party vault implementation, derivation algorithm, separate identity and MFA service, durable encrypted store, independent rollback witness, audited build artifact or installed Windows application. Therefore an independent assessor cannot yet attest to an actual vault product or clear the real Windows server for use.

Build 132 provides eight *future* evidence scopes in the signed-in Vault page:

1. Reviewer independence, engagement and approved test scope.
2. Exact Git source, immutable dependency set, build recipe, executable identity and Windows configuration reconciliation.
3. Cryptographic dependency and key-derivation inventory reviewed independently; Web Crypto is authorized only for synthetic tests.
4. Separate household identities, client key custody, vault-only MFA, revocation and recovery.
5. Windows service identity/ACLs, LAN/Tailscale, private HTTPS origin and no cross-access from the Hub or home devices.
6. Encrypted document validation, atomic recovery and a genuinely independent anti-rollback witness.
7. Reproducible negative tests, sanitized findings and independent retests pinned to the affected executable.
8. Separate owner decision on whether to permit a *disposable-data* Windows trial, followed by witnessed real acceptance.

These scopes identify **what evidence would be needed**, not evidence that currently exists. Future technical proof, if any, must remain in a private owner-controlled location with retention and access controls. Only opaque control IDs, a minimal sanitized disposition and affected pinned version may be copied into a future designed workflow after a separate privacy/security review. Passwords, passphrases, keys, codes, private documents, original filenames and personal details must never be pasted into the Hub review screen, source repository, CI logs or AI prompts.

## Synthetic-only packet contract

`apps/web/src/vaultAssessorHandoff.ts` exposes `inspectSyntheticAssessorHandoff`, a pure, non-persistent function. It accepts exactly the `rosevear-vault-synthetic-assessor-handoff/v1` schema, `IN_MEMORY_SIMULATION`, `DEMO_ARTIFACT_ONLY`, and precisely eight unique scope IDs. Each control has only its ID, `MISSING` or `SIMULATED_PREPARED`, and `SYNTHETIC` provenance. No reviewer name, actual source SHA, file attachment, comment text, signoff, executable, owner override or risk waiver is accepted.

| Invented packet outcome | Classifier result | Real vault permission |
| --- | --- | --- |
| At least one fictional scope is missing | `SYNTHETIC_HANDOFF_INCOMPLETE` | **HOLD** |
| All eight fictional scopes are prepared | `SYNTHETIC_HANDOFF_PREPARED_NOT_REVIEWED` | **HOLD** |
| Missing, duplicate or unknown control; extra/sensitive field; forged approval or real-world provenance | `INVALID_SYNTHETIC_HANDOFF` | **HOLD** |

The result discloses only an invented scope count and generic classification. All independent-review, evidence, live-installation, MFA, backup/restore and owner-acceptance flags remain hard-coded false or DENY. A complete simulated checklist must **never** be represented as independent security review or Windows field acceptance.

## Acceptance limits and next independently authorized action

- No real credential, document, MFA key, API endpoint, host process, permanent key, backup, restore, export or upload is created.
- No deployment to, login on, or restart of the Windows home server occurs.
- The next meaningful security milestone is implementing scoped, reviewable vault cryptographic/identity/service code **only after** separately approved design and trust-anchor choices, then commissioning a genuine independent review and proposing a carefully controlled disposable-data Windows pilot with fresh owner authorization.
- Unresolved critical/high findings or unreconciled source/binary drift block the pilot. Real owner acceptance can only follow verified external retesting and witnessed physical negative cases.

## References

- [Build 131 independent findings and remediation triage](BUILD_131_VAULT_SECURITY_FINDINGS_TRIAGE.md)
- [Build 130 Windows owner acceptance](BUILD_130_WINDOWS_VAULT_ACCEPTANCE_PROTOCOL.md)
- [NIST SP 800-218 — Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [NIST SP 800-115 — Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final)
- [OWASP Application Security Verification Standard](https://asvs.owasp.org/)
