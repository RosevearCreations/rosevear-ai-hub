# Build 384 — Seven-Application Governed Intake & Analytics

**Owner-approved release:** GitHub source implementation on `dev` and isolated `main`. **Original-host field acceptance remains HOLD** until all seven sources actually return authorized, appropriately signed and correlated private HTTPS observations. No background receiver is activated.

## Source governance

- Existing Build365 Ed25519 contract accepts only seven exact application identifiers with fixed roles; `tenantId=null`, `authorizesAction=false` and non-sensitive aggregate fields. It must reject cross-tenant payloads, extra fields, unknown metrics, arbitrary customer details, stale signatures and mismatched source commit/pin.
- Existing Build366 journal enforces duplicate event ID and nonce rejection at signed ingestion and bounded seven-day storage. Existing Build367 verifies a private TLS GET, independent certificate CA, independently pinned public key and signed source data before recording a separate receipt.
- Build384 `governed_intake384.py` correlates **both** journals by app ID, event ID and source commit. A signed file alone is insufficient. An HTTPS receipt alone is insufficient. Unmeasured metrics stay null; never show missing sources as healthy or sum incompatible metrics from seven different authority scopes.
- Owner-only `GET /api/v1/system/governance-384` displays seven role/authority labels, per-source 24-hour correlated receipt counts, latest source-reported status/queue/error fraction, age and freshness. No customer IDs, tenant IDs, usernames, keys, IPs or raw signed payloads are returned; no source can issue a Hub command.
- `freshSignedReceipts` means locally *recorded* authenticated source collection, not a continuously connected peer, live source signer verification at read time, original-host reboot, 24-hour uptime, or signed Master-to-Master ACK. Every physical/live/QL-340C flag is false until independently witnessed. Journal tampering/missing source status remains HOLD.

## AcuRite 5-in-1 / Weather Underground addition

This is a **separate household weather-data source**, NOT an eighth business or Master. The owner reports the station already uploads to Weather Underground. Weather Underground documentation lists `https://api.weather.com/v2/pws/observations/current` with `stationId`, `apiKey`, `format=json`, and `units=m` and metric readings. Source: https://www.wunderground.com/pws-api/observations/current-conditions.

Build384 adds `weather_pws384.py`, a single opt-in original-Windows CLI and a **local-cache-only, owner-only** `GET /api/v1/system/weather-station-384`. Home displays temperature, humidity, wind/gust, rain and barometric pressure when truly observed; missing values remain unmeasured. It never publishes station ID, latitude/longitude, neighborhood, raw provider payload or API key in browser/ledger. Station measurements are provider-reported and may be stale; not independently certified sensor/physical safety readings.

Owner must independently provide the WU API key and PWS station ID from their own account and ensure permitted use. Keep the key in a protected absolute local file outside checkout, set variables ONLY in the original Windows owner context:

- `ROSEVEAR_WU384_STATION_ID` = exact enrolled station ID, 4–32 alphanumeric characters
- `ROSEVEAR_WU384_API_KEY_PATH` = protected file with *only* the WU contributor API key
- `ROSEVEAR_WU384_CACHE_DB` = private absolute SQLite file outside source checkout

```powershell
$env:PYTHONPATH = (Resolve-Path .\server\src).Path
.\.venv\Scripts\python.exe .\scripts\poll-weather-underground384.py --status
# Only after owner's WU key and exact PWS ID are configured and independently checked:
.\.venv\Scripts\python.exe .\scripts\poll-weather-underground384.py --once
```

The CLI never starts automatically, schedules itself, or changes Home Assistant/physical devices. SQLite atomically reserves **a minimum five minutes between attempts** and a conservative **1,000 attempts per UTC day by this Hub**, preserving 500 of the owner's reported 1,500 daily API requests for other tools/retries. Failed remote attempts count toward that budget. One every five minutes is 288/day. This is a Hub-local quota, not a claim of what the WU provider account has actually consumed; any other applications using the same key need a separate shared-budget plan. Remote requests use HTTPS certificate validation and no redirect/proxy, 5s timeout, bounded JSON, station identity, 60-minute freshness and provider QC guard. Cached display never consumes requests. No API credentials have been obtained here and no real station has been queried; source is FIELD HOLD.

## Release testing and rollback

Automated negative tests cover original-host-only owner GET, no mutation, seven-source absence, tenant leak denial, TLS receipt correlation, duplicates/replay, source latest and 24-hour metrics, WU exact station, stale/QC denial, secret redaction, double-poll budget and no made-up weather. Build383's QL-340C Comms source/receiver compatibility HOLD is unchanged. Roll back via reviewed source PR; stop using `poll-weather-underground384.py` without deleting prior protected signed journals, WU budget or source credentials. No migrations to the application/business databases, no secret or worker activation.

**Next proposed: Build 385 — IT Service Desk, Performance & Process Monitoring.**
