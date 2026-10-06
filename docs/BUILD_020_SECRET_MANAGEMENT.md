# Build 020 — Secret Management

## Purpose

Build 020 establishes local secret handling before Home Assistant, MQTT, camera, and business
connectors begin consuming credentials.

The Hub now supports two secret sources:

1. environment-backed secrets, kept entirely outside SQLite
2. encrypted-at-rest persisted secrets for credentials that need local persistence

The API and UI never return a saved plaintext secret.

## Scope

Build 020 adds:

- environment-backed secret definitions
- encrypted SQLite secret storage
- AES-GCM authenticated encryption
- a separate environment-provided master encryption key
- optional previous-master-key support during rotation
- source precedence: environment first, encrypted store second
- write-only Owner/Administrator secret administration
- per-secret create/rotate/delete
- master-key rewrap
- non-secret key fingerprints
- audit evidence for secret create/rotate/delete/rewrap
- redacted configuration representations
- migration, persistence, security, API, UI, and Windows coverage

## Registered secret keys

### `home_assistant.token`
- environment variable: `HOME_ASSISTANT_TOKEN`
- first consumer: Build 021

### `mqtt.password`
- environment variable: `MQTT_PASSWORD`
- first consumer: Build 025

More secret definitions should be added deliberately with the connector that needs them.

## Environment precedence

For a registered secret:

1. if its environment variable is configured, the environment value is effective
2. otherwise, an encrypted stored value may be used
3. otherwise, the secret is not configured

The API exposes only the source and configured state. It never returns the effective value.

## Encrypted storage

Encrypted secret rows store:

- stable secret key
- versioned ciphertext
- non-secret master-key fingerprint
- rotation timestamp
- created/updated timestamps

The encryption master key is **not** stored in SQLite.

Build 020 uses AES-GCM with:

- a 256-bit master key
- a fresh 96-bit random nonce for every encryption
- the stable secret key as authenticated associated data
- an explicit ciphertext version prefix

This protects confidentiality and detects ciphertext tampering/wrong-key use.

## Required master-key format

`SECRET_ENCRYPTION_KEY` must be URL-safe base64 that decodes to exactly 32 bytes.

Encrypted storage remains locked when the variable is absent. The rest of the Hub remains
operational, and environment-backed secrets may still be consumed.

## API

Owner/Administrator only:

- `GET /api/v1/secrets`
- `PUT /api/v1/secrets/{secret_key}`
- `DELETE /api/v1/secrets/{secret_key}`
- `POST /api/v1/secrets/rewrap`

No API endpoint returns secret plaintext.

## UI

Owners and administrators receive a **Secrets** navigation entry.

The screen displays only:

- configured/not-configured status
- effective source
- environment variable name
- encrypted-store presence
- non-secret key fingerprint
- rotation timestamp

New values use password inputs and are cleared after submission.

## Secret rotation

### Rotate one credential

Enter its replacement value in the Secrets screen and choose **Save / rotate**.

The ciphertext is replaced under the current master key and an audit event is written.

### Rotate the master encryption key

1. Generate a new 32-byte key.
2. Move the current `SECRET_ENCRYPTION_KEY` value temporarily to
   `SECRET_ENCRYPTION_PREVIOUS_KEY`.
3. Set the new value as `SECRET_ENCRYPTION_KEY`.
4. Restart the Hub so the environment is reloaded.
5. Open **Secrets** and choose **Rewrap stored secrets**.
6. Verify the stored-secret fingerprints now match the new current-key fingerprint.
7. Verify integrations that use the secrets.
8. Remove `SECRET_ENCRYPTION_PREVIOUS_KEY`.
9. Restart the Hub again.

Do not remove the old key before rewrap completes successfully.

## Audit and redaction

Secret administration audit records contain:

- secret identity
- operation type
- storage source
- success/failure metadata

They do not contain the submitted secret value.

Build 019's central sanitizer remains a second defense against accidental secret persistence.

## Database migration

Alembic revision `0011_secret_management.py` creates `secret_values`.

The migration is reversible. Downgrading removes only encrypted stored secrets and does not alter
environment variables or other Hub data.

## Rollback

1. Preserve the active master key(s) securely if encrypted secret rows might be needed again.
2. Roll application code back to Build 019.
3. Downgrade Alembic revision 0011 to 0010 if desired.

If the table is dropped, encrypted stored secret values are lost and must be re-entered; environment
secrets are unaffected.

## External setup

No cloud service, OAuth application, API subscription, or paid dependency is required.

A master key is required only if encrypted SQLite storage will be used. Environment-backed secrets
work without it.

## Next build

**Build 021 — Home Assistant Connection**

Build 021 will consume `HOME_ASSISTANT_TOKEN` through the Build 020 resolver, add Home Assistant
URL/token configuration, health checking, and entity inventory.
