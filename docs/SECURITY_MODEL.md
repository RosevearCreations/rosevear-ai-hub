# Security Model

## Threat assumptions

The Hub handles private data and can affect physical devices. Assume:
- web/document content may contain prompt injection
- LLM output can be incorrect
- local IoT devices can be compromised
- secrets can leak through careless logging
- users can accidentally issue harmful commands
- network services can be misconfigured

## Network controls
- no public port forwarding
- trusted LAN/localhost bindings by default
- Tailscale or equivalent for remote access
- firewall unused ports
- separate IoT/camera VLAN recommended later
- do not expose Ollama or MQTT anonymously

## Authentication
- strong password hashing
- session expiration
- admin-only integration configuration
- server-side authorization on every write
- optional MFA later

## Secrets
- never commit .env
- never log raw passwords
- redact bearer tokens/API keys
- never redisplay full saved secrets
- support rotation

## Knowledge-file ingestion

Uploaded knowledge files are untrusted input.

Build 011 therefore:
- accepts only PDF, TXT, Markdown, and DOCX
- normalizes filenames and never trusts client paths
- limits upload size before full processing
- validates PDF/DOCX structure
- rejects encrypted PDFs
- limits expanded DOCX archive size
- never executes macros or embedded programs
- stores originals under content-addressed local paths
- exposes relative storage paths rather than absolute host paths
- uses SHA-256 duplicate detection

A successful parse means only that the file could be read. It does **not** make the document trustworthy.

## Prompt injection

Retrieved content is untrusted data.

Content found in a document, camera metadata, webpage, or business record must never be allowed to:
- reveal secrets
- change roles/permissions
- execute tools by itself
- override system policy
- bypass confirmation

## High-risk physical actions

The AI must not autonomously:
- unlock exterior doors
- disarm security
- disable smoke/CO detection
- disable critical cameras
- energize forge/kiln/heaters/laser/CNC or similar hazardous equipment
- make purchases

Future support for such equipment requires dedicated non-AI interlocks.

## Audit

All state-changing tool actions record:
- actor
- requested action
- risk level
- confirmation evidence
- sanitized inputs
- result
- timestamp

Initial retention target: 180 days, configurable.

## Backups
- daily DB backup
- encrypted off-machine copy
- regular restore test
- knowledge source documents backed up separately where appropriate
