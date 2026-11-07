# Build 262 — dark contrast, Windows runtime custody and client source check

## Dark Mode fix

The screenshot from Ree's live `127.0.0.1:5173` Vite page showed the Home Operations panel still in its light palette while the shell was in Dark Mode. The shell's white heading color on that white panel made "Home operations" nearly invisible. Build 262 scopes dark surface, foreground, control, muted-text and focus styles to the Home Operations component for **Dark** and **Standard**. High Contrast retains its own independent palette.

## Safe browser check

In **Restart Client**, choose **Verify served client code**. The client fetches only `/src/clientReadiness262.ts` on the same origin without caching, checks for a JavaScript response with the exact Build 262 marker, then reports either:

- **Build 262 source module is being served** — candidate Vite module delivered by this origin. This is **not proof of installed process identity** or Windows release attestation.
- **Client source cannot be verified** — unavailable source or bundled-release fallback; continue HOLD rather than assuming an old or new version.

The existing **Restart this client now** action checks the local server, requests optional service worker update and navigates to a cache-busted URL. It never starts or stops services, modifies recovery tasks, installs a release or sends a Comms challenge. Windows/production builds may bundle rather than expose `/src`; an unavailable marker is not itself a defect.

## Read-only Windows runtime custody

From the original Ree Windows server checkout in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-closure-262.ps1 -Stage before
```

This observes Build 261's original installed-source status, reads **Rosevear AI Hub Recovery** scheduled task binding, and classifies the recovery mode (`Legacy`/`Managed`/`Hold`). `expected_recovery_action_matches` with `recovery_last_result_zero` means a known recovery task may be working; **neither is proof of installed process source**. No process IDs, executable paths, command lines, secrets or keys are exported; the script does not change anything or make network requests.

The original November 6 field evidence showed both Vite and Python listeners healthy, but their processes began November 4, before the current checkout, with executable paths and commands access-restricted. A healthy `/version` response (`0.0.57`, `development`) is not a signed runtime mapping. The recovery task appeared enabled and completed with result 0; the gateway handoff still needs manual review. **Do not kill these working processes or disable the recovery task to make a test pass.**

## Release and connection gate

For true runtime closure, an authorized operator on Ree's machine must separately establish original launcher command/executable custody, pinned installed artifacts, and a witnessed signed post-restart receipt. Independent issuer and owner permissions are additionally required for Comms TEST. Until those are verified: `runtime_identity_closure=HOLD_PENDING_ORIGINAL_PROCESS_COMMAND_AND_SIGNED_RELEASE_RECEIPT`, `test_authorized=false`, `receiver_activated=false`, `comms_connected=false`. Protected CI green verifies code and safety contracts, not any of those external facts.
