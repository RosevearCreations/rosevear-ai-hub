# Build 248 — Windows Process Identity Evidence Handoff, Startup Task Readback & Post-Restart Closure Gate

Run the on-device, **read-only** `scripts/inspect-hub-process-248.ps1` in a local PowerShell console on the actual Windows Hub. The script inspects loopback listeners (defaults 5173 and 8765) and three named scheduled tasks; it emits only bounded process IDs, executable categories, task status/result classifications, a UTC timestamp and explicit false verification flags. It never emits raw executable paths, command-line arguments, account names or credentials. The ports can be changed with `-WebPort` / `-BackendPort` if the installed Hub uses different ports.

Save its JSON output locally and import it under System → Build 248. The UI validates schema, size, timestamps, categories and fake verification flags. It discards any extra JSON fields. The report is not uploaded. A missing listener, disabled startup task, missing recovery task or stale receipt remains an exception. Even healthy-looking reports produce `POST_RESTART_CLOSURE_HOLD`: process PID and task result alone do not prove the source revision, startup after reboot, successful migration, backup restore or device/camera acceptance.

No service, task, registry, database, updater, client session or Home Assistant VM is changed by this flow. Never paste raw process command lines or backup credentials into chat.

Next proposed Build 249 — Independent Windows Release-to-Process Proof, Recovery Task Drift Resolution & Owner Post-Reboot Acceptance.
