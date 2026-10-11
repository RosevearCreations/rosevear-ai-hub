# Build 042 — Local Speech-to-Text

## Release scope

A local-only, opt-in microphone-to-text **draft** for authenticated Chat users. Recording begins only after pressing the microphone control and granting browser permission; speech is never sent as a chat message automatically. The transcript is inserted into the existing editable Chat prompt for explicit review. Physical commands and business writes retain their existing safeguards.

Build 043 text-to-speech and Build 044 voice commands/confirmations are **not** part of this milestone.

## Architecture and privacy

- The browser uses Web Audio to capture a bounded **20-second** recording, downsamples to 16 kHz mono PCM and sends a WAV file to the local API at `http://127.0.0.1:8765` only after Stop and transcribe (or at the time limit).
- `POST /api/v1/speech/transcribe` is authenticated, fail-closed, accepts only 16-bit mono 16 kHz PCM WAV, limits upload to **1.1 MB** and recording length to **30 seconds**; MIME and actual WAV contents are validated.
- The backend executes only the administrator-configured local `whisper-cli.exe` and a model file by direct argument list (no shell). No remote speech API, paid subscription, cloud upload, streaming, background surveillance, wake word, or automatic action execution.
- An operating-system temporary directory holds a WAV and a text output for this single request, automatically deleted on completion or failure. Audio, stderr, and recognized transcripts are not written to the Hub database or application logs by this endpoint. Normal session and web-server access logs may still record requests; approved Chat text is persisted only once the user deliberately sends it.
- Endpoints: `GET /api/v1/speech/status` and `POST /api/v1/speech/transcribe`. Both require a signed-in user; no database migration.
- Missing binary/model returns an unavailable status or HTTP 503. CPU-only inference can be slower on some machines; a 120-second default timeout prevents hanging indefinitely.

## Optional free Windows setup

No model is fetched or installed by deployment. To enable locally:

1. Obtain a compatible Windows x64 **whisper.cpp** `whisper-cli.exe` binary and any accompanying runtime DLLs from the project's official release source, and put them at `C:\Users\Ree\rosevearaihub\tools\whisper\`.
2. Obtain the GGML `ggml-base.en.bin` English speech model from the official whisper.cpp model distribution and place it at `C:\Users\Ree\rosevearaihub\data\speech\ggml-base.en.bin`. This download is operator-approved and is not bundled in GitHub. For multilingual speech, use a compatible non-English model and change the configured path.
3. If necessary, configure `SPEECH_EXECUTABLE_PATH` and `SPEECH_MODEL_PATH` in the private local `.env` file. Optional `SPEECH_TIMEOUT_SECONDS=120` (10–600). Never commit the binaries, model or local .env into the repository.
4. Keep the Hub backend and web on loopback. Refresh **Chat → Check speech setup**; status should report "Local speech recognition is ready."
5. Select **Record locally**, grant microphone permission in the browser, speak briefly, then **Stop and transcribe**. Verify that recognized text appears in the Chat prompt, correct mistakes, and only then press Send.
6. Test microphone denial, cancel/discard and empty/silent audio. Model recognition accuracy and availability require real-device verification; CI uses a fake CLI and checks the WAV contract without downloading models.

The browser must run on a secure origin (localhost works). Browser microphones are not automatically available when accessing the UI from another LAN device over plain HTTP. The Windows Tauri shell may also need separate microphone permission review before being used as a recorder.

## Verification and rollback

- Backend tests: authentication, fail-closed model status, bounded validation, fake local subprocess, transcript response, temporary WAV deletion, sanitized CLI errors.
- Web tests: WAV header/PCM encoding, resampling, invalid sample rates.
- CI: `ruff check server/src server/tests`, `ruff format --check server/src server/tests`, `pytest`, TypeScript typecheck, Vitest, production web build, Rust Windows desktop check and artifact.
- Operator acceptance: install optional local model/binary, verify microphone consent and transcription on Windows. **Do not label functional microphone recognition GREEN until that passes.**
- No database migrations, new paid services, or changes to Windows recovery tasks, Home Assistant, MQTT, Ollama or cameras.
- Rollback: revert Build 042 application changes or disable by removing the configured speech binary/model paths. Existing Chat text typing still works even when speech is unavailable.
