# Build 225 — Access Control, Audit Log & Local Network Security Review

## Scope

- System: owner/administrator-only, manual, passive security posture readback; role totals, enabled users, active sessions, audit event count and configured listener/cookie/CORS indicators.
- Audit: limited to the newest 200 event metadata rows, downloadable as CSV only by owner/administrator. Excludes raw arguments, results, account names, object identifiers and credentials. Spreadsheet-formula prefixes are escaped.
- Reviewer checklist: six session-only planning steps, never persisted or treated as signed acceptance.
- No firewall, routing, reverse proxy, Tailscale or account mutation. No network scan or secret read.

## Owner acceptance on installed Windows Hub

1. Confirm each enabled role is appropriate and disable unnecessary accounts through the existing Users workflow.
2. Review sessions and the authenticated audit log; export the latest redacted metadata and store it privately.
3. Independently inspect Windows Firewall ingress, Caddy TLS/certificate chain and Tailscale identity/ACL restrictions. Configuration readback cannot prove these.
4. Confirm browser-origin and cookie settings for the actual HTTPS and Windows Tauri access paths; record exceptions and resolution.
5. Test that `read_only`, household and anonymous sessions cannot reach security review or CSV export endpoints. Verify CSV cells cannot be interpreted as spreadsheet formulas.
6. Record owner device evidence separately. GitHub main GREEN means source checks only, not an installed security certification.

QL-275 remains Deferred/Under Review. No private relay installation or activation is authorized.
