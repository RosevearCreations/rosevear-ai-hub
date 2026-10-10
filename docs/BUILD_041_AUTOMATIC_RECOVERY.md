# Build 041 — Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup

**Status: implementation in progress; NOT production GREEN.**

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
