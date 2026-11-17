# Build 351 / QL-460 — original-host supervisor task, boot evidence and unified issues

**Release scope:** `rosevear-ai-hub` source only. The AI Data Platform remains the intended top-level Server Shell; AI Hub the original-host automation runtime; Comms Hub an independently deployed communications module. Protocol 1.1 is additive, retaining read-only 1.0 compatibility. iCamp and YW retain independent deployments and themes. No Vercel, peer, or other app is deployed by this Build.

## Delivered in source

- `scripts/install-three-master-observer351.ps1`: exact fixed-name Windows startup task, original-host identity check, owner-pinned absolute Python executable, expected script arguments, SYSTEM account, no accidental task overwrite, disabled on installation. Separate elevated `-Enable`, `-Disable`, `-Remove`, `-Inspect` with non-matching task refusal. It starts a read-only observer, **not all three Master services**; service start/stop/recovery still require the separately signed Build 350 owner permits, never an HTTP request.
- `scripts/hub_master_supervisor350.py --watch`: local 60-second supervised observation loop. Requires the pre-existing signed QL-458 manifest, protected QL-459 custody journal and QL-460 event and boot SQLite databases. Captures original-host Windows SCM state and durable source evidence; never invents signed remote peer readings.
- `master_bus351.py`: append-only SQLite Master event chain with event digests and unique replay keys. Produces local warning/critical issue entries only from fresh, manifest-scoped, original-host source events. Detects broken hash chains and refuses to display corrupt events. Local integrity chaining is **not independently signed third-party proof**. No outbound alert delivery or acknowledgment is claimed.
- `BootWitness351`: records original-host boot-time service observations to measure post-boot evidence. Even two observed boots are **not proof of the task starting automatically** without a separate host-side task execution witness and owner acceptance. Therefore installation/reboot acceptance always remains unverified in the Server Shell.
- Owner-only no-cache `GET /api/v1/system/server-shell-351`: existing three Master/Slave health information plus new local boot/event/issue evidence. Home Assistant is checked using its existing authenticated **read-only** `GET /api/` client, only on an enrolled original host, and only over HTTPS or HTTP loopback. No entity data, controls, scenes, receivers, automation actuators, tokens, keys or writable endpoints.
- Updated unified Master Server Shell dashboard displays evidence/issue and read-only Home Assistant sections. Missing source is HOLD/UNKNOWN, never synthetic GREEN.

## Manual original Windows-host installation (NOT performed by this GitHub release)

1. On `DESKTOP-AE894KC` install the Build 350 Hub Python distribution and original-host signed manifest; enroll the fixed Windows services `Rosevear-AIDataPlatform`, `Rosevear-AIHub`, `Rosevear-CommsHub` separately. Do not assume they already exist.
2. Set **machine-scoped**, ACL-protected settings `ROSEVEAR_QL458_MANIFEST_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PATH`, `ROSEVEAR_QL458_OWNER_KEY_PIN`, `ROSEVEAR_QL459_CUSTODY_DB`, `ROSEVEAR_QL460_EVENT_DB`, `ROSEVEAR_QL460_BOOT_DB`. Paths must be owner/service-account protected, journal folder must exist and have durable storage, and private keys remain outside Git.
3. In **elevated local PowerShell** run `scripts/install-three-master-observer351.ps1 -Install -PythonExecutable "C:\\<path>\\python.exe"`. This installs the known Task Scheduler entry **DISABLED**. Inspect task identity and configuration with `-Inspect` and the identical `-PythonExecutable` argument.
4. After owner-reviewed credential custody and dry-run `python scripts/hub_master_supervisor350.py --observe`, explicitly run `-Enable` with the same pinned Python path. Real Task Scheduler at-startup activation must be independently observed after a supervised PC reboot. The service watcher does not auto-start any modules unless an independent signed owner recovery grant is explicitly supplied (this task supplies none).
5. Perform a **real Windows reboot test** with independent observer present: capture pre- and post-boot SCM service names/states, Task Scheduler LastRunTime/result, the newly appended local boot/event journals, automation host availability, recovery behavior and rollback to Disabled. A fresh journal is useful evidence but cannot alone certify task autostart or uninterrupted 24/7 operation.
6. Confirm live peer telemetry only after YW/iCamp independently adopt the QL-459 signed read-only contract and are enrolled with pinned mTLS certificate and Ed25519 keys. Until then, the respective Slave status stays UNVERIFIED.
7. Keep physical receiver state **UNKNOWN**, incident **OPEN**, physical activation **DENIED**, all Home Assistant actuator controls outside the QL-460 shell, and no alert-delivery claims without a real verified delivery/ACK.

## Code acceptance vs actual operations

Code CI passing proves source/build/test gates only; GitHub Actions runs on remote runners and has **no permission or connection to the real original Windows PC** in this release. No installer executes on that PC through this pull request. Local hash chains cannot be presented as independently signed or replicated evidence. Do not report original-host deployment, reboot persistence, unattended recovery, HA availability, issue delivery, or seven-app connectivity as operational GREEN without fresh source-specific evidence.

## Next proposed Build 352 / QL-461

Independent original-host installation ceremony receipts, signed task/boot witness, delivered-and-ACKed operator issue notifications, signed three-Master event-bus transport and granular home-automation dashboards with unchanged physical OFF custody.
