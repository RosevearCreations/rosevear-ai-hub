# Build 095 — Contextual First-Safe-Check Playbooks

## Scope and operator value
The existing priority triage now displays two practical **manual first checks** per follow-up. Known Home, Workshop and Business service keys have separate, finite guidance for configured problems, missing verification and optional setup. Copy is static and allowlisted, with no raw source payload, exception, hostname, IP address, credential, device identifier or customer data interpolated. Read-only users receive the same non-executing guidance; protected changes remain subject to existing permissions.

## Acceptance
1. Open Operations overview and manually collect a status snapshot. In Home, confirm that a Home Assistant connection needing review offers Devices and VM checks, and MQTT offers read-only broker/add-on checks.
2. Switch to Workshop: confirm camera, Knowledge and MQTT checks are context-appropriate. Switch to Business: only Business, Knowledge and MQTT appear.
3. Mark a Home Assistant triage entry reviewed and enable "Show unreviewed triage only." Its first checks should hide **only** from the priority triage; the independent verification queue stays intact.
4. Switch contexts and manually refresh. Review/filter state follows the existing reset behavior, and any service whose status becomes unknown uses *verify* guidance rather than a guessed repair.
5. Open a suggested section using the existing triage navigation and independently verify its state. No check or navigation is a physical safety sign-off.
6. Check no private provider errors, tokens, business records or camera credentials appear in the dashboard. Test locally on the Windows host separately after a clean deployment.

## Security, testing, migrations and rollback
Frontend-only allowlisted copy keyed by known service and priority categories. No new endpoint, background polling, persistence, log export, service restart, Home Assistant command, MQTT publish, camera action, CNC/laser/forge command, business mutation, Windows scheduled task, migration or reboot. Add helper coverage for unknown keys and all 15 known service/state combinations, plus role/context/filter/refresh/privacy interaction tests.

Rollback: revert the scoped frontend, tests, roadmap and this runbook through a reviewed PR; no schema rollback or machine action is needed. Gate promotion on the five independent GitHub CI jobs for both dev and main. GitHub GREEN verifies repository code, **not** that the Windows host updated or physically passed checks.

## Next queued
Build 096 — scope to be selected from practical Home, Workshop & Business acceptance priorities.
