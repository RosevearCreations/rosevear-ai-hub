# Rosevear AI Hub 285 — Windows Installed-Version Verification, Service Discovery & Live Health Evidence

## Purpose

Build 285 adds a **manual, owner-only, read-only** Windows runtime observation to
I.T. → Integration Health. It is part of the proposed Master Shell source
preflight, not an activation, self-installation, independent witness, or new
application-to-application reporting endpoint.

## What the Hub actually observes

1. A signed-in **owner or administrator** requests
   `GET /api/v1/system/windows-runtime-evidence` from the responding backend.
   All other roles are denied. Responses use `Cache-Control: no-store`.
2. The backend reports its Python package version and Windows/non-Windows
   runtime platform; reads only the already-existing local updater active
   release pointer, when present; and (only on Windows) runs bounded,
   fixed-name **read-only** Service Control Manager queries for Tailscale,
   Mosquitto, Caddy and Ollama. These may run as user apps instead of registered
   Windows services. The result is **not** full device or application discovery.
3. The browser explicitly checks the `/version` and `/health` endpoints from
   the same origin, validates their reported service/environment consistency,
   and refuses a live-health result on version or health disagreement.
4. The browser rejects malformed schemas, privileged verification claims,
   future clock anomalies and reports older than five minutes; an accepted
   live display expires locally after five minutes **without background
   polling or another network request**.
5. A sanitized **local-only preview** can be examined as a proposed Master
   Shell candidate. The preview excludes usernames, hostnames, IPs, URLs,
   credentials, paths, raw `sc.exe` output, service arguments and process IDs.
   It does not transmit a report or authorize a receiving service.

## Truth boundaries

| Observation | Meaning | Does not prove |
| --- | --- | --- |
| Backend responds, `/version` and `/health` agree | This origin served three consistent API replies at the captured time | Host is Ree's original Windows mini-server; installed binary or live UI acceptance |
| Windows service status `RUNNING` | Named service registration reported running by Windows SCM | Home Assistant VM, MQTT publications, Caddy HTTPS, Ollama inference or related Hub functionality works |
| `NOT_REGISTERED` | Fixed Windows service name was not found | The program is absent; it may run as a user application |
| Recorded release SHA | Sanitized candidate from local updater `active.json` | The same release is loaded by the running backend, browser or desktop executable |
| Green GitHub CI | Repository source and CI regression gates passed | Windows deployment, restoration, signed source identity or service health at the owner's house |

`installed_binary_verified`, `windows_device_identity_verified`,
`independent_witness_verified` and `master_shell_reporting_authorized` remain
`false`. The installed version is **not verified** simply because a candidate
SHA and live Python package version appear. No receiver, private Comms relay,
automation, service restart, installation or network scan is activated.

## Owner acceptance on Ree's Windows machine

1. Sign in to Rosevear AI Hub as the owner on the intended Windows server.
2. Open **I.T. → Integration Health** and select **Check installed server and
   services**. A non-Windows or unreachable response remains on HOLD.
3. Review the API health cross-check and each fixed Windows service state.
   Review Home Assistant, MQTT, Ollama and cameras separately with the existing
   integration-health button; a service's registered state is not a device test.
4. On Ree's actual Windows server, the existing read-only
   `scripts/inspect-hub-runtime-260.ps1` can be run by the operator to examine
   checkout and launcher **candidates**, subject to the script's own HOLD
   semantics. Compare its `release_sha_candidate` with the local updater
   pointer shown in the panel; disagreement requires review. Never treat
   agreement alone as signed installed-release attestation.
5. Preserve separate original-host process identity, version-to-binary custody,
   physical owner/witness acceptance and authorized Master Shell reporting
   contract evidence before lifting those particular HOLD states.

## Test and promotion gates

- Python: unsupported hosts avoid service probes; Windows service reads use
  fixed names, no shell, strict output sanitization, 3-second timeouts and
  fail-closed statuses; owner/administrator-only HTTP access, no-store.
- React: no request on mount; explicit click; three-API cross-check; bounded
  service rendering; clock/version/health mismatch states; stale and malformed
  data do not become current proof; no secret/error echo; preview never sends.
- Required protected workflow: backend, web, Windows desktop, Windows backup,
  docs/foundation and CI budget on source PR, production PR and exact `main`
  push. No mandatory gate may be removed to get GREEN.

## Next Build 286

**Installed-Release Candidate Reconciliation, Local Process-to-Launcher Mapping
& Guided Owner Acceptance.** Continue the bounded Windows workflow without
asserting signed process or independent machine identity from lexical hints.
