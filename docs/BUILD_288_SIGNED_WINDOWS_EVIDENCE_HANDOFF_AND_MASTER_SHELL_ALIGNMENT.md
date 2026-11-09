# Rosevear AI Hub 288 — Windows signing handoff, drift acknowledgement and Master Shell contract alignment

## Delivered surface

Under **I.T. → Integration Health → Build 287**, the Build 288 panel uses the same **manually requested** Windows launcher sample and the owner-scoped Build 287 observation history. It does not issue a second request, read a private key, restart a service or transmit records.

The owner can explicitly acknowledge a current launcher/release/startup drift or a recorded historical transition. The acknowledgement is a strictly typed, single-sample, owner-scoped browser-local **review note**, not permission to approve the changed software. A changed sample, owner reference, SHA candidate, or expired five-minute observation invalidates its applicability. A later stable sample never silently erases a previously recorded drift.

Only with a current valid sample, a recent owner observation and acknowledgement of all detected drift can the owner prepare an **offline signing request**. The browser calculates SHA-256 over the exact `JSON.stringify(content)` bytes included in the request. It then offers a manual JSON download. The offline request contains no PID, private command line, hostname, URL, credential, owner identifier or freeform private note.

## Explicit signing and trust boundary

`rosevear.ai-hub.windows-evidence-signing-request.v1` is an **unsigned candidate**, never a signed receipt. The `signing` object contains a null signature, null signer key ID, null trusted fingerprint and the state `AWAITING_APPROVED_ORIGINAL_HOST_SIGNER_AND_INDEPENDENT_WITNESS`. The content digest provides integrity for a future independently signed handoff; SHA-256 by itself is **not a cryptographic signature**. It cannot prove where the browser ran or who acknowledged the drift.

A separately approved original-Windows-host issuer, owner consent, independent witness, enrolled public-key fingerprint, canonical signature contract and verifier are still necessary. No key generation/enrollment, signing claim, signer auto-trust or receiver activation is performed in this build. If browser Web Crypto SHA-256 is unavailable, the request fails closed.

## Master Shell Build 335/337 alignment, without publication

Reviewed on 9 November 2026 against the AI Data Platform `main` documents:

- `docs/BUILD_335_MASTER_SHELL_CONTRACT_V1_CORRELATION_EVENT_ENVELOPE.md`;
- `docs/contracts/rosevear-master-shell-event-v1.schema.json`;
- `docs/BUILD_337_READ_ONLY_SOURCE_UPDATE_INGESTION_PROVENANCE.md`.

| Contract dimension | AI Hub signing-request mapping |
| --- | --- |
| Schema | `rosevear.master-shell.event.v1`, version `1.0.0` — **mapping proposal only** |
| Source / shell ID | `rosevear-ai-hub` / `rosevear-ai-hub` |
| Tenant | `null`, local-support-server boundary |
| Event family | `audit.evidence.recorded` (supported by Build 337) |
| Audience | `ai-data-platform` only |
| Verification | `held`, never independently verified from local browser evidence |
| Transport | `NO_SIGNED_WEBHOOK_OR_APPROVED_SOURCE_PUBLISHER` |

The request is deliberately **not** a valid Master Shell event: it does not manufacture an `eventId`, verified immutable `sourceRevision`, `sourceSequence`, `correlationId`, `idempotencyKey`, `evidenceURI`, expiry, signed webhook receipt, verified transport key binding, or authorized publisher. These fields remain open for the approved source authority workflow. AI Data Platform Build 337 requires a signed `rosevear.webhook.v1` receipt, independently reverified HMAC source binding, exact source/tenant/audience, freshness, replay checks and normalized append-only intake; none can be substituted with this downloaded file.

## Field process for Ree and Jack

1. On Ree's actual Windows mini-server, open the installed client and sign in as owner. Review Builds 285/286, then **Compare current launcher with owner history** in Build 287.
2. Record a fresh Build 287 owner observation after physically checking the machine and service behavior. If the release, launcher chain or startup task differs, inspect each listed change.
3. In Build 288, explicitly acknowledge current or historical drift only if actually reviewed. This does **not** mean it is fixed, safe, or approved.
4. Select **Prepare offline signing request**, check the digest and download the JSON. Keep the request private until the approved signer/witness workflow is established; do not paste it into a public issue or chat.
5. The authorized operator must verify the source release independently and sign the exact content digest with a separately enrolled original-host authority. Only after an approved verifier, witness, owner consent and signed webhook routing are established may a different implementation propose a real Master Shell event.

## Tests and release boundary

Build 288 unit and component tests cover request hashing, immutable identity mapping, no automatic network request, held publication, owner scope, tampered ack storage, stale and changed samples, old history drift, explicit acknowledgement and safe digest failure. Existing Build 286/287 safety tests remain active.

GitHub `dev`/`main` production CI being GREEN proves source checks passed. **It does not prove Ree's Windows installation, a signer, a witness, a trusted source, or a live Master Shell attachment.**
