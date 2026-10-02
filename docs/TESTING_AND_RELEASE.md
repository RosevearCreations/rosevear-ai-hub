# Testing and Release

## Test layers

### Unit
- AI routing
- permissions
- tool validation
- automation conditions
- parsers
- configuration

### Integration
- Ollama
- SQLite/migrations
- Home Assistant mock/test instance
- MQTT test broker
- provider adapters

### Security
- unauthorized writes
- role escalation
- prompt-injection fixtures
- secret redaction
- expired confirmation replay
- malformed tool arguments

### UI
- chat
- citations
- confirmations
- offline states
- accessibility baseline

## Branches
- `dev`: active integration
- `main`: stable home-production

## Promotion gate
A build may reach main only when:
- tests pass
- security checks pass
- docs are current
- migrations succeed
- rollback path is known
- no critical regression remains

## Versioning
Before MVP: Build number + commit SHA.  
After stable MVP: semantic versioning.
