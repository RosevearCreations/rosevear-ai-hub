# Build 041 — Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup

**Status: merged to `main`; development CI green; Windows recovery and camera stream acceptance pending. NOT fully production GREEN.**

## Bounded recovery runner

`scripts/hub-recovery.ps1` independently checks the API, web, and optionally go2rtc. It never kills unrelated services, processes, or cameras, and refuses duplicate launch when a port is occupied but unhealthy. Logs are stored under `logs/hub-recovery.log`.

The runner preserves the user's custom, untracked `Start-RosevearServer.ps1` and `Start-RosevearHub.ps1`. It does not modify the existing Windows scheduler, `.env`, Home Assistant VM, MQTT, Ollama, or camera credentials.

From Administrator PowerShell in the repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1 -CheckOnly
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1
```

Recovery runner requires testing on the Windows machine before integrating with the existing startup task. The web command currently uses Vite development preview with a strict port; production static serving and long-running service supervision require a separate review. Do not automatically install a second scheduler task.

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
3. Confirm the opt-in task installer works under the local Windows PowerShell/Task Scheduler version; test repeated invocation and its removal without altering `Rosevear AI Server Startup`.
4. Test recovery from actual process exits without duplicates, while retaining healthy Home Assistant, MQTT and Ollama.
5. Configure at least one consented, supported camera stream locally (credentials never committed) and confirm live playback; record unsupported/cloud-only devices as such.
6. Record rollback, operator evidence, release status and synchronize `dev` after the successful production closeout.

No camera credentials, local untracked startup scripts, or `.env` should enter version control.
