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
