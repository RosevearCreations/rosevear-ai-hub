# Build 247 — Windows first-activation outcome import and source-to-process reconciliation

The System screen now imports a local Build 246 JSON receipt with a 32 KB limit and strict schema validation. It retains only three source SHAs, imported time and count of owner marks; extra private fields are discarded. Nothing is uploaded or written to the backend.

Fresh local update-control readback, compiled browser SHA and imported source evidence are compared. The owner can record whether they separately inspected the running Windows backend process. These observations are **not** process attestation. An old process leaves `RECOVERY_EXCEPTION_OPEN`; otherwise field reconciliation stays on hold. No automatic recovery, service restart, credential handling, migration or closure is performed.

Field procedure: keep a verified private backup off-machine; inspect the running Windows process executable/command line and scheduled task on the Windows host; compare its release against the managed active pointer; inspect the original updater logs; use supervised rollback only when the evidence supports it. Check the new UI in Dark Mode on the actual machine after restart. GitHub GREEN alone never proves installed client or camera health.

Next proposed Build 248 — Windows Process Identity Evidence Handoff, Startup Task Readback & Post-Restart Closure Gate.
