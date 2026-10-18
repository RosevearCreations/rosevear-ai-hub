# Build 084 — Manual Follow-Up Review & Snapshot Revalidation

## Scope

Build 083 introduced finite Home, Workshop, and Business daily follow-ups
derived from the Hub's existing read-only status queries. Build 084 lets the
operator acknowledge a manual review **for this snapshot only**. A review
acknowledgement must **never** mean service repaired, camera safe, business
record updated, equipment certified, or server reboot proven.

- Follow-up rows remain visible even after being reviewed.
- An operator can **Mark reviewed (not resolved)** and **Reopen review**.
- The current view reports how many of its follow-ups are reviewed and
  outstanding. Shared service status (e.g. MQTT) has the same reviewed
  marker when switching between Home and Workshop.
- A successful **Refresh overview** invalidates all review marks across all
  contexts, because the server status data has been re-sampled.
- Controls are disabled during a pending status refresh.
- The review is in React component memory only. Navigating away, closing the
  page, or reloading the browser does not retain marks.

## No inferred real-world effect

- No server endpoints, database schema, logs, browser localStorage or new
  services are introduced.
- Neither an acknowledgement nor opening a section sends a home automation
  command, MQTT publication, camera action or business write.
- A review never changes the original service readiness signal or the
  Build 083 priority; unknown remains unverified and optional setup is
  not a failure.
- Only fixed, known navigation destinations and fixed UI text are used; the
  review store holds only five known signal IDs, not errors or provider data.

## Acceptance

On the Windows Hub, after the Build 084 code has been adopted into the
running authenticated web application:

1. Open Home > Operations overview; note the manual follow-ups.
2. Mark a Home Assistant or MQTT item reviewed. Its status must remain
   unchanged, but its review label must show **issue may remain**.
3. Reopen it. Its status becomes **Awaiting manual review**.
4. Switch between Home, Workshop and Business, and verify that changing
   contexts does not mark unrelated items reviewed.
5. Click **Refresh overview**. Earlier marks must clear.
6. Verify the available buttons only navigate to an existing destination
   or change the transient review mark.
7. Restarting Windows **is not** a Build 084 acceptance requirement.
   Server post-reboot persistence remains separately **DEFERRED**.

React interaction tests cover mark, reopen, context navigation, refreshed
snapshot reset and omission of private backend values. Normal five-lane CI
must be fully green on dev PR, independent dev push, main PR and independent
main push before treating the GitHub release as GREEN.

## Security and rollback

No migration, configuration change, task installation, reboot, service
restart, firewall change, cloud dependency, write authorization or physical
action. Any real machine or business action remains separately authorized.

Rollback by reverting the Build 084 dashboard changes, interaction test,
and documentation in a reviewed Git commit. Build 083 advisory worklist and
existing status cards continue to operate independently.

## Next proposed

Build 085 — scope to be selected from owner priorities and roadmap after
Build 084 GitHub code promotion and optional live browser acceptance.
