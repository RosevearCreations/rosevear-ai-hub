# Build 280 — Alert Follow-Up Notes, Outcome Timeline & Safe Status Tracking

Build 280 extends the read-only Home alert workflow from Builds 274–279. It does **not** alter local notifications, acknowledge or close inbox records, change device state, activate Comms connections, or claim external evidence.

## Operator workflow

1. An authenticated `owner` or `administrator` with Notifications access opens a real notification's preview on Home.
2. The operator chooses a **personal review status**: Needs review, Investigating, Follow-up needed, or Reviewed locally (not resolved).
3. The operator enters a short note describing what they actually checked or still need to review and explicitly saves.
4. The browser records the notification number, sampled inbox page, local note, operator-chosen status and save time as an append-only personal timeline entry.
5. The Home review history displays recent entries and provides a jump back to the sampled inbox page. The notification may have moved or been removed; the current inbox must be re-checked.

## Trust and privacy boundaries

- Entries are browser-local, versioned, bounded and keyed by authenticated numeric account ID; they are **not encrypted** or synced. Never enter passwords, API keys, addresses, camera details, medical information or other sensitive data. Common accidental credential patterns and URLs are rejected.
- The UI is hidden from read-only or non-Notifications roles. Authentication and access enforcement for actual notifications remain in the backend; local account-keyed storage is a UI separation, not a security boundary against someone controlling the browser.
- No alert titles, messages, server source identifiers or raw evidence are copied into the local journal automatically.
- Saving is explicit and fail-closed if browser storage is blocked. Entries are not silently removed to make room: maximum 40 total and eight per notification. They cannot be confused with authoritative server acknowledgement, external resolution evidence or live event timestamps.
- This release makes no claim of a deployment onto Ree's Windows machine. GitHub `main` GREEN is a protected source/CI status.

## Verification

Test append-only data limits, schema validation and account isolation; owner/admin access and negative read-only access; no server writes; missing/unavailable storage; and restoring the personal timeline after leaving Home. Run full web regression, TypeScript and production build. Promote through protected feature→`dev`→`main` pull requests and verify the final `main` CI independently.
