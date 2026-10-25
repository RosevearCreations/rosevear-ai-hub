# Build 133 — Vault Change-Impact Reassessment & Mandatory Retest Mapping

**Status: synthetic, read-only planning.** Build 132 defined eight independent-assessor evidence scopes for a future first-party password/document vault. Build 133 makes the important follow-on rule explicit: changing a source artifact, dependency, client identity, Windows configuration, private origin or recovery boundary can invalidate earlier findings and test conclusions. This build is not an independent assessment and does not activate a vault.

## Mapping changes to mandatory independent reassessment

The Hub Vault screen lists six classes and six negative examples. `apps/web/src/vaultChangeImpactReview.ts` defines the review mapping:

| Synthetic change type | Build 132 evidence scopes to revisit |
| --- | --- |
| `source_rebuild` | source artifact, dependencies, negative tests, owner boundary |
| `crypto_library` | source artifact, dependencies, key/identity, negative tests |
| `household_identity` | key/identity, negative tests, owner boundary |
| `windows_service` | source artifact, Windows/network, negative tests, owner boundary |
| `private_access` | key/identity, Windows/network, negative tests |
| `document_recovery` | document/recovery, negative tests, owner boundary |

Multiple changes produce a deduplicated union in the stable eight-scope order from Build 132. This is only a **planning minimum**: a real independent reviewer can broaden the assessment based on actual diffs and findings. The map does not verify an executable, a changed library, a deployed server or any MFA/recovery implementation.

## Synthetic-only, fail-closed packet

`mapSyntheticVaultChangeImpact` accepts only the exact `rosevear-vault-synthetic-change-impact/v1` schema, `IN_MEMORY_SIMULATION`, `DEMO_BEFORE`, `DEMO_AFTER` and one to six unique, allowlisted changes with `SYNTHETIC` provenance. There is no input text field, file collection, network access or persistence. A valid packet produces `SYNTHETIC_REASSESSMENT_REQUIRED_NOT_A_REVIEW`, a list of hypothetical impacted scopes, `REQUIRED` independent retest and **HOLD**.

Empty, duplicate, unknown, extra, real-source, forged-signoff, waiver and sensitive-data fields are rejected as `INVALID_SYNTHETIC_CHANGE_PACKET` with **HOLD**. No result ever states a reviewed artifact is safe, a real finding is closed, a signed assessor was present, or an owner authorized the Windows trial.

## Separate security and release authorities

Source GitHub checks across PR, `dev` and `main` establish that code compiles and tests pass. They do **not** establish cryptographic safety, actual Windows process/ACL isolation, private TLS origin correctness, an independent anti-rollback witness or a functioning password/document service. Those remain future security work requiring separately approved design, independent examination of concrete code and a distinct owner-supervised disposable-data Windows pilot.

No actual passwords, documents, MFA enrollment, vault endpoint, file picker, backup/restore procedure, Windows service installation or server reboot is introduced by Build 133. An unverified critical/high finding or a changed assessed artifact remains a release-safety **HOLD** regardless of any fabricated success indicator.

## References

- [Build 132 assessor handoff readiness](BUILD_132_ASSESSOR_HANDOFF_READINESS.md)
- [Build 131 independent findings and remediation triage](BUILD_131_VAULT_SECURITY_FINDINGS_TRIAGE.md)
- [NIST SP 800-218 — Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)
- [NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final)
