# Build 083 — Context-Aware Daily Operations Action Queue

## Scope and user value

Build 082's household Windows gateway checks now report 8/8 passing,
including `TaskOwned=True` and `READY_FOR_SUPERVISED_REBOOT_TEST`.
That is only readiness to attempt a supervised reboot; post-reboot recovery
is still **not proven** and the owner has deferred the reboot.

Build 083 advances the roadmap's practical Home, Workshop and Business
experiences instead of extending gateway diagnosis.

The authenticated Operations overview now includes **Today's manual
follow-ups** for the selected Home, Workshop, or Business context.
It derives at most three advisory actions from the existing five read-only
status checks already used by the overview:
Home Assistant, MQTT, camera registry, knowledge and business connectors.

Priority is deterministic:
1. **Needs review**: configured integration or recorded data needs attention;
2. **Unverified**: the status query failed (never call it healthy);
3. **Optional setup**: a service is not configured, not a service incident.

Healthy status produces no follow-up. Actions only open existing app
sections for further review; no action directly changes devices, business
records, configurations, camera feeds or machine state. All text and
navigation targets come from a fixed local catalogue, not unsanitized API
responses, HTTP errors or credentials.

The queue displays snapshot time and requires intentional Refresh overview
for another measurement. The queue is non-persistent; no background polling,
alarms, user task tracking or automatic action is introduced.

## Acceptance

1. With the latest release installed and the authenticated Hub reachable,
   open the Home **Operations overview**.
2. Refresh overview manually. Verify that the status summary explicitly
   distinguishes **needs review** from **unverified**.
3. Switch Home / Workshop / Business. Each context must use only its
   relevant known signals and show a priority-ordered manual worklist.
4. Choose an **Open ... for manual review** button. It must only navigate
   to an existing section (Devices, MQTT, Cameras, Knowledge or Business).
5. If no follow-ups are suggested, observe the explicit caveat that this
   does not certify safety or reboot recovery.

Automated Vitest cases cover ordering, context isolation, all-ready,
missing/unverified evidence, privacy redaction and fixed destinations;
the five standard GitHub CI lanes must pass on PR and independent branch
push before code GREEN.

## Security, migrations, rollback

- **No new network endpoints**, third-party services, API credentials,
  service startups, Windows scheduled tasks, device writes, machine commands,
  exports or logging of provider secrets.
- **No migration or schema change**; existing backend payloads remain the
  only data source.
- API failures are marked **Unverified**, not healthy. Optional services
  are never treated as failures. A UI status is not real-world safety proof.
- Roll back by reverting the Build 083 OperationsDashboard and test changes,
  documentation and roadmap through a reviewed Git commit. The existing
  operations status cards work independently.

## Separate pending physical acceptance

Real Windows server post-reboot recovery remains deferred and **must not**
be inferred from Build 083 CI, the gateway scheduled task's manual success
or an 8/8 readiness report. Other camera, integration and backup owner
acceptance remains independently gated.

## Proposed next build

Build 084 — select follow-on usable Home/Workshop/Business capability from
future owner priorities and current roadmap after Build 083 code GREEN.
