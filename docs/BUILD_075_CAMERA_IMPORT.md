# Build 075 — Camera Inventory UI Server Adoption, Migration Acceptance & Conflict-Safe Import

## Implemented
- Separate **owner/administrator** browser worksheet import workflow in Cameras → Shared Inventory.
- Existing Build 073 browser-local records are read only on explicit "Preview browser entries", never transmitted on page load.
- Preview compares normalized brand, exact model and room/location against server records, marks existing models as conflicts, and never changes server data.
- Owner must check an explicit review acknowledgement before importing only preview-ready records. The server revalidates the inventory snapshot and all entry identities before a single all-or-nothing commit.
- SQLite migration `0020` adds a nullable, unique camera identity fingerprint. Legacy Build 074 records stay unchanged; all new writes check both old rows and unique keys.
- Imported entries get fresh revision 1 and remain **unapproved**. Legacy local approval flags are ignored; new server approval and audit evidence are required.
- Previous browser-local inventory remains intact after successful or rejected import. Retry previews safely show previously imported records as conflicts.
- Existing camera registrations, streams, Home Assistant, MQTT, go2rtc, Alexa and Frigate stay unchanged.

## Local Windows migration acceptance
Repository CI proves migration logic in an isolated test database, **not** installation on the owner's running Windows Hub.

1. Back up the live Hub SQLite database using the approved Windows encrypted backup/recovery process, and verify that backup is readable.
2. Confirm Home Assistant and MQTT connectivity before applying the installation. Do not restart or reset these integrations for camera import.
3. Install a verified `main` release through the existing managed update workflow; do not manually replace live database files.
4. Verify Alembic revision `0020`, inspect the new nullable identity-fingerprint field, and confirm pre-existing camera model rows/approvals are unchanged.
5. Log in as the owner, open Cameras → Shared Inventory, and preview legacy local entries from **the same browser profile** that contains the Build 073 worksheet.
6. Confirm duplicate matches are skipped, inspect individual methods/evidence for secrets and inaccuracies, explicitly approve the import, and verify imported entries are unapproved.
7. Re-preview to verify idempotency (the same records show conflict), and examine the server ledger for individual `imported` events.
8. Verify the existing Hub/HA/MQTT/go2rtc runtime status separately. Do not claim camera playback or Windows installation success based only on GitHub CI.

## Conflict handling
- A newly added or updated server record or approval after preview invalidates the snapshot (HTTP 409; preview again).
- Duplicate model/location entries inside a selected batch are rejected with HTTP 422.
- Existing rows are never overwritten; the server transaction is all-or-nothing.
- Unique identity indexes prevent duplicate imports even under simultaneous requests.
- New manual server records use the same fingerprint checks, including legacy rows from Build 074.
- There is no automatic localStorage deletion or silent copy of browser approval status.

## Limits
Preview maximum 50 camera models per request and 100 rows in the Build 073 browser worksheet. An owner must manually curate larger inventories before import. The identity collision key assumes one camera model at a room/location; distinguish multiple identical physical units by their location labels before importing. This is a compatibility planning registry, not an active camera transport or credential store.

## Next milestone candidate
Build 076 — Identity-Bound Camera Import Acceptance & Local Windows Migration Field Verification.
