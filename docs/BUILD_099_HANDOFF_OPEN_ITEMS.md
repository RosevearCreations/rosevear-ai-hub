# Build 099 — Outstanding Handoff Review Digest

## Scope
An explicit read-only manual review debt digest now appears in the private operations handoff acceptance area and the copyable handoff text. It counts pending follow-up acknowledgements and pending safe-first-check instruction reviews independently, for the active Home, Workshop, or Business manual snapshot only.

The digest is made solely from the allowlisted action keys and the existing local-memory review flags. A full set of review marks never implies that equipment is safe, a service is reachable, a problem is repaired, or an incident resolved. Empty queues also do not imply health.

## Operator acceptance
1. Open Operations overview Home and inspect Handoff acceptance checklist. With three suggested follow-ups it should show 3 of 3 pending follow-up acknowledgements and 6 of 6 pending safe-check instruction reviews.
2. Check a single safe-first-check instruction; only the instruction pending count decreases. Mark one follow-up reviewed; only the follow-up pending count decreases.
3. Open Show private handoff report and confirm those same totals appear as plain text, accompanied by a clear independent-verification warning. No raw tokens, hostnames, paths, camera details, customer records or provider errors should appear.
4. Tick both steps and the acknowledgement for every Home follow-up. Both pending counts should reach zero, but the warning must still say independent verification is required.
5. Switch to Business then Workshop; counts reflect only the selected context with fresh review flags. Refresh overview to reset all browser-memory review marks.
6. Read-only operators may annotate their transient review UI, but this does not send commands or change permissions, services, devices, records or schedules.

## Security, rollout and rollback
Frontend-only deterministic review counters; no new backend route, cloud dependency, database, local file, browser storage, network calls beyond existing manual snapshots, MQTT publish, Windows service task, equipment control or business write. No automatic report transmission.

Release: five GitHub checks per dev PR, dev push, isolated protected-main PR and main push, then history sync PR and final dev push. Roll back the scoped component/tests/roadmap/runbook files via reviewed PR. GREEN GitHub code does not imply installation, uptime, reboot persistence or physical acceptance on the local Windows PC.

## Next queued
Build 100 — scope to be confirmed from Home, Workshop & Business operational priorities.
