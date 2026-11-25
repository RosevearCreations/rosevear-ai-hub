# Build 389 — Exact Runtime Readback & Safe Release Adoption

This is a stacked source candidate following Build 388. Do not promote ahead
of the protected predecessor. No original-host installation is claimed.

## First increment

The existing isolated release manager remains the single controller. For
source containing the new runtime identity module it writes an exact SHA and
version marker into the staged installed Python package before tests and tree
fingerprinting. The process reads the marker only on module import. Loopback
readback returns the captured SHA, version, PID and limited observation scope.
The manager checks these against the candidate and inspected Windows listener
in addition to existing frontend marker, executable and process command checks.
Historical slots without the new capability retain their old health contract;
they are not upgraded into exact backend certification by assertion.

Rollback now checks the actual live schema against the retained fallback
before any listener is stopped. Schema mismatch is a HOLD, never an automatic
downgrade or restore. Existing backup, CI, enrollment and control-change gates
remain mandatory. No scheduled task, household service or QL-340C receiver is
changed by the source candidate.

## Remaining acceptance

First enrollment, actual migration compatibility, exact source/runtime
readback, genuine rollback and independent three-Master receipts require
separate verified evidence on the original host. No external attestation or
off-machine restore is claimed from a package marker. No arbitrary remote
execution or silent task enrollment is authorized. The owner-only /api/v1/system/master-acceptance-389 endpoint consolidates local
runtime and loaded package identity. A private ledger accepts a single-use
challenge signed by all three distinct source pins over all three separately
approved release SHAs. Stored receipts are revalidated on read and expire.
Configure HUB_MASTER389_PRIVATE_LEDGER in an independently ACL-reviewed private
directory and HUB_MASTER389_PIN_ / HUB_MASTER389_TARGET_ for each upper-case
underscore source name. No signer or target can be supplied by the client.
Receipt signatures prove signed challenge agreement, not independent TLS
delivery or physical acceptance. Existing release manager gates still apply.
Actual peer signer integration, operational transport and original-host
installation remain field HOLD; no remote commands or new tasks are enabled.
