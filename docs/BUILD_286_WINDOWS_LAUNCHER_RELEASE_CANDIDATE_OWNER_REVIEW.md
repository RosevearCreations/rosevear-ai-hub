# Rosevear AI Hub 286 — Windows installed-release and launcher review

## Purpose and evidence boundary

This build adds a manual, owner/administrator-only read of the original Build 259 Windows launcher inspector. It compares the locally recorded updater SHA **candidate** with the Git checkout SHA **candidate**, and maps the limited process ancestry kinds for the local web (5173) and API (8765) listeners. The result appears in the existing Integration Health I.T. section, alongside Build 285's service observation.

This is deliberately **not** process-to-binary release attestation, original-host verification, independent witness verification, or authorization to report to AI Data Platform. Local self-review is neither signed nor a substitute for a genuine witnessed field acceptance. All those trust decisions remain **HOLD** even when candidates match and the owner checks every box.

## Read-only contract

- `GET /api/v1/system/windows-launcher-evidence` reuses the existing `owner`/`administrator` router guard and sets `Cache-Control: no-store`.
- On non-Windows hosts, PowerShell is never invoked; the result is `NOT_WINDOWS`.
- On Windows, the backend invokes only the fixed installed `scripts/inspect-hub-launcher-259.ps1` via non-interactive PowerShell, with an execution timeout, bounded output, no arguments supplied by the client and no policy bypass.
- Script failure, missing script, symlinked script, malformed JSON or untrusted claimed signatures fail closed as `INSPECTOR_UNAVAILABLE`.
- The API removes all process IDs, usernames, raw command lines, arguments, executable paths, device identifiers and credentials. It permits only enum labels, process kinds and 40-character lowercase SHA candidates.
- The UI validates response schema, comparison consistency and both observation timestamps, expiring after five minutes. No polling or script run occurs until a user clicks the button.
- Master Shell report preview is local, sanitized and **never sent**. The existing Comms interface and trust controls are not changed.

## Guided original Windows owner review

1. Open the locally installed Hub in Ree's Windows server session and sign in as owner.
2. In I.T. → Integration Health, first check Build 285's runtime evidence for backend version, `/health` and expected Windows service observations.
3. Click **Inspect release and launcher candidates** in Build 286. Compare the updater candidate and checkout candidate with the *actual installed* files and the Windows startup task. A difference or missing candidate requires local review, not promotion by the UI.
4. Review the web and backend listener and ancestor labels. Recovery-script name matching is a weak hint. A process created before the checkout commit needs particular attention.
5. Physically verify this is the intended Windows machine and observe app behavior yourself; check the three boxes only if those observations are genuine. Recording the local browser-session self-review does not create signed evidence.
6. Obtain any required independent device, process identity and witness receipts through the already approved security procedure; do not use this screen to activate Comms, start a service, change PowerShell execution policy or publish a source status.

## Verification expectations

Source tests cover fixed read-only execution, non-Windows HOLD, matching/mismatching candidate handling, invalid/script-error privacy failures, role authorization, browser no-auto-probe, no secret display and owner-only manual review. GREEN CI verifies source and tests on GitHub runners, **not** the installed version on Ree's Windows machine. That owner field acceptance remains a separate task.
