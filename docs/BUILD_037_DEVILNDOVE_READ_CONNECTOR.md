# Build 037 — Devil n Dove Read Connector

## Goal

Activate Devil n Dove as the first concrete Build 036 business connector while leaving Devil n Dove
as the system of record and preserving a hard read-only boundary.

## Scope

Build 037 adds:

- a server-side Devil n Dove HTTP adapter
- HTTPS-only remote-origin validation
- bearer-equivalent admin-session authentication resolved only on the Hub backend
- Build 020 secret definition `devilndove.admin_token`
- `DEVILNDOVE_BASE_URL`, `DEVILNDOVE_ADMIN_TOKEN`, and
  `DEVILNDOVE_TIMEOUT_SECONDS`
- bounded catalogue reads through `GET /api/admin/product-picker`
- bounded order reads through `GET /api/admin/orders`
- bounded inventory reads through `GET /api/admin/contracts/inventory-read`
- normalized safe records and errors
- an authenticated Hub read endpoint
- Business UI controls for explicit live reads
- backend and web regression coverage

## Non-scope

Build 037 does not:

- change the Devil n Dove repository or database
- create a second Product, Order, or Inventory source of truth
- poll, synchronize, mirror, or cache shop records in the background
- expose a generic HTTP proxy
- create, edit, delete, fulfill, refund, reorder, publish, or mutate Devil n Dove data
- add a permanent service-account credential
- add a database migration or paid dependency

## Source contracts verified before implementation

The live Devil n Dove codebase already accepts the active admin session through a Bearer header in
its shared `getRequestToken` / `getAdminUserFromRequest` path. Browser JavaScript remains
cookie-first; Build 037 uses the Bearer form only for server-to-server Hub reads.

| Hub resource | Devil n Dove authority | Hub maximum |
|---|---|---:|
| catalogue | `GET /api/admin/product-picker` | 50 |
| orders | `GET /api/admin/orders` | 100 |
| inventory | `GET /api/admin/contracts/inventory-read` | 100 |

The lightweight Product picker is deliberate. It avoids the heavier Product rollup and respects the
Devil n Dove D1 read-budget work already in place.

## Security impact

The new credential is bearer-equivalent admin authority. It is never returned by Hub APIs, never
sent to the browser, and is not embedded in connector status. Remote access requires HTTPS. The
client permits only code-owned GET paths and translates upstream failures into safe connector
errors.

The credential can expire because it is an administrator session. Rotation is expected until Devil n
Dove exposes a dedicated read-only service credential.

## Data and migration impact

None. Read records remain transient in memory and Devil n Dove remains authoritative.

## Operator setup

1. Keep `DEVILNDOVE_BASE_URL=https://devilndove.com` for production.
2. Obtain a currently valid Devil n Dove administrator session credential.
3. Store it through **Secrets → Devil n Dove admin token** or set
   `DEVILNDOVE_ADMIN_TOKEN` on the Hub backend.
4. Keep `DEVILNDOVE_TIMEOUT_SECONDS=8` unless there is a measured reason to change it.
5. Open **Business** and run one explicit bounded read.
6. Rotate the credential when Devil n Dove reports authentication failure.

No setup is required merely to deploy Build 037; the connector reports `unconfigured` until a
credential exists.

## Rollback

Clear the credential and deploy Build 036. No schema downgrade or business-data repair is required.

## Release evidence

Pending dev CI, protected-main promotion, main Production CI, release-evidence closeout, and final
dev synchronization.

## Next build

Build 038 — Rosie Dazzlers Read Connector.
