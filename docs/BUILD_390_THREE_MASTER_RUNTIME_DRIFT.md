# Build 390 — Continuous Three-Master Runtime Synchronization

Stacked initial candidate; promotion must follow Build 389. No live
installation, independent Master ACK, or remote recovery has been performed.

The owner-only original-host API accepts bounded Ed25519-signed runtime
observations for the three Masters. Every Master must have a distinct
protected public pin and separately approved target SHA. Configure an
owner-restricted existing private directory and an absolute canonical
HUB_RUNTIME390_PRIVATE_LEDGER .sqlite3 path, plus HUB_RUNTIME390_PIN_ and
HUB_RUNTIME390_TARGET_ followed by each upper-case underscore source name.
Pins and approved targets never come from an observation. Verify directory
ACLs independently; path validation is not an ACL audit.

Signing bytes are compact sorted UTF-8 JSON of the schema and all fields
except signature. Each source retains an increasing sequence for its key
across deployment targets. Invalid, stale, future, duplicate and out-of-order
packets are refused transactionally. Retained observations are reverified on
read; policy changes do not inherit evidence from a different key or target.
The bounded ledger retains up to 10,000 packets, then holds for reviewed
archive/retention rather than deleting replay evidence automatically.

A mismatched release or reported unhealthy runtime opens a source-reported
incident. Two fresh, consecutive aligned healthy receipts at least 30 seconds
apart after a mismatch allow source-reported recovery. Missing or stale
receipts cannot prove recovery. The Hub must also match its loaded-package
marker. Neither a signed observation nor a local readback is independent
operational acceptance, a remote delivery ACK, or a release promotion.

Outstanding: connect existing approved source emitters without enabling
QL-340C or accepting arbitrary remote commands; add the owner review and
approved recovery handoff; test actual source signers, delivery and the
original host independently. No automatic schema migration, task enrollment,
household service restarts or remote deployment.
