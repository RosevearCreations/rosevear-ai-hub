# Rosevear AI Hub 302 — Original Windows Protected Intake Operator Workflow, Source-Signed Receipt Requirements & Shell Enrollment Exception Escalation

Build 302 adds an on-demand, **offline operator exception review** under System → Original Windows adoption → Build 301. It does not enroll an original Windows issuer, verify any real signature, accept a receipt, register consent, create a Comms Hub ticket, or activate a Master Shell connection. User-approved production deployment proves code readiness only.

## Delivered

1. **Protected intake workflow:** Source-side Build 301 simulated issues are displayed as untrusted inputs. The operator can record a bounded (25-case) browser-session `OPEN_HOLD` exception after explicit acknowledgement. No free-text notes, identities, keys, signatures, receipts, device data or transport endpoints are accepted.
2. **Source-signed receipt requirements contract:** Eight mandatory independently verifiable gates: original Windows host binding; enrolled source signer and custody; canonical signed payload (source, revision, receiver, nonce, sequence, scope and expiry); cryptographic signature verification against the enrolled key; independent reviewer/witness; source- and destination-bound signed owner consent; a durable atomic replay ledger; and enrolled Master Shell receiver/role/tenant route. All gates remain `INDEPENDENT_PROOF_REQUIRED`. A claimed SHA digest, opaque candidate reference, CI run or browser entry is not a signature.
3. **Evidence-driven exception routing:** Missing authority issues are available to the SOURCE_OWNER, INDEPENDENT_REVIEWER or SHELL_OPERATOR as local role labels. `REPLAY_SUSPECTED`, `SOURCE_REVISION_DRIFT` and `RECEIPT_SCHEMA_REJECTED` are offered only when the previous source-side review observed the corresponding issue. Repeated open issues are refused; there are no trusted closures.
4. **Owner-supervised, fail-closed export:** Explicit acknowledgement allows an offline JSON with source SHA, bounded issue codes, role, next action and open/HOLD case count. It includes `DISABLED` transport, `published:false`, zero verified signatures/consents, zero accepted receipts and zero messages. It contains no raw receipt metadata, signature bytes, candidate identifiers, personal data, credentials, network origins or other private evidence.

## Owner walkthrough

1. Open the original Windows review screen → Build 299 → Build 300 → Build 301 → **Open Build 302 protected operator review**. This panel remains unmounted until selected.
2. Read the eight source-signed receipt prerequisites. They describe the required **protected original evidence workflow**, not checks completed by the browser.
3. Choose a missing enrollment authority or a genuinely observed Build 301 source-side exception; acknowledge the limitation; record a local OPEN/HOLD follow-up. Each distinct issue can be recorded once per session and never changes verified authority.
4. Optionally download the sanitized JSON to review the exception mapping. The file is **not** automatically imported by AI Data Platform or Rosevear Comms Hub, and no receiver or Windows process is contacted.
5. For a future real intake pilot, an independently authorized original-source signer, reviewer/witness, signed owner consent, protected receiver and durable replay store must first be enrolled and tested in a separate owner-approved workflow. Never paste real private evidence into this local UI.

## Release/trust distinction

`main` GREEN means CI passed for Build 302. Real original Windows identity, signer enrollment, independent reviewer/witness, signed consent, protected receiver and cross-device replay safety remain **HOLD**, until independently proven and explicitly approved.

**Next proposed Build 303 — Windows Owner-Supervised Protected Intake Pilot, One-Receipt Independent Verification & Master Shell Exception Outcome Reconciliation.**
