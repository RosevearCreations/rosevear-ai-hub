# Build 388 — Original-host field witness reconciliation (initial candidate)

This increment introduces an owner-only, no-store POST to
`/api/v1/system/field-witness-reconcile-388`. It accepts a bounded pair of
Ed25519-signed original-host and independent-reviewer receipt candidates for a
Build 387 gate. Both must bind the same host, exact approved release SHA,
evidence digest and challenge; observations expire in 15 minutes. No client
key is trusted. The server's separately enrolled public pins are required:
`HUB_FIELD388_ORIGINAL_PUBLIC_KEY`, `HUB_FIELD388_REVIEWER_PUBLIC_KEY`,
`HUB_FIELD388_RELEASE_SHA`. Missing/identical pins or off-host execution hold.

Canonical signing input is UTF-8 JSON of the typed witness without signature,
plus schema `rosevear.hub.field-witness388.v1`, with lexically sorted keys
and compact separators. The signature is 128 lowercase hex characters.

This is an initial candidate, **not a field certification or complete intake
ledger**. An owner cannot turn valid signatures into field closure: the
evidence bytes, challenge issuance, durable replay prevention, independent
reviewer enrollment and off-machine restore remain separately unverified.
Do not configure synthetic keys in the original runtime. No data is persisted,
no network calls or device actuation occur, and QL-340C remains OFF.
Future integration must provide durable private evidence/challenge custody,
independent restore evidence and the owner review UI before full Build 388
acceptance. No completion percentage is advanced by this candidate alone.
