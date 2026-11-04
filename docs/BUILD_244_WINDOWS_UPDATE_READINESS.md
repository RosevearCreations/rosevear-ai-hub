# Build 244 — Windows Update Readiness, Guided Recovery & Installed-Version Clarity

## Scope

The System → Update Hub panel now shows a contextual **Next safe step** based on the
already-reported local release blockers and adoption state. It separates first-time
supervised enrollment, backup/Recovery prerequisites, local-host restrictions,
interrupted activation, and failed/rollback-failed releases.

The guidance is read-only. It cannot enroll tasks, bypass the existing same-schema
or backup gates, restart the Windows PC, touch other devices, or mark a release
installed. Existing owner consent and the local-only update request remain unchanged.

## Verification boundary

Web tests cover the fail-closed guidance and disabled install action. GitHub CI
GREEN is source-release evidence only; Windows machine installation, service
health, and actual installed-client refresh require a separate supervised field
receipt. No Windows host was operated during this build.

## Next logical build

Build 245 — Installed Windows Release Receipt & Owner Field Acceptance: collect
real machine readback of managed slot, backup/rollback state, task result and
browser version; make no unsupervised service modifications.
