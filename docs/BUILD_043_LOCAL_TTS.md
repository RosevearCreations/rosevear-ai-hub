# Build 043 — Local Text-to-Speech (Windows SAPI)

## Scope

Authenticated, explicitly initiated **Speak / Speak excerpt / Stop voice** controls for completed Hub assistant messages. Windows' built-in System.Speech SAPI engine renders audio in a process on the same test server. The browser plays the downloaded PCM WAV in memory. No automatic reading, wake word, command execution, microphone capture, paid service, online voice provider, or cloud dependency is introduced.

### API and privacy contract

- `GET /api/v1/tts/status`: authenticated Owner, Administrator or Household user, reports availability of enabled Windows PowerShell and `scripts/tts-sapi.ps1`. Unsupported hosts and disabled TTS are fail-closed.
- `POST /api/v1/tts/synthesize`: authenticated JSON `{"text":"..."}` (1–600 characters); returns `audio/wav`, `Cache-Control: no-store`, with a 20 MiB hard limit.
- A per-request OS temporary folder holds UTF-8 text and SAPI-generated WAV. Both are deleted when request completes or errors. No raw audio, words, stdout or stderr are logged or inserted in the Hub database by TTS.
- Text is passed through a file path to a local PowerShell script; arbitrary user text is never evaluated as a command or interpolated into PowerShell code.
- Only preinstalled Windows voices are used; no third-party voice downloads, outbound requests or subscription.
- Playback is a voluntary user click on completed assistant responses. Stop pauses playback and revokes the audio URL; starting a second message stops the first. Replies over 600 characters offer an explicitly labelled excerpt.
- No automatic text-to-speech after AI responses and no trigger of device, camera, Home Assistant, business or MQTT changes.

## Windows server setup

Build 043 uses the existing Windows SAPI engine; separate speech model downloads are **not** required for TTS. The Build 042 Whisper STT binary and model are unrelated and unchanged.

1. Update the Windows server using the repository's `scripts/update-test-server.ps1` with the exact promoted `main` commit. The update does not replace the custom Windows logon/recovery scheduled tasks, .env, or camera configuration.
2. Verify `/version` reports `0.0.43`. Restart **only** the API via the verified recovery task if the old process still reports `0.0.42`.
3. Sign in using the existing local Hub account before testing Chat; `401` on protected APIs is a session/login issue, not a missing voice engine.
4. Open Chat and inspect the local voice availability message. On a completed assistant reply, select **Speak**, check that Windows speaks through the browser device, then **Stop voice** and verify playback ends.
5. If unavailable, check Windows PowerShell `System.Speech` assembly and installed speech voices. The API returns a sanitized error if synthesis fails.
6. For the Windows test server: `TTS_ENABLED=true` (default), `TTS_SAPI_SCRIPT_PATH=./scripts/tts-sapi.ps1` (default), `TTS_TIMEOUT_SECONDS=60` (5–180). Set `TTS_ENABLED=false` to disable playback immediately upon API restart.

## CI and acceptance

- Backend unit tests use a mocked PowerShell executable to verify pre-bootstrap authentication, disabled engine fail-closed behavior, strict text length, subprocess argument hygiene, cleanup, successful PCM WAV, invalid WAV and sanitized errors.
- Web tests verify truncation to the acknowledged maximum; web typecheck/test/build must pass.
- Windows CI validates desktop build; local SAPI speaker audio requires physical Windows test-server acceptance and browser audio permission to be marked operational GREEN.
- No database migration, new runtime Python dependency, or change to startup/recovery scripts or Ollama.

## Release caveats / rollback

Build 042 speech-to-text authentication/browser session issue remains separately tracked until the existing Hub account is verified signed in; do not bypass protected APIs to make TTS appear ready.

Rollback: switch to prior `main` commit, or set `TTS_ENABLED=false` in private local .env then restart the API. No generated voice data or persistent state is migrated. End-to-end TTS operational acceptance requires a live Windows SAPI voice test, not only PR CI.
