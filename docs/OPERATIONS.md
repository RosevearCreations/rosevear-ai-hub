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
