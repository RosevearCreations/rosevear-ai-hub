# Build 113 — Installed Windows Hub Version & Field Evidence Adoption

## Goal and evidence boundary

Provide an owner-only, read-only **System → Installed Windows Hub version & field adoption** workbench that compares an owner-confirmed protected `main` GitHub Actions release reference with the Windows installation's local updater pointer, running API package version and the exact web asset build fingerprint. It can also import the private Build 112 drift handoff in a strictly reduced form.

**A GREEN repository workflow does not install or start the Hub.** A downloaded `rosevear-ai-hub-windows` artifact is a package, not proof the Windows server has installed it. A local `active.json` pointer or `ADOPTED` update log likewise cannot identify which Python process is still running. A response from `/version` gives the backend package version, **not** the source commit loaded by that process. Matching frontend and updater SHAs are useful evidence, but must not be described as physical or machine-verified acceptance.

## Operator procedure — on the installed Hub

1. In the official repository, open [the Build and test workflow](https://github.com/RosevearCreations/rosevear-ai-hub/actions/workflows/foundation.yml). Find a successful `main` **push** run, copy its complete 40-character head commit SHA and the run URL. Confirm these are for the same run. The web UI accepts them as **owner-entered, not independently verified** references. It makes no GitHub API call.
2. On the actual Windows server, sign in as owner or administrator and open **System → Build 113**. Paste the SHA and Actions run URL and select **Check installed Hub evidence**. This makes on-demand same-origin, authenticated, read-only API requests. No scheduled update, service restart, repo fetch or device command occurs.
3. Read three independent observations: compiled frontend SHA/clean flag; `logs/hub-deployment/active.json` SHA exposed through existing release observability; backend package version from `/version`. Any unavailable, different or dirty source remains a hold. If the frontend stamp differs, confirm which host/PWA tab is open and supervise a fresh browser reload before another check; a cached or older UI must never be passed as current.
4. Optionally import a private Build 112 drift handoff JSON (max 1 MB). The browser validates its schema, timestamp lineage and bounded HA/camera counts, discarding all device names, addresses, tokens and camera URLs. This import is **historical owner evidence**, not restored inventory or video.
5. After an actual local observation, mark the two session-only owner checks: the Windows Hub was opened, and the installed browser/PWA was reloaded. Changing the expected SHA/run or refreshing evidence clears these acknowledgments. They do not prove backend process identity.
6. Download the metadata-only JSON **field adoption hold** receipt and keep it privately. Confirm no secrets or device identities appear. Continue supervised Home Assistant, MQTT, camera stream and post-reboot checks in Builds 114–118.

## Evidence classifications

| Source | What it proves | What it does not prove |
|---|---|---|
| GitHub successful `main` workflow | Source CI and Windows package have passed the recorded jobs, after verifying the URL on GitHub | Installed server, fresh PWA or working household equipment |
| Frontend compiled commit, clean flag | Which tracked checkout was used to produce these browser assets | Backend process, freshness of other browser windows, or full artifact provenance |
| Local updater active SHA and state | What the existing local adoption pointer/journal recorded | Running process uses that SHA, success of reboot or backup recovery |
| `/version` | Running backend responded with its package version | Git commit for its executing source |
| Imported Build 112 handoff | Bounded private historical review lineage and unresolved counts | Independent physical verification, camera live video, immutable signed chain |
| Owner checkboxes | What was manually acknowledged in this panel session | CI, installed executable identity, Home Assistant device function or camera playback |

## Safeguards and failure modes

- No direct GitHub fetch, shell execution in the client, automatic install/rollback, local server mutation, HA enrollment, RTSP lookup or camera control.
- SHA must be lowercase/uppercase 40-hex (normalized for comparison); run URL must match this exact repository's GitHub Actions run path. A syntactically correct pasted reference remains **owner-supplied**, not cryptographically authenticated.
- Build-time browser source SHA comes from a bounded `git rev-parse HEAD` query; clean check uses tracked files only. If Git is missing, frontend provenance is unknown and cannot be declared current. Untracked build inputs and runtime environment may still affect the bundle.
- The UI accepts only 1 MB of private Build 112 JSON and derives timestamps/counts only. Imported files are not uploaded and are not persisted to local storage.
- Network/permission failures are `unknown` or `not recorded`, never zero devices or implied success. Read-only requests abort on unmount/retry.
- **FIELD ADOPTION HOLD remains the output even if the user-entered main SHA, browser fingerprint and local pointer agree.** Independent process identity and actual live device/camera verification remain owner-supervised.

## Test and promotion requirements

- Pure parser/assessment tests: valid and invalid source references, different/stale/dirty browser assets, absent local evidence, private handoff allowlist and bad lineage, all-green-looking evidence still produces a HOLD.
- React UI tests: no automatic backend access, on-demand read only, safe failed API response handling, clear non-GREEN UI and no install/restart controls.
- Full web TypeScript check, web build/test suite, CI web/backend/docs/Windows executable and backup gates on feature PR, `dev`, promotion PR and `main`.
- Actual Windows installation/field acceptance requires owner checks outside CI. No test fixture or simulated receipt may close this operational hold.
