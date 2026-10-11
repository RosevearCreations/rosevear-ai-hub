# Build 041 — Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup

**Status: service-recovery acceptance GREEN on the Windows test server; merged to `main`. End-to-end camera-feed playback and independent post-merge Production CI verification remain open.**

## Bounded recovery runner

`scripts/hub-recovery.ps1` independently checks the API, web, and optionally go2rtc. It never kills unrelated services, processes, or cameras, and refuses duplicate launch when a port is occupied but unhealthy. Logs are stored under `logs/hub-recovery.log`.

The runner preserves the user's custom, untracked `Start-RosevearServer.ps1` and `Start-RosevearHub.ps1`. It does not modify the existing Windows scheduler, `.env`, Home Assistant VM, MQTT, Ollama, or camera credentials.

From Administrator PowerShell in the repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1 -CheckOnly
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1
```

Windows operator confirmed the API/web/go2rtc healthy-state runner, five-minute Scheduled Task execution, and controlled process-restart recovery of all three components. The web command currently uses Vite development preview with a strict port; production static serving and long-running service supervision require a separate review. Do not create another recovery task: the operator has already installed the five-minute task named `Rosevear AI Hub Recovery`.

## Camera repair

Check `tools\go2rtc\go2rtc.exe`, then run the existing `scripts\start-go2rtc.ps1`. Its configuration is generated under `data\go2rtc`, with local-only listener configuration. Verify the API separately from actual camera stream availability; never copy camera RTSP credentials into GitHub or logs.

## Release gates

- Code checks and Windows smoke validation
- Stop/start recovery and healthy-no-op tests
- Camera unavailable and port-conflict tests
- No duplicate processes on repeated invocation
- dev CI, protected main promotion, main Production CI, release evidence and dev sync

## Verified release evidence — 2026-10-10

- Pull request #80 merged the recovery foundation to `dev` as `70b453bc8666afcb8603a12239831810e198d608`.
- Development CI run 38075060738: documentation, backend, web and Windows desktop jobs all passed.
- Pull request #81 merged the foundation to `main` as `328ce1da6d7ac8cfd9cdd9e78d2febaa384d0a62`.
- GitHub's available pull-request workflow interface does not provide confirmation of post-merge push-based Production CI for this commit. Do not claim it passed without evidence.
- Windows operator output verified API and web healthy with `hub-recovery.ps1 -CheckOnly`, while go2rtc was initially offline because the executable was absent.
- Operator installed official go2rtc 1.9.14 Windows executable; startup script reported localhost API listening on 1984, RTSP on 8554 and WebRTC on 8555.
- go2rtc `/api/streams` returned `{}`: no real camera stream configured, so playback has NOT been verified.
- The camera devices reside on two local address ranges (Deco `192.168.68.*`, Bell `192.168.2.*`); unrelated network devices must not be classified as cameras based on open ports.

## Final acceptance steps still required

1. Verify `main` push workflow run passes all required lanes on the release commit, with the run link and artifact result.
2. On Windows, confirm the checked-out SHA matches the release commit and run `hub-recovery.ps1 -CheckOnly` showing API, web and go2rtc healthy.
3. Five-minute recovery task installed through `schtasks.exe` on Windows; task run returned code 0. Script installer still requires installation validation from the updated release, including idempotent refusal to overwrite. Existing `Rosevear AI Server Startup` remains intact.
4. All three controlled service recovery tests PASSED: go2rtc PID 8636 → 18484 (16:48:23); web Vite PID 24508 → 10160 (19:52:33), HTTP 200; backend API PID 24000 → 28668 (19:56:00), HTTP health `ok`. Logs reported `Web recovered.` and `API recovered.` with no errors visible; Home Assistant, MQTT and Ollama were not intentionally stopped.
5. Configure at least one consented, supported camera stream locally (credentials never committed) and confirm live playback; record unsupported/cloud-only devices as such.
6. Record rollback, operator evidence, release status and synchronize `dev` after the successful production closeout.

No camera credentials, local untracked startup scripts, or `.env` should enter version control.

## Build 041 additional operator evidence

- Recovery task last recorded execution 2026-10-10 16:46:14, `LastTaskResult = 0`, all three services healthy.
- A controlled go2rtc service termination was followed by successful launch of a new process with the expected executable path and local listeners (1984/8554/8555).
- The initial ScheduledTasks-based installer failed on Windows PowerShell when setting `Repetition.Interval`. Build 041 hotfix replaces it with `schtasks.exe /SC MINUTE /MO 5`, matching a successful manual creation on this computer.
- The web recovery command was corrected to pass Vite `--host` and `--strictPort` directly through `npm --workspace apps/web run dev --`.
- `/api/streams` previously returned an empty object. No camera feed has been authenticated/played. Camera inventory across Deco and Bell subnets remains a separate integration task and must not be conflated with streaming-service recovery.

## Verified live acceptance: all three service recoveries

On 2026-10-10, Windows operator evidence confirms:

| Component | Original PID | Recovered PID | Evidence |
| --- | ---: | ---: | --- |
| go2rtc | 8636 | 18484 | scheduled-task recovery launched the executable at 16:48:23; local API/RTSP/WebRTC listeners online |
| Web (Vite) | 24508 | 10160 | `Web recovered.` at 19:52:33; HTTP status 200 |
| API (Uvicorn) | 24000 | 28668 | `Starting API.` 19:55:58 then `API recovered.` 19:56:00; `/health` reported `ok` |

The scheduled recovery task was verified with `LastTaskResult = 0` and all three health checks passing. The Windows test-server updater verified exact `main` commit `eecab70ecbbb9163258a196ca520d283f82635d1` and reported backend tests plus web typecheck/tests/build passed. The new process names and command lines matched the expected Vite and Uvicorn applications.

**Scope distinction:** these results verify local process recovery, not that camera feeds work. go2rtc `/api/streams` was empty; real camera registration/playback and any cloud-only brand adapters remain unverified follow-up integration work. The GitHub PR gate for #87 passed all four lanes (run 38094872846); the separate push-triggered `main` Production workflow was not available through the connected GitHub workflow interface and has not been independently certified. Do not label the entire Build 041 release `Production GREEN` until that last release check is evidenced.
