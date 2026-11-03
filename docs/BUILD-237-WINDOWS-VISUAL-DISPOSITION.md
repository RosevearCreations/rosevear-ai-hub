# Build 237 — Windows Visual Finding Disposition, Owner Retest Evidence & Conditional UI Repair Readiness

## What this build delivers

An owner-only, initially closed retest and disposition worksheet **inside the existing Build 236 System screen**. It consumes Build 236 owner-entered findings *from the same browser session*. No independent real-Windows evidence has been provided at source release time. Consequently, the default Build 237 state is **zero** findings, retests, outside verifications, authorized repairs and executed repairs.

It does not poll the mini-server, send device requests, capture screenshots, upload logs, authenticate outside reviewers or perform any UI repair. Browser/session closure discards unsaved owner entries. Source CI certifies the code only, not the actual Windows installation.

## Owner steps on the installed Windows Hub

1. Choose Dark Mode and visit **System → Build 236**. Open its worksheet and enter the observed installed version, Windows witness acknowledgment, viewport, an actual finding or blocker, symptom and safe evidence code. Record the fresh observation.
2. Under the Build 236 worksheet, open **Build 237 Windows retest and disposition**. The original source issue and reference appear automatically. A changed/invalid Build 236 record cannot become a valid candidate.
3. Retest manually on the same installed Windows version and viewport. Enter pass/finding/blocked, a **new unique code**, symptom if not a pass, and a separate personal-witness acknowledgment. Select **Record fresh Windows owner retest**.
4. A reported pass remains an **open source finding** until genuine independent review. A blocked or different-symptom retest cannot authorize UI work. For the same persistent symptom, select a safe owner disposition: **another retest**, **defer**, or **request UI-only review**. Requests for UI-only review must match the original category (glare/theme, contrast, responsive navigation, focus, or preference persistence).
5. Enter another **distinct** decision code, separately acknowledge the request (not repair approval), and record the disposition. Use the **Copy redacted Build 237 owner handoff** button to share only sanitized codes if appropriate. Do not include images, logs, names, addresses, passwords, private URLs, IPs or camera/device IDs.

## Acceptance and repair boundaries

| Decision or evidence | Build 237 result |
| --- | --- |
| No genuine Build 236 observation | Empty, no repair candidate |
| Source version/theme/witness or receipt changed | Source stale — retest invalidated |
| New retest code duplicates any Build 236/237 reference | Not accepted |
| Retest viewport mismatch or timestamp not after source | Not accepted |
| Owner reports pass | Recorded as self-report; original finding stays open |
| Retest blocked or different symptom | Remains open; no UI review readiness |
| Same persistent symptom, matching UI-only area, unique code, acknowledged later decision | **Review request ready** only; no repair approval |
| Any code CI or PR GREEN | No change to physical-Windows or outside-review status |

No owner permission for an actual UI correction or Windows installation is inferred by a completed worksheet. Separate real findings, independently authenticated review where applicable and **explicit owner repair authorization** are required before a later repair build.

Technical holds retained: **six app connections DISCONNECTED/HOLD**, **private relay OFF / not installed**, **QL-275 UNDER REVIEW**, **vault SECURITY HOLD**, authenticated gateway GETs **0**. No physical device or camera retests and no live integration actions are authorized.

## Source verification

- `npm run build:237:hub:test` — Build 237 sources, Build 236 regressions and theme preference.
- `npm run web:typecheck`, `npm run web:build`.
- Push `dev`, require all jobs green; PR from `dev` to `main`, require review checks green; merge and require exact-`main` workflow GREEN. Record commit SHA and workflow links. Installed Windows acceptance must be reported as unverified until the owners provide authentic observations.
