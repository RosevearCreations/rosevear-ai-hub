# Build 228 — Windows Owner Field Acceptance, Regression Matrix & Next Roadmap

## Delivery

The owner-only **System > Windows field acceptance & regression matrix** provides 11 repeatable on-device checks, each with a real-module navigation action. The matrix covers:

1. Dependency-ordered Windows startup and partial-service recovery.
2. Actual installed version and rollback identity.
3. Home Assistant device identity reconciliation.
4. An authorized supported camera and safe fallback.
5. Read-only MQTT status and X10 bridge boundaries.
6. Standard theme on laptop and tablet screens.
7. Keyboard focus, navigation and recovery.
8. Owner/administrator vs household role guards.
9. Encrypted backups and disposable isolated restore evidence.
10. Manual safe-stop and rollback walkthrough.
11. Real Windows CPU, memory, disk and Ollama resource observations.

## Evidence semantics and security

- All items default to **Not tested**. There are no automatic probes, mocked-green field results, credentials, remote connections or device control actions.
- For a **pass to count**, the owner must attest to inspecting the installed Windows Hub, provide an installed release identifier, select a direct observation/log/supervised retest basis and enter a short local reference. This still only records an **owner-reported pass**. It is **not independent certification**.
- Findings and blocked outcomes create a prioritized, specific next-action roadmap. Unverified attempted passes remain visible as **Pass needs on-device evidence**.
- All draft information is held in memory and stays mounted when navigating among modules. The explicit **Copy private owner field handoff** action produces a local-only text summary. No server persistence, uploading or automatic production action. Copy before reload or closing the page.
- Never enter passwords, addresses, private network URLs, camera images, PII, keys or private log contents. Reference codes point to separately held local evidence.
- Source CI, installed Windows results, independent witness acceptance, hardware-camera support and cross-application approvals are separate concepts. Six-app integration stays **DISCONNECTED / HOLD**, private relay **OFF**, QL-275 **Under Review / Deferred**, and first-party vault **SECURITY HOLD**.

## Acceptance and current truth

Run `npm run build:228:hub:test` plus complete web/type-check, Python/backend and Windows desktop CI. Follow feature → `dev` → `main` and verify the exact-main run. Source GREEN proves only the versioned UI and safety checks reached `main`.

**Installed-device acceptance remains unverified until the owner enters real Windows observations.** No local hardware, camera, security or source-proof gate is certified by this release.

## Next roadmap (proposals, not automatically authorized builds)

- **Build 229 candidate — Owner Windows Finding Triage & Source-Matched Repair Planning.** First gather authentic field observations, classify blocked/failing checks and fix the highest impact reproducible issue.
- **Build 230 candidate — Installed Recovery and Device/Camera Retest Closure.** Only after Build 229 evidence identifies affected subsystems; preserve safety holds and get fresh on-device retest receipts.
- **Build 231 candidate — Accessibility, Roles, Backup and Resource Closure.** Scope against observed gaps instead of assuming issues or acceptance.

Until that evidence arrives, the next prioritized owner task is to run the Build 228 walkthrough and export the private field handoff.
