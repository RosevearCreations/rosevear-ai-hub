# Rosevear AI Hub Build 282 — saved owner queue presets and safe report preview

## Scope

- Owners/administrators with Notification permission can save up to five named combinations of Build 281's **personal** queue status, local-note age and priority filters.
- Presets are browser-local, scoped by signed-in account ID and schema-validated before reading or saving. Names must not contain obvious links, credentials, email addresses or control characters. Only names, generated IDs and three enum filters persist — never note text, alert identifiers or inbox data.
- The Home queue includes a manually viewed **local review workload snapshot**. It counts recent personal note events in a rolling seven-day window versus the preceding seven days, plus the current number of locally tracked active, overdue and reviewed-personally entries. These are not server event trends, workforce productivity figures or live alert metrics. Limited history (40 notes total) makes longer-term conclusions inappropriate.
- The manual **safe report preview** shows aggregate numeric counts, enum filters and a generation time. It excludes note bodies, alert numbers, device identifiers, business data and authentication details. It does not copy to clipboard, export, print, upload, notify, acknowledge or resolve anything.
- The existing per-alert browser-only notes and bookmarked pages remain unchanged. Missing or moved server notifications remain unverified.

## Source and tests

- [`followUpQueueInsights.ts`](../apps/web/src/followUpQueueInsights.ts): versioned storage, validation, presets, deterministic workload windows and redacted report preview.
- [`OwnerFollowUpInsights.tsx`](../apps/web/src/OwnerFollowUpInsights.tsx): accessible queue presets, workload snapshot and explicit report preview controls.
- [`HomeActivitySummary.tsx`](../apps/web/src/HomeActivitySummary.tsx): integration into permission-scoped Home queue.
- [`followUpQueueInsights.test.ts`](../apps/web/src/followUpQueueInsights.test.ts) and [`HomeActivitySummary.test.tsx`](../apps/web/src/HomeActivitySummary.test.tsx): negative and happy paths, account isolation, invalid stored records, sensitive content exclusion, and no inbox writes.

## Important boundaries

- A local note marked `reviewed_locally` does **not** prove that a source alert was resolved or acknowledged.
- No cross-device sync or encrypted storage is implied. Do not put secrets, addresses or camera credentials in local browser notes or preset names.
- GitHub source checks passing do **not** establish that this version is installed on Ree's Windows mini-server, that the physical cameras or devices have been accepted, or that the private Comms Hub connection has been activated.
- The separate [Build 281 module coverage report](BUILD_281_OWNER_FOLLOW_UP_QUEUE_AND_MODULE_BASELINE.md) remains provisional until device and per-application acceptance evidence is gathered.
