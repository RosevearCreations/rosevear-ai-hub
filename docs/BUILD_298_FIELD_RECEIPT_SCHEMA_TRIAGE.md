# Rosevear AI Hub 298 — Independent Receipt Schema Validation, Source Identity Resolution & Owner Field Review Exception Triage

Build 298 extends the original Windows custody review screen with an entirely local, explicit inspection of the private Build 297 metadata-only JSON packet. It **does not** verify a cryptographic receipt or inspect the original Windows installation.

## Delivered

1. **Fail-closed packet parser.** A maximum 24 KiB JSON input must exactly match the Build 297 schema, fixed seven-source identities and roles, fixed seven original evidence requirement states, allowed source SHA and custody digest formats, conservative timestamps, zero accepted receipts/messages, disabled transport and all false trust claims. Missing, malformed, extra, reordered, spoofed or trust-positive fields reject the packet. The raw JSON remains in browser memory; it is never uploaded, echoed or persisted.
2. **Source identity and revision review.** The canonical identity remains `rosevear-ai-hub`. The packet's claimed 40-character revision is compared against the current expected source revision. Drift and age beyond 30 minutes are separate review issues, not evidence of a live connection. Matching format and revision are not origin authentication.
3. **Owner exception triage.** A selected currently observed issue can be acknowledged as an OPEN/HOLD, local-only note. No issue can be closed, accepted, transmitted or used to authorize Windows, Comms Hub, AI Data Platform, signer/witness or customer/device access. Ten notes maximum in browser memory; clearing removes notes and private input.

## Owner walkthrough

1. Navigate to System → Original Windows adoption → Build 295 custody → Build 296 and Build 297 review → **Build 298**.
2. If we have a genuine previously exported private Build 297 metadata-only packet, paste it into the Build 298 field. Never paste credentials, original receipts, signatures, personal data or device details.
3. Read `REVIEW_ONLY_HOLD` or `REJECTED_HOLD`, the claimed revision and observed exception codes. `SOURCE_REVISION_DRIFT` and `PACKET_STALE` are warnings. All valid packets still show `INDEPENDENT_PROOF_MISSING`.
4. Explicitly acknowledge the chosen issue and record an open owner triage note, or clear the browser session. This action does not publish a Shell event.

## Next authority and verification

Original-host installation, independent signer and witness, signed owner consent, canonical signed receipt/replay protection and registered Master Shell publisher/receiver are **HOLD**. Actual connection requires separate private evidence and owner-approved TEST; source CI alone proves only the code. The screen makes no network, Windows, Home Assistant, camera, MQTT or device call.

**Next proposed Build 299 — Original-Host Receipt Provenance Reconciliation, Independent Reviewer Evidence Intake & Fail-Closed Shell Status Export.**

