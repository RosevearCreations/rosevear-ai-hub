# Build 086 — Privacy-Safe Manual Operations Handoff

## Scope
Extend Builds 083–085's authenticated Home, Workshop and Business status
workflows with a deliberate, copyable handoff summary. A user opens the
**Manual operations handoff** panel and selects **Show private handoff
report** to reveal a read-only text area. Nothing is copied, saved,
transmitted, scheduled or logged automatically. The user decides whether
and where to paste the private report.

## Report contents
- Currently selected Home / Workshop / Business context and UTC sample time
- Service readiness classifications from the existing five read-only local
  status queries, mapped to fixed known names and state labels
- Up to three current manual follow-ups and whether the operator marked each
  reviewed *for this snapshot*, which explicitly never means resolved
- Fixed-category status transitions between the current and immediately
  previous manually collected samples; no baseline is invented
- Plain-language caveats that reported Ready does not certify safety,
  remote HTTPS trust or real-world recovery

The report only uses the existing already-sanitized local signal keys,
allowlisted status values, predeclared names and fixed guidance. It excludes
all raw upstream error messages, tokens, account names, IP addresses,
device URLs, credentials, business/customer records and unrecognized fields.
The operator may copy the visible text manually. Even a sanitised report
should be shared only with an intended recipient.

## Acceptance
1. Sign into the existing Hub and open Operations overview.
2. Confirm no report is visible until **Show private handoff report** is clicked.
3. Confirm the text area is read-only and reflects the current context.
4. Mark an existing daily item reviewed; the summary must say it was
   reviewed **not resolved**.
5. Change context; the report hides, and a newly shown report contains
   only that context's known service statuses.
6. Manually refresh; the report hides and the next report includes a
   prior sample, without exporting raw provider data.
7. No network request, device action or persisted report is triggered by
   either show/hide, switching context or selecting text.

Tests cover the manual user interaction and fixed privacy boundaries,
including adversarial signal details, unknown keys and missing baseline.
Five standard CI lanes must pass on dev and main PRs and independent pushes
for GitHub code promotion. Live PWA adoption remains a separate operator
review after pulling and building local frontend assets.

## Security and deployment
Frontend-only changes; no new backend route, schema migration, file write,
cloud integration, provider credential, task scheduler action, Windows server
reboot, camera, MQTT or Home Assistant device control. The text area is
session-local and reverts to hidden whenever the context changes or the
overview refreshes.

Rollback by a reviewed revert of the Build 086 frontend, tests and roadmap.
The previous read-only status cards, action queue and snapshot comparison
remain independently available.

**Server reboot-persistence acceptance stays deferred** as requested;
successful GitHub CI never substitutes for a supervised physical reboot.

## Next queued
Build 087 — scope to be confirmed from the updated practical operations
roadmap and user priorities.
