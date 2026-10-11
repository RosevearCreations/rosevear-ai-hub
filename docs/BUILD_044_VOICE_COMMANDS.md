# Build 044 — Voice Commands and Confirmations

## Scope

Build 044 adds a deliberate **review → explicit confirmation** path for local spoken Home Assistant commands. It reuses Build 042 local microphone transcription, Build 024 deterministic resolution, and Build 023 audited low-risk device controls. It never delegates physical-action interpretation to Ollama or treats speech as proof of a user's identity.

- Dictation is held in a separate editable **Recognized words** field. It never automatically enters Chat or triggers a Home-profile chat command.
- **Review voice command** calls authenticated `POST /api/v1/voice/preview` with up to 300 text characters. The endpoint only parses/reads; it cannot change a device.
- A resolved exact, allow-listed **single** light, switch, or scene displays its friendly name, entity ID and action. **Confirm exact action** invokes the *existing* `POST /api/v1/home-assistant/control` API, which re-checks current allowlist, hazard policy, tool risk, current target and user role and emits the existing audit record.
- Ineligible commands (ambiguous, partial-name, bulk, unsupported, hazardous, non-allowlisted, missing service) cannot be executed. No automatic retry after an uncertain action result.
- A non-command question may be moved into Chat only after a successful `not_home_command` preview and a separate **Move question to Chat** click.
- Transcript text edits invalidate the prior preview. The UI clears confirmation immediately on click to prevent multiple submissions from one preview.
- Level-2 business writes, other privileged actions, Level-3 hazardous operations, and voice-only spoken confirmations are **not** introduced. They continue to require the existing dedicated confirmation workflow or stay prohibited.
- Voice actions are **not** globally enabled by simply installing Build 044: Home Assistant must be configured, the specific safe device must be allow-listed on Devices, local speech must be available if using a microphone, and the user must sign in.

## Endpoints and security boundaries

`POST /api/v1/voice/preview` requires the owner, administrator, or household-user role, including pre-bootstrap. It returns safe, server-resolved status and target without executing tools. Read-only users get HTTP 403. Unsupported or ambiguous speech fails closed. The endpoint does not persist transcription or audio.

The actual device action uses the same role-protected, audited low-risk control API that existed before this build. Build 044 does not add a new action bypass or higher-risk tool. The UI confirmation is explicit but is **not** a server-issued one-time Level-2 approval token; existing Level-1 controls are intentionally directly callable by an authenticated user. Future stronger replay/nonce requirements should be separately designed before extending voice execution to any higher-risk actions.

## Windows setup and acceptance

1. Update test server to final promoted `main` commit; verify `/version` returns `0.0.44` after restarting only the Hub API if necessary.
2. Sign in to the existing Hub account. Known 401 responses must be resolved through normal login, never by weakening API authentication.
3. In Chat, optionally use **Record locally** with the existing Whisper setup, or type a single utterance in **Recognized words**.
4. Try an exact allow-listed safe light (for example, `turn on the living room lamp`). Click **Review voice command**. Verify exact target ID and action, and ensure **nothing has changed yet**.
5. Click **Confirm exact action**. Verify device state changed once and existing `tool.execution.completed` Audit entry exists. If uncertain, inspect the device before retrying.
6. Try `turn off all lights`, `unlock door`, a hazardous switch, an unapproved target and an ambiguous nickname. Confirm that no Confirm button appears.
7. Change the transcript after a preview, and confirm the stale action is not executable.
8. Test an ordinary question. After explicit review, use **Move question to Chat**, which only populates the editable Chat composer, without sending it.
9. Test as read-only and logged-out users. Confirm HTTP 403/401 and no device action.

## Tests, release and rollback

Backend tests cover role/auth, parser read-only operation, exact target preview, blocked unsafe/ambiguous actions, text limits and integration with the existing audited control API. Web tests cover explicit second click, fail-closed preview, stale review invalidation. CI requires backend Ruff/pytest, TypeScript/Vitest/Vite, documentation, and Windows desktop artifact.

No database migration, paid service, new model, cloud speech, Windows Task Scheduler update, Home Assistant/MQTT/Ollama/go2rtc startup modification, or extra device permission is required. Roll back the application commit; device policies and local user settings remain untouched.

**Acceptance terminology:** passing CI makes the Build 044 code release GREEN on `main`. Real voice-to-device operational acceptance requires the Windows server to run v0.0.44, a valid login, and an observed preview/confirmation test on an approved device. The local 043 version at the start of this build may still have been v0.0.42; the updater does not restart that Python process automatically.
