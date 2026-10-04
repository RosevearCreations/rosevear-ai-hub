# Build 016 — Authentication

## Purpose

Build 016 replaces the temporary pre-auth local-user behavior with local accounts, strong password hashing, server-side sessions, and role enforcement.

The Hub remains self-hosted and does not require an external identity provider.

## First-owner bootstrap

When no configured account exists, `GET /api/v1/auth/status` reports that bootstrap is required.

The web/Tauri UI then shows a one-time **Create the first owner** screen.

Creating the first owner:
- uses a username of 3–128 characters
- requires a password of at least 12 characters
- hashes the password with Argon2
- creates an opaque server-side session
- transfers any conversations owned by the temporary `__local_pre_auth__` user to the new owner
- removes the temporary user
- prevents the bootstrap endpoint from being used again

No bootstrap password or default credential is stored in source control.

## Sessions

Browser sessions use a cryptographically random opaque token.

Only the SHA-256 hash of the token is stored in the local database. The raw token is sent only as an HTTP-only, SameSite=Strict cookie.

Default session lifetime is seven days and is configurable with `AUTH_SESSION_HOURS`.

`AUTH_COOKIE_SECURE` defaults to false for localhost/Tauri development. Set it to true when the Hub is served over HTTPS.

Logout revokes the stored session and deletes the cookie.

## Roles

Build 016 defines four roles:

- **owner** — full Hub administration, including privileged account management
- **administrator** — user administration for non-privileged accounts and future integration administration
- **household_user** — normal Hub use
- **read_only** — intended for read-only Hub experiences as later tools are introduced

At least one enabled owner must always remain.

Administrators cannot create, disable, demote, or promote owner/administrator accounts.

## API protection

After the first real account exists, existing `/api/v1` application routers require an authenticated session.

The following remain available without a session:
- `/health`
- `/version`
- authentication status
- one-time owner bootstrap
- login
- logout

Before bootstrap, the local application APIs remain available so a fresh local installation can initialize normally.

## Chat ownership

Authenticated conversations are scoped to the signed-in user.

Existing conversations created before authentication are adopted by the first owner during bootstrap.

A user cannot retrieve or stream another user's conversation through the chat API.

## User administration API

- `GET /api/v1/auth/status`
- `POST /api/v1/auth/bootstrap`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/users`
- `POST /api/v1/auth/users`
- `PATCH /api/v1/auth/users/{user_id}`

## Database migration

Migration `0007_authentication.py` creates the `sessions` table with:
- user_id
- token_hash
- created_at
- expires_at
- revoked_at

The migration is reversible.

## Security impact

- passwords are never stored or logged in plaintext
- Argon2 is used for password hashing
- raw session tokens are never persisted
- session cookies are HTTP-only and SameSite=Strict
- authentication is enforced server-side, not just by the UI
- destructive last-owner changes are blocked
- authentication/user-management events are written to the existing audit table
- no cloud identity service is introduced

## Rollback

Downgrade Alembic from revision 0007 to 0006 to remove session records, then roll code back to Build 015.

User records remain in the existing `users` table. If rolling back after bootstrap, the Build 015 code will again use its temporary local-chat user behavior.

## External setup

No external service, API key, hosted database, OAuth application, or subscription is required.

The only required operator action is creating the first local owner account when the upgraded Hub is opened.
