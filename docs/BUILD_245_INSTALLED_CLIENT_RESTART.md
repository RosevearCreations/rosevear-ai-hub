# Build 245 — Installed Windows Release Receipt & Owner Field Acceptance

## Owner-visible client restart

The authenticated shell now offers **Restart Client** in the top bar. An explicit
second confirmation checks the local server with `cache: no-store`, asks an
existing service worker to update if available, and navigates to a fresh URL.
An offline/failed server check leaves the current page intact and reports the
problem. The action does not invoke a backend endpoint, Scheduled Task, process
restart, Windows reboot, Home Assistant, MQTT, cameras or any physical device.

The Update Hub panel explains the distinction between a *client reload* and
*installed-release activation*. The screenshot from November 4 shows a live
0.0.57 development backend and the old white interface. This is evidence of
installed-version drift, not proof that the new GitHub branch is running on the
Windows host. The new control cannot appear until the supervised first
activation installs the updated web files and restarts the managed web service.

## Owner field receipt (HOLD until observed)

Use the existing System → Installed Hub Adoption panel to export the redacted
receipt. Collect the active release pointer, backend version, browser source
SHA, Windows adoption/Recovery task outcome, rollback evidence and owner field
checks. Treat agreement of locally reported values as *reported alignment*,
not independent machine or camera acceptance. Do not mark the installed host
GREEN from GitHub CI alone.

## Next logical build

Build 246 — Windows Client First-Activation Field Reconciliation, Read-Only
Recovery Assistant & Post-Restart Visual Acceptance. Requires real Windows-host
evidence before any corrective action is authorized.
