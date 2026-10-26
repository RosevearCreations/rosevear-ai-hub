# Build 142 — Camera Events & Evidence Playback Workbench V2

## Operator workflow

1. Open Cameras → Frigate and deliberately select **Refresh Frigate** for a fresh local read of up to 100 recent Frigate events. The source observation time is shown; a sample older than five minutes is labelled stale. Unavailable Frigate components do not prevent the Hub camera registry or private local review index from being used.
2. Inspect the combined evidence timeline: rows labelled **Frigate recent sample** are observed provider event metadata; **Hub local review only** means a saved operator note whose original event is absent from the current sample. This does **not** mean a clip or snapshot still exists.
3. Filter by source, camera, object category, review state and inclusive **local-calendar** from/through dates. Sort oldest/newest. Choose local or UTC display of timestamps. An invalid/inverted date range is held and can be cleared.
4. Duplicate identical event IDs are reconciled deterministically; conflicting camera/label/timestamp identities (including a mismatch against saved Hub review identity), inconsistent media flags, invalid/reversed times and events more than five minutes ahead of the local clock are held as unverified. These rows do not claim usable media. A snapshot/clip flag is only a past **metadata report**. Actual retention is unknown, and older footage may already have expired.
5. Owner/Admin may deliberately **Acknowledge for follow-up** a current, non-conflicted, recent event. This saves the existing private `camera_event_reviews` record with `review_status=follow_up`, preserving any saved note and the existing audit trail. The backend independently verifies the event remains in the bounded current Frigate source set. Read-only roles cannot access private review notes, acknowledge events or export review metadata.
6. No authenticated Hub event media endpoint currently exists. The workbench does not invent a clip URL, embed unauthenticated Frigate footage, pass source URLs to the browser, download video, or link to raw RTSP endpoints. Playback remains **On hold** until a separately reviewed, owner-authorized private media contract is available. Build 141 live camera preview remains independent.

## Technical boundary and verification

- Reuses `GET /api/v1/frigate/events`, `GET /api/v1/frigate/reviews`, `PUT /api/v1/frigate/events/{id}/review` and the existing reviewed metadata CSV export. The only API contract extension is the bounded `follow_up` review state; there is **no new migration**, no Frigate write, no retention/configuration change and no media endpoint added.
- The Frigate panel tolerates partially unavailable status/camera/events reads, keeps source errors generic, hides private internal service addresses and independently labels the event sample's freshness.
- UI/pure-model tests cover duplicate and out-of-order fixtures, cross-source review-only history, deterministic tie sorting, invalid dates, local end-day boundaries, future clock drift, reversed timestamps, stale/offline holds, no iframe or raw playback link, role boundaries and intentional follow-up updates.
- API tests verify owner follow-up persistence and read-only denial. Run backend lint/format/full tests, web typecheck/full Vitest/build, protected feature PR, independent `dev` push, production PR and independent `main` push (five jobs each). **GitHub source GREEN is not Windows household recorder acceptance.**

The Owner must separately update and verify the Windows Hub, exact Frigate camera/event identities, real media availability and camera clock/timezone on the private LAN. No physical camera operation, recorder retention change, exposed stream or local update is claimed. Vault is still **HARD SECURITY HOLD / 0 of 6 VERIFIED**.

Next queued: **Build 143 — MQTT Topic Explorer, Device Mapping & Publish Preview**.
