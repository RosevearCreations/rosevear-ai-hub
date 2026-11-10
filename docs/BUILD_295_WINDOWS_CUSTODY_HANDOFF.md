# Rosevear AI Hub 295 — Original-Windows Field Review Chain-of-Custody, Evidence Registry Interface & Operator-Gated Handoff Dry Run

## Delivered
Build 295 adds a non-authorizing workflow beneath System → original Windows adoption → Builds 293 and 294.

- Correlates a locally reviewed, unsigned Build 293 intake note with a later explicitly recorded Build 294 supervised owner note, requiring matching owner-reported source SHA and valid ordered timestamps. A digest or timestamp match is not independent origin or custody proof.
- Requires a **new** owner acknowledgement to record up to ten local chain-of-custody *notes*. No real witness, physical-original-host check, signer key, consent, signed receipt or authoritative custody record is asserted.
- Presents a typed **evidence registry interface design** with seven independent authority requirements. It is NOT CONNECTED and has zero independently verified entries. It does not call a registry service or accept uploaded evidence as trusted.
- Provides a **second operator-gated** handoff dry run to the AI Data Platform read-only review lane or Comms Hub operator-review lane. It *always* reports BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE, transport DISABLED and zero messages sent; it does not queue, publish, email or POST any request.
- Allows explicit metadata-only local JSON download and clear of current browser-session notes. No credentials, raw host identity, witness name, signature bytes, or source file contents are stored.
- Preserves strict trust separation: GitHub CI green = source checks, not original Windows device acceptance or Master Shell authorization.

## Owner walkthrough
1. Open original Windows adoption and explicitly review the previously downloaded unsigned Build 288 request under Build 293.
2. Record the Build 293 local intake comparison; then choose and acknowledge a Build 294 supervised non-executing review plan.
3. Review Build 295's chain-of-custody source/time correlation and the seven independent evidence registry requirements. Acknowledge the HOLD and select **Record local custody note (HOLD)**.
4. Select one intended review destination, acknowledge the **separate** handoff HOLD, and select **Simulate operator handoff (no send)**.
5. Observe that no message was sent, no registry was contacted, and no recipient could accept a signed receipt. Optionally download the private metadata-only report.
6. A future owner-authorized implementation must separately enroll approved issuer, witness, consent, cryptographic verifier, replay store and receiver; it cannot infer authority from any Build 295 output.

## Verification, rollback and independent gates
- Model regression: missing acknowledgement, no intake, no supervised review, mismatched source, reversed timestamp sequence, future record, trust-positive rejection, seven registry gates fixed HOLD, no send, bounded export.
- UI regression: no network on mount, disabled initial controls, explicit sequential acknowledgement, local dry run blocked, and registry rows HOLD.
- Require all six GitHub protected CI lanes on feature PR and production PR, plus independent fresh main push CI on the production commit.
- No schema migration, Windows service or device operation, signer enrollment, external transport, database write or production recipient configuration.
- Rollback: reviewed revert of Build 295 model, tests, panel, integration and this guide.
- **Original host, binary process, independent witness, issuer, signed consent, receipt crypto and Master Shell authorizations remain HOLD.**

**Next proposed Build 296 — Independent Windows Custody Review Exception Register, Owner-Approved Field Receipt Checklist & Read-Only Shell Evidence Readiness Alignment.**
