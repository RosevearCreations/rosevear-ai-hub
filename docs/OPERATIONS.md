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
6. Choose **Rewrap stored secrets**.
7. Confirm stored rows show the current key fingerprint.
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
