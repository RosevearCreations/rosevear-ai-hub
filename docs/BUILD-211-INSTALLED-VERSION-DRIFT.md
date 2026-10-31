# Build 211 — Installed version, configuration drift and release-to-device verification

The existing Build 113 **Installed Windows Hub version & field adoption** workspace now gives a more usable mismatch readback. It compares only source-backed browser build SHA, owner-entered immutable `main` SHA and GitHub Actions run URL, backend package version, and local updater `active_release` / adoption state. It **does not** query GitHub or infer a running Windows process commit from Python package version.

A fixed, bounded list suggests specific *manual* inspections for missing/dirty/stale browser source, different or absent release pointer, missing backend reply, and failed/rollback-failed updater records. It never installs, reboots, restores, downloads or mutates a service. A reported source alignment still requires independent process, boot, device and camera verification.

Two owner-only session checks record whether a post-reboot walkthrough and the existing manual rollback/safe-stop procedure were personally reviewed. These checks reset when the expected SHA, CI run or local snapshot changes. Exported private receipts include only the booleans and remain `machine_acceptance: false` and `physical_camera_acceptance: false`; original adoption field HOLD is preserved.

Validation: `npm run build:211:hub:test`, full web tests, `npm run web:build` and required GitHub feature/dev/exact-main five-job CI. No actual Windows installation acceptance has been performed by source CI.

QL-275 remains **Under Review / owner-deferred**; integration stays **DISCONNECTED/HOLD**, relay **OFF**, authenticated gateway GETs **0** and owner TEST permission **NOT GIVEN**. First-party vault remains SECURITY HOLD.

**Next Build 212 — Home Assistant Device Inventory Reconciliation & Missing-Device Workbench (QL-275 Deferred).**
