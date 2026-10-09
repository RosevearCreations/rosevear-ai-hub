# Operations

## Daily
- application health
- backup health
- critical integration failures

## Weekly
- audit exceptions
- unavailable integrations
- disk use
- failed automations

## Monthly
- controlled dependency updates
- token/secret expiry review
- disabled automation review
- model inventory
- backup restore spot-check

## Backup targets
- SQLite DB
- automation definitions
- model profiles
- knowledge metadata
- non-secret integration configuration
- source documents where not already backed up

## Recovery order
1. host/network
2. database
3. secrets
4. API
5. UI
6. Ollama
7. Home Assistant
8. MQTT
9. cameras
10. business connectors

## Planned health endpoints
- /health
- /health/db
- /health/ollama
- /health/homeassistant
- /health/mqtt
- /version


## Build 020 secret operations

### Generate a master key on Windows PowerShell

Run this in PowerShell on the machine that runs the Hub:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$key = [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').TrimEnd('=')
$key
```

Store the output as `SECRET_ENCRYPTION_KEY` in the Hub's local runtime environment. Do not commit
it to GitHub and do not paste the key into application logs, tickets, or chat.

### Rotate one stored credential

1. Sign in as Owner/Administrator.
2. Open **Secrets**.
3. Enter the replacement value for the credential.
4. Choose **Save / rotate**.
5. Verify the consuming integration after the change.

The previous encrypted value is overwritten and is not recoverable from the Hub.

### Rotate the master encryption key

1. Generate a new master key.
2. Set the old current key temporarily as `SECRET_ENCRYPTION_PREVIOUS_KEY`.
3. Set the new key as `SECRET_ENCRYPTION_KEY`.
4. Restart the Hub.
5. Open **Secrets** and confirm the previous key is reported available.
6. Choose **Rewrap stored secrets**. Build 032 also rewraps encrypted camera RTSP source URLs in the same transaction.
7. Confirm stored secret rows and configured camera stream sources use the current key fingerprint.
8. Verify integrations that depend on stored secrets.
9. Remove `SECRET_ENCRYPTION_PREVIOUS_KEY`.
10. Restart the Hub and verify secret status again.

Never remove the old key before a successful rewrap. Keep master keys out of database backups; a
backup of encrypted rows is unusable without the corresponding key.


## Build 021 Home Assistant operations

### Configure the connection

1. Determine the Home Assistant base URL reachable from the Hub machine, for example
   `http://homeassistant.local:8123` or the trusted LAN address.
2. Set that value as `HOME_ASSISTANT_URL` in the Hub's local runtime environment.
3. In Home Assistant, create a long-lived access token for the Hub.
4. Store the token either as `HOME_ASSISTANT_TOKEN` or, when Build 020 encrypted storage is
   configured, sign in as Owner/Administrator and save it under **Secrets → Home Assistant token**.
5. Restart the Hub after changing environment variables.
6. Open **Devices** and choose **Refresh**.
7. Confirm **Home Assistant online** and review the read-only entity count.

The token is write-only from the Hub UI and must never be pasted into GitHub, logs, tickets, or chat.

### Troubleshooting

- **Not configured:** confirm both URL and token are present.
- **Rejected token:** replace/rotate the Home Assistant token; do not log the token while testing.
- **Unavailable:** confirm the Hub machine can reach the configured URL and Home Assistant is running.
- **Timeout:** verify LAN routing/firewall and increase `HOME_ASSISTANT_TIMEOUT_SECONDS` only when
  the local connection is legitimately slow.

Build 021 does not call Home Assistant services and cannot change device state.


## Build 022 entity browser operations

No new Home Assistant credential is required. After updating the Hub:
1. keep the Build 021 URL and token configured
2. restart the backend if dependencies or environment changed
3. open Devices / Entity Browser
4. confirm area, device, domain, and entity counts load
5. use filters to verify a known entity resolves to its expected area/device

The browser uses Home Assistant's WebSocket registry API in addition to REST state. If status is online but the browser returns unavailable, verify /api/websocket is reachable through the same trusted Home Assistant base URL.

### CORS PUT regression

Build 022 permanently includes PUT in the FastAPI CORS allow-method list. This is required because the Secrets screen saves/rotates credentials with PUT. The endpoint's Owner/Administrator authorization remains unchanged.


## Build 023 safe-control operations

Build 023 reuses the existing Home Assistant URL and encrypted token. No additional secret is needed.

To enable one low-risk entity:
1. sign in as Owner or Administrator
2. open Devices
3. review Safe-control allow list
4. select only an ordinary light, benign switch, or non-safety scene
5. save the allow list
6. use the action buttons on the entity card
7. verify the resulting tool.execution.completed entry in Audit

If Home Assistant is unavailable, writes are blocked rather than queued.

If an entity is safety-sensitive, hazardous, or no longer intended for delegation, remove it from
the allow list immediately. Tool Registry can also disable the light, switch, or scene control tool
globally.

No port forwarding, public exposure, or additional cloud service is required.


## Build 024 natural-language home commands

No new installation or secret is required.

To use the feature:
1. keep Home Assistant connected
2. configure the Build 023 safe-control allow list on Devices
3. open Chat
4. select the Home profile
5. use one explicit command naming exactly one approved entity, for example:
   - turn on Living room lamp
   - turn Living room lamp off
   - activate Movie night scene

If the Hub reports ambiguity or a partial match, repeat the command with the exact friendly name
shown on Devices. Build 024 deliberately will not guess.

Bulk commands, hazardous targets, non-allow-listed entities, and unsupported actions do not execute.
Recognized commands bypass Ollama generation; ordinary Home questions continue through the selected
provider.


## Build 025 MQTT operations

Automated verification uses a fake broker client, so CI does not need a live MQTT broker.

To connect the real local broker:
1. Create a dedicated broker account for Rosevear AI Hub with only the broker permissions it needs.
2. Set `MQTT_HOST` to the broker hostname or LAN IP and `MQTT_PORT` to its listener port.
3. Set `MQTT_USERNAME` to the dedicated Hub broker username.
4. Store the password as `MQTT_PASSWORD` or under **Secrets → MQTT password**.
5. Set `MQTT_ALLOWED_TOPICS` to a comma-separated allow list, for example
   `rosevear/sensors/#,rosevear/commands/living-room-light`.
6. Set `MQTT_TLS=true` when the broker listener uses TLS with a certificate trusted by the Hub host.
7. Restart the Hub after environment changes.
8. Open **MQTT**, refresh, and verify the broker reports online.
9. Subscribe to an allowed topic/filter and verify incoming messages appear.
10. Publish only a harmless test message to an allowed test topic and verify the audit record.

The connector fails closed when host, username, password, or topic allow list is missing. It never
falls back to anonymous broker access. When TLS is disabled, keep MQTT strictly on trusted private
networking and never port-forward the broker.

Reconnect behavior uses bounded delays from `MQTT_RECONNECT_MIN_SECONDS` through
`MQTT_RECONNECT_MAX_SECONDS`. Existing subscriptions are restored after connection recovery.
Received messages are an in-memory diagnostic/event buffer, not durable automation history.


## Build 027 Event Engine operations

No new environment variable or credential is required.

After deployment:
1. keep the Build 021 Home Assistant URL/token configured if state events or Home Assistant actions
   are used
2. keep the Build 025 MQTT broker credentials and topic allow list configured if MQTT triggers are
   used
3. keep every automation target on the Build 023 safe-control allow list
4. inspect `GET /api/v1/automations/runtime` while signed in to confirm the Event Engine is running,
   source configuration state, queue depth, processed/dropped/failed event counts, and MQTT rule
   subscriptions
5. if a source is offline, fix that integration; the Hub continues running and does not fall back to
   an LLM for automation decisions

Rollback is migration-safe: disable affected rules first, stop the Hub, downgrade Alembic from
`0013` to `0012`, and deploy the prior application version. Downgrading removes only
`automation_runs`; Build 026 automation definitions remain intact.


## Build 028 AI-assisted rule authoring operations

No new secret, account, migration, or external service is required.

To author a rule:
1. sign in as Owner or Administrator
2. ensure at least one model is installed in the existing Ollama runtime
3. open **Automations**
4. describe the desired trigger, conditions, action, and cooldown in plain language
5. choose **Draft and validate**
6. review the explanation, assumptions, warnings, and exact Rule Schema JSON
7. leave **Enable immediately after creation** off unless every target and condition has been
   deliberately verified
8. choose **Prepare exact save confirmation**
9. review the Level-2 exact action preview
10. choose **Approve and create this exact rule** only when the preview is correct

If Home Assistant is offline, drafting can still occur, but the workbench warns that entity IDs could
not be cross-checked. If an action target is not on the Build 023 safe-control allow list, the draft
is not automatically made safe; the warning must be resolved or consciously reviewed before save.
MQTT authoring likewise reports topic-policy mismatches.

Provider failures, invalid JSON, invalid Rule Schema, unsupported tools, and invalid action arguments
do not create a rule. Retry only after correcting the prompt/provider/runtime issue.

Rollback requires only deploying the prior application version. Build 028 adds no database schema,
and drafts are not persisted.


## Build 029 automation history and failure operations

No new environment variable, credential, migration, or external service is required.

Use **Automations → Execution history** to:
1. review total success/failure/skip counts
2. filter recent runs by success, failed, interrupted, skipped, or running
3. inspect event source, duration, completed action count, failure kind, and bounded run evidence
4. distinguish ordinary execution failures from restart-recovered interruptions

On Hub startup, any row left in `running` state by a prior process is closed as `interrupted`.
This is evidence recovery only: the Hub does not replay the rule.

For a failed or interrupted run:
1. inspect the run evidence and Audit trail
2. verify Home Assistant/MQTT availability and the target's safe-control allow-list membership
3. confirm the tool is still enabled and the target is not safety-sensitive
4. correct the underlying issue
5. allow a new source event to trigger the rule normally

Do not manually repeat a physical action solely because the prior run says `interrupted`; the
remote action may have completed before connectivity or process state was lost. Build 029 therefore
has no automatic-retry button or background action replay.

Rollback requires only deploying the prior application version. The `interrupted` status uses the
existing Build 027 string column and requires no schema downgrade.


## Build 030 notification operations

No new environment variable, secret, account, OAuth application, hosted service, or paid provider is
required.

After deployment:
1. run alembic upgrade head to apply revision 0014
2. sign in and open Notifications
3. Owner or Administrator may choose Send local test
4. confirm the new item appears unread
5. mark it read, then dismiss it
6. open Tools and confirm notification.household.send is enabled at Level 1
7. when desired, author an automation whose action is notification.household.send

The notification action stays operational without Ollama after a rule is saved because execution is
deterministic. It also does not require Home Assistant unless the rule's trigger or conditions depend
on Home Assistant.

External delivery is intentionally absent. Do not add email, SMS, webhook, or push credentials for
Build 030.

### Contextual help

Every primary navigation section displays a circled i help control. Open it for:
- section purpose
- common tasks
- safety and permission boundaries
- troubleshooting

The help panel is keyboard reachable and closes with its Close control or Escape.

### Test PC update

Only after the exact Build 030 closeout commit has a GREEN main Production run, follow
docs/TEST_SERVER_UPDATE.md. The supplied scripts/update-test-server.ps1 refuses to install a
different origin/main SHA than the release SHA supplied to it.

Build 030 rollback on the test PC requires stopping the Hub, downgrading Alembic to 0013, and
checking out the prior verified release.


## Build 031 camera registry and ONVIF discovery

No camera credential or cloud account is required for discovery.

To discover compatible cameras:
1. keep the Hub machine and camera on a trusted reachable LAN/VLAN
2. open **Cameras** as Owner or Administrator
3. choose **Scan local network**
4. review the discovered endpoint UUID, private address, ONVIF service URL, scopes, and last-seen time
5. disable registry entries that should not participate in later camera integrations

If no camera is found, confirm ONVIF is enabled on that camera and that local multicast/UDP 3702 is
not blocked by Windows Firewall, the camera network, or VLAN policy. Do not port-forward ONVIF or
camera web services.

Build 031 does not test or open RTSP streams. Streaming begins in Build 032.

Rollback: stop the Hub, run `.\\.venv\\Scripts\\python.exe -m alembic downgrade 0014`, then
deploy the prior verified release.


## Build 032 RTSP / go2rtc operations

Build 032 needs the official go2rtc Windows executable for real camera streaming. CI uses a mocked
local API and does not download third-party binaries.

### Install and start go2rtc on the Windows Hub machine

1. Download the official Windows go2rtc binary from the upstream project.
2. Place it at `tools\go2rtc\go2rtc.exe` under the repository.
3. Keep `SECRET_ENCRYPTION_KEY` configured; camera source URLs use the same Hub master key and participate in the existing master-key rewrap workflow.
4. Run `powershell -ExecutionPolicy Bypass -File .\scripts\start-go2rtc.ps1`.
5. The script creates `data\go2rtc\go2rtc.yaml` from the tracked local-only template when missing.
6. Open **Cameras** and confirm go2rtc is online, API local-only is Yes, and RTSP local-only is Yes.
7. Enter each camera's private-LAN RTSP/RTSPS source URL once and save it.
8. Use **Test RTSP stream** to validate each configured source.
9. A full Hub restart automatically repopulates enabled runtime source URLs when go2rtc is available. After a go2rtc-only restart while the Hub remains running, use **Sync go2rtc**.

`scripts\dev-desktop.ps1` automatically starts go2rtc when `tools\go2rtc\go2rtc.exe` exists.
If the binary is absent, the rest of the Hub still starts and Cameras reports the transport offline.

Optional settings retain safe defaults:
- `GO2RTC_BASE_URL=http://127.0.0.1:1984`
- `GO2RTC_TIMEOUT_SECONDS=5`
- `GO2RTC_RTSP_BASE_URL=rtsp://127.0.0.1:8554`

Do not change GO2RTC_BASE_URL to a LAN/public address. Do not port-forward 1984, 8554, or 8555.

Rollback: stop go2rtc and the Hub, downgrade Alembic to 0015, and deploy the previous verified
release. This removes Hub transport configuration only; it does not modify physical cameras.


## Build 033 camera dashboard and health operations

Build 033 adds no new account, secret, database migration, paid service, or cloud dependency.

After updating:
1. keep the Build 032 go2rtc binary/configuration and existing camera RTSP sources
2. open **Cameras**
3. confirm Local video transport reports Online, API local-only = Yes, and RTSP local-only = Yes
4. choose **Run health checks** as Owner/Administrator
5. confirm configured cameras move to Healthy when a producer is available
6. verify healthy configured cameras display a local live tile
7. use the summary cards to review cameras needing attention

Health freshness defaults to 300 seconds. Optional override:
`CAMERA_HEALTH_STALE_SECONDS=300` (accepted range 30–86400 seconds).

The dashboard refreshes metadata periodically but does not automatically run active camera probes.
This avoids turning UI polling into continuous credential decryption/network probing. Use **Run
health checks** when active verification is wanted.

If a live tile is unavailable:
- verify go2rtc is running at 127.0.0.1:1984
- verify the camera stream is configured and enabled
- run health checks and review the last probe status
- verify the Build 033 desktop CSP has not been locally modified to block the loopback viewer
- do not expose/port-forward go2rtc to solve a local viewing issue

Rollback requires only deploying Build 032. Build 033 adds no schema migration; existing camera
registry, encrypted RTSP sources, and probe history remain compatible.
