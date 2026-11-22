# Build 376 — Safe automation sequencing and dependency orchestration

**Protected-source implementation; FIELD_HOLD for original Windows host and
all real workflow execution.** No actuator added or connected to the new
planner. The existing Event Engine and manual HA scene approvals remain
unchanged.

## Source-delivered capabilities

- Owner-only DAG plans (1–12 existing automation IDs) with explicit
  prerequisites and deterministic topological ordering, missing edges,
  duplicate and cycle rejection. Existing source rules are never cloned.
- Pin each plan to an exact hash of existing enabled/disabled rule definitions.
  A later local edit or different version invalidates approval. Owner review
  requires expected plan revision, exact source digest and confirmation.
  Approval authorizes a **simulation only**, not a device command.
- Report missing/disabled rule, unsafe opaque HA native scene, switch that
  could represent hazardous equipment, provider failure and stale approval
  separately. Any of these blocks the simulation.
- Explicit simulated provider-outage knobs (Home Assistant, MQTT, Frigate or
  another application) are **hypothetical**, not a live source connection.
  Fail closed on an unavailable source, with no retry or fallback that would
  actuate another device.
- Durable, unique hashed causality receipts with a database uniqueness guard,
  30–86400s per-plan cooldown, optimistic revision checks, and a 500-attempt
  cap for each plan. Replay returns REPLAY_HELD, never a second successful
  simulation. No raw MQTT payload or source credentials are stored.
- Private responsive UI under the Automations screen with source list,
  create, preview, exact dry-run confirmation, outage scenario and manual
  rehearsal receipt. Advanced branching DAG is supported by the owner API;
  the UI exposes linear or independent steps.
- Additive migration 0037, API authorization/security tests and source
  integration acceptance. No event engine entrypoint or tool dispatcher is
  modified. No live automation is silently enabled.

## Understanding external-app updates versus branch divergence

Other Rosevear apps may send **runtime messages** (telemetry, webhook receipts,
heartbeat events) to the Hub; these do NOT commit files to Hub's GitHub repo.
Git branch divergence arises from distinct git histories, parallel PR merges
or independently edited files. Build 376 pins rule definitions for review
rather than accepting external messages as source-authorized mutations.
Converge branches with a protected PR, review both sides, and preserve unrelated
upstream build updates. Do not force push or discard other app integration
changes. A truly separate cross-app source update belongs to its own signed,
reviewable change with independent provenance.

## Original-host field acceptance, later

1. Back up the real Windows Hub database, verify restore off-machine and apply
   migration 0037 during a supervised update. Restart only the Hub service
   for server/migration changes; the web client normally reloads.
2. On the private Automations panel, create a source-pinned plan, check exact
   graph ordering, confirm approvals invalidate on source edits, and simulate
   a provider outage, duplicate cause and cooldown. Verify zero device actions.
3. To move from simulation to actual action orchestration in a later
   separately authorized feature, require per-step safety allowlisting,
   verified original-host source permissions, persistent run state,
   manual exact-action approvals and hardware interlocks. Never automate
   kilns, lasers, CNC, locks, smoke/CO systems, machinery or safety devices.

## References
- https://www.home-assistant.io/docs/automation/
- https://www.home-assistant.io/docs/scripts/
- https://docs.github.com/en/pull-requests/collaborating-with-pull-requests
