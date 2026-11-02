# Build 223 — Owner Preferences, Saved Views & Recovery Safety

The authenticated owner/administrator **System** workspace now includes a display-only saved-view editor. It captures the current Standard/high-contrast theme and comfortable/compact density plus a preferred destination (Home, System, Devices, Cameras, Workshop, Search & Help). An owner can name and save up to twelve views, explicitly apply a saved view, remove individual views, export JSON, validate an import or reset saved views without touching the rest of the Hub.

Preferences are stored only in browser localStorage under an owner-ID-scoped key. They are not synced across devices; export/import provides manual transfer **only to a session with the same owner ID**. This is not a secret store and makes no claim about a browser's physical privacy. Applying a view changes the current session's display and screen; it never invokes system or device operations.

## Security and recovery guarantees

- Strict `schemaVersion: 1` document with exact permitted keys; imported future/legacy versions, malformed JSON, excess size (16 KB), wrong owner, too many views, duplicate names, unexpected keys (including credentials or audit fields), and unknown values are rejected without replacing saved views.
- Each named view contains only `name`, `theme`, `density`, and `startSection`; no token, password, accepted Windows field receipt, audit event, network endpoint, sensor reading or integration authority.
- Reset clears *only* display views belonging to the currently authenticated owner ID. It does not delete security decisions, audit history, preferences from other owner IDs or owner field acceptance evidence.
- Account role separation: only owner/administrator sessions render the editor. Other roles retain only the existing session-local contrast and density controls.

## Owner Windows acceptance

1. As owner, save two named views, switch contrast/density, apply each, navigate away and back, and confirm the views remain on that browser.
2. Refresh and confirm the same owner's named views persist. Switch to a different account and verify no other owner's view appears.
3. Import a valid same-owner export; test invalid JSON, old/future schema, extra secret field, duplicate name and wrong owner ID. Confirm the pre-existing views remain unchanged after rejection.
4. Reset display views, confirm the current theme remains unchanged, and verify no owner field trial, security, maintenance or audit evidence was changed.
5. Test keyboard tab/focus, laptop/tablet widths, compact density and both Standard/high-contrast themes.

QL-275 remains **Under Review / deferred**. CI source GREEN does not prove installed Windows acceptance.
