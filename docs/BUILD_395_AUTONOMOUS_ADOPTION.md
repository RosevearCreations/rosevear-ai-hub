# Build 395 — Eligible autonomous adoption readiness

Build 394 independently GREEN source; original Windows 0029-to-0040 migration
and supervised activation remain outstanding. The installed release controller
is separate from staged application code. Never claim an updated Windows runtime
from a GitHub merge.

Correct the two existing release policy implementations to require all six
named independent exact main push checks, including ci-budget; an omitted,
failed, skipped or duplicate required check must hold. Older five-check
historical releases are no longer eligible for new automatic staging under
this controller. Existing retained rollback slots are not deleted.

Before automatic preparation, require the explicit retained baseline,
consistent known journal, matching live schema and, for an enrolled runtime,
healthy exact loaded identity. Before an actual switch, recheck readiness
under the same maintenance lock used by recovery, validate database identity,
create/verify the existing encrypted backup, and use the existing process
ownership and rollback safeguards. First supervised installation remains
separate. Do not automatically migrate, clear journals, reset checkout, rotate
keys, enroll tasks, stop unrelated services or bypass control-change review.
The existing update task still needs verified local enrollment and installed
controller update. No local actions are requested while source CI is pending.

Tests cover required CI budget, missing baseline, stale schema, unhealthy
runtime, journal disagreement and existing regression suite. Original-host
unattended adoption remains an independent field acceptance requirement.
