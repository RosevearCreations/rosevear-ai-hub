# Build 085 — Snapshot Change Detection & Reverification Guidance

## Why this build

Builds 083–084 provide context-aware manual follow-up actions and transient
review acknowledgements. Build 085 shows **what changed between two explicit
operator snapshots** without claiming continuous monitoring or successful
device repair.

The authenticated Operations overview now compares the immediately previous
sample with the newest sample of the same five existing read-only status
sources: Home Assistant, MQTT, camera registry, knowledge and business
connectors. The UI uses only existing API responses. No new endpoint is needed.

## Operator experience

1. Sign in to the Hub and open **Operations overview**.
2. The first automatic page-load sample displays **No comparison yet**.
3. Choose **Refresh overview** to gather a second manual sample.
4. In **What changed since the last check?**, review state transitions for the
   selected Home / Workshop / Business context.
5. Follow the fixed **Open [section] to verify** button to inspect the
   relevant live section. It only navigates; it does not command equipment.
6. Refresh again for an updated comparison. Only the newest and immediately
   previous samples are kept in this page's React memory.

Transitions are prioritized: newly reporting **Needs review**, newly **Not
verified**, other configuration changes, and newly **Ready**. The latter
means only that a local status report changed to Ready; it does **not**
demonstrate physical recovery, certificate trust, host reboot resilience,
equipment safety, or operational completion.

When no state changed, the UI explicitly states that unchanged reports do
not establish safety or health. A missing sample has no baseline and produces
no fabricated comparison.

## Privacy and safety

Only five fixed service keys and four fixed readiness statuses are compared.
Titles, guidance and navigation are locally defined constants. No provider
errors, private IPs, URLs, customer data, device identifiers, tokens, or
credentials are copied into comparison output.

- No localStorage, IndexedDB, database schema, file writes, tracking ledger,
  scheduled poll, notifications, outbound network endpoint or external SaaS.
- No device command, MQTT publish, camera movement, Home Assistant action,
  business record write, restart, firewall modification or task installation.
- Both snapshots disappear on page unmount/reload. Existing Build 084 reviewed
  marks still reset on every fresh status measurement.
- Tests cover prioritization, context isolation, non-assumptive "ready",
  duplicate/unknown source rejection, privacy and browser refresh behavior.

## Release and rollback

Required release gates: all five PR CI lanes for dev and production, all five
independent push lanes on dev and main, and release-history synchronization
with dev missing no main commits. GitHub CI GREEN is not proof that the
household server's served PWA has adopted the new frontend assets.

Rollback through a reviewed revert of Build 085 frontend, tests and roadmap.
No migration or backend compatibility step is required; Build 084 continues
to operate independently.

## Open physical acceptance

Household **server reboot persistence** remains expressly deferred.
Client HTTPS trust and camera/backup owner acceptance remain separate from
this UI and cannot be inferred from snapshot comparisons.

## Next proposed

Build 086 — scope to be confirmed from updated Home/Workshop/Business roadmap
and owner priorities after Build 085 promotion.
