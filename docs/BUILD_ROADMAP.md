# Build Roadmap

This is the canonical implementation sequence. Build numbers are never reused.

## Phase 0 — Foundation

### Build 001 — Repository and Documentation Foundation
- repository structure
- README
- source-of-truth documentation
- architecture
- security model
- data model
- integration catalogue
- testing/release rules
- operations guide
- ADR structure
- .gitignore
- environment template
- CI foundation check

**Acceptance:** repository can be cloned and the product can be understood without relying on chat history.

### Build 002 — FastAPI Backend Skeleton
- project packaging
- FastAPI app
- /health
- /version
- config loader
- structured logging
- pytest
- lint/format checks

### Build 003 — Local Database Foundation
- SQLite
- migrations
- users
- settings
- audit events
- conversation metadata

### Build 004 — React Web UI Foundation
- Vite/React
- navigation
- accessibility baseline
- API client
- system health
- error boundary

### Build 005 — Tauri Desktop Shell
- desktop wrapper
- secure local configuration
- Windows packaging
- local API launch/connection strategy

## Phase 1 — Local AI MVP

### Build 006 — Ollama Discovery
- detect Ollama
- enumerate models
- connection test
- health dashboard

### Build 007 — Streaming Chat
- create conversations
- stream tokens
- cancel generation
- choose model
- persist messages

### Build 008 — Model Profiles
- General
- Coding
- Home
- Workshop
- Business
- profile-specific system instructions

### Build 009 — Provider Abstraction
- provider interface
- Ollama adapter
- optional-cloud adapter contract
- routing metadata

### Build 010 — Chat Reliability
- timeout/retry
- provider offline state
- graceful degradation
- persistence recovery

## Phase 2 — Knowledge / RAG

### Build 011 — File Ingestion
- PDF
- TXT
- Markdown
- DOCX
- metadata
- hashing
- duplicate detection

### Build 012 — Chunking and Embeddings
- configurable chunking
- local embeddings
- vector-storage abstraction

### Build 013 — Retrieval
- semantic search
- keyword fallback
- source filters
- collection filters

### Build 014 — Citations
- source name
- page/section where available
- evidence links
- grounded-answer policy

### Build 015 — Knowledge Administration
- collections
- local-only flag
- re-index
- delete
- status
- error handling

## Phase 3 — Security and Tooling

### Build 016 — Authentication
- local accounts
- password hashing
- sessions
- roles

### Build 017 — Tool Registry
- normalized schemas
- capabilities
- risk levels
- enable/disable

### Build 018 — Confirmation Workflow
- action preview
- approve/reject
- expiry
- replay prevention

### Build 019 — Audit Log
- actor
- tool
- sanitized arguments
- result
- timestamps
- filters

### Build 020 — Secret Management
- environment secrets
- encrypted token storage where practical
- redaction tests
- rotation documentation

## Phase 4 — Home Assistant / IoT

### Build 021 — Home Assistant Connection
- URL/token
- health check
- entity inventory

### Build 022 — Entity Browser
- area
- domain
- device
- state
- attributes

### Build 023 — Safe Device Controls
- lights
- switches
- scenes
- allow lists
- audit trail

### Build 024 — Natural-Language Home Tools
- resolve friendly names
- ambiguity handling
- action validation
- confirmation rules

### Build 025 — MQTT Foundation
- broker configuration
- subscribe/publish
- topic allow list
- reconnect behavior

**MVP boundary:** after Build 025 the Hub can run locally, chat with Ollama, search private documents with citations, manage users, control approved Home Assistant entities, audit actions, and use MQTT.

## Phase 5 — Automation

### Build 026 — Rule Schema
### Build 027 — Event Engine
### Build 028 — AI-Assisted Rule Authoring
### Build 029 — Automation History and Failure Handling
### Build 030 — Notification Layer

## Phase 6 — Cameras

### Build 031 — Camera Registry and ONVIF Discovery
### Build 032 — RTSP / go2rtc Integration
### Build 033 — Camera Dashboard and Health
### Build 034 — Frigate Adapter
### Build 035 — Camera Event Automations

## Phase 7 — Business Connectors

### Build 036 — Connector Framework
### Build 037 — Devil n Dove Read Connector
### Build 038 — Rosie Dazzlers Read Connector
### Build 039 — YW Read Connector
### Build 040 — Narrow Approved Business Writes

## Phase 8 — Windows Server Reliability

### Build 041 — Automatic Service Recovery, Camera Streaming Repair & Startup Cleanup
- preserve the working Ree auto-login / Windows Task Scheduler installation and Home Assistant VM
- replace redundant Tauri development startup dependency with independently managed API and web services
- use stable working directory, fixed ports, process ownership checks, health probes, and bounded retries
- restart a crashed API or web service without blindly killing unrelated Python/Node processes
- write separate startup, crash, restart, and failure logs with clear status checks
- repair go2rtc startup and configuration while keeping camera credentials protected
- test missing binary, unavailable camera streams, reconnect, and healthy-no-op paths
- keep MQTT and Ollama availability checks; avoid duplicate instances
- preserve user-managed local startup scripts and .env; do not overwrite untracked files
- avoid new paid services; document operator validation and rollback

## Phase 9 — Voice and Mobile

### Build 042 — Local Speech-to-Text
- opt-in browser microphone recording with editable transcript in Chat
- browser PCM16 WAV encoding and max recording limit
- authenticated, bounded local speech API and fail-closed model discovery
- optional whisper.cpp engine and GGML model files installed only by operator
- no cloud transcription, automatic chat submission, or voice-command execution
- tests for auth, audio validation, temporary audio cleanup and browser WAV encoder
### Build 043 — Local Text-to-Speech
- Windows built-in offline SAPI voice service and temporary PCM WAV
- authenticated, bounded text input with sanitized failure handling
- optional Speak / Stop voice on completed assistant Chat responses
- local browser playback, abort/revoke on stop; excerpt for longer messages
- no cloud API, no automatic speaking or commands, no model downloads
- backend/web tests, Windows acceptance and rollback guide
### Build 044 — Voice Commands and Confirmations
- authenticated deterministic preview of bounded spoken single-target commands
- separate editable voice draft, never automatically submitted to Chat
- explicit preview and user-confirmed low-risk Home Assistant action via existing audited controller
- forbid bulk, ambiguous, unsafe, unsupported or non-allowlisted actions
- non-commands enter Chat composer only after explicit separate click
- no higher-risk voice execution, no voice-only confirmation
- backend and web tests for authorization, blocked actions, exact preview and stale invalidation
### Build 045 — Installable PWA
- Web app manifest and correctly sized 192/512 PNG icons
- explicit install prompt with Windows/iOS/Android fallback guidance
- versioned service worker caches only public app shell metadata and hashed build assets
- network-first navigation with generic safe offline screen; never cache signed-in HTML
- no API/device/camera/websocket caching, replay, background writes or unsafe offline access
- secure context guidance for localhost versus LAN HTTP; Build 046 handles remote HTTPS
- automated installation/privacy behavior tests, Windows install verification and rollback
### Build 046 — Private Remote Access via Tailscale
- optional Tailscale Serve private HTTPS 443 reverse proxy to loopback FastAPI 8765; never Funnel
- production PWA served from FastAPI origin to avoid remote-browser localhost API calls
- preserve local Vite and Tauri API routing without LAN bind or wildcard CORS
- Secure HTTP-only SameSite session cookie when connecting via HTTPS
- opt-in, check-first PowerShell setup refuses conflicting Serve/Funnel and nonloopback binds
- System section guidance, restricted tailnet grants, signed-in user roles and rollback help
- automated static frontend, authentication and web routing tests; real remote client acceptance

### Build 046 follow-up — Dual Private Access (LAN HTTPS and remote Tailnet)
- optional Caddy internal-CA HTTPS on one chosen Private LAN interface and TCP/8443; browser only on household PCs
- per-subnet IPv4 allow rules both in Caddy and Windows Firewall; never bind Hub API to LAN
- check-first and operator-enabled Windows configuration; precise rollback, private certificate trust guidance
- retain approved-device Tailscale Serve for offsite access; replace default allow-all tailnet grants before enabling
- same-origin API client routing, private LAN diagnostics, Windows script CI checks; no automatic remote activation

## Phase 10 — Hardening

### Build 047 — Backup and Restore
- opt-in encrypted local archive (SQLite online snapshot, knowledge originals, go2rtc configuration)
- streaming AES-256-GCM + scrypt and verified manifest hashes, no plaintext archive publication
- CLI create / verify / staged restore-to-new-directory; never live overwrite
- passphrase stored separately, no automatic cloud upload or scheduler, explicit offline recovery guide
- tamper, incorrect key, malicious entry, symlink, corrupt database and overwrite refusal tests
### Build 048 — Performance and Resource-Budget Review
- restricted, on-demand read-only API process memory/CPU counters and host RAM/disk headroom
- explicit advisory thresholds and no path, token, account or process inventory exposure
- owner/admin System panel with manual refresh and dynamic backend version label
- cross-platform resource measurements with deterministic boundary tests; no polling or task scheduler
- Windows acceptance measurements and rollback; no automatic tuning, service termination, or upload
### Build 049 — Threat Model and Security Review
- assess attacker-controlled LAN clients, stolen sessions, leaked credentials, exposed API schema, untrusted input, backups and physical controls
- revoke all sessions of a user when the account password is changed, within the password-change transaction
- stop serving unauthenticated interactive API schema/documentation endpoints; preserve local programmatic OpenAPI tooling
- use no-store for /api/v1 responses and browser anti-clickjacking, no-referrer and nosniff headers without changing PWA asset caching
- maintain explicit roles, no public listener, no new privileges or automatic security configuration
- negative authorization, password-session revocation, headers, docs exposure and regression tests, Windows operator checklist
- record accepted residual risks and a private LAN/Tailscale certificate/ACL acceptance checklist
### Build 050 — Disaster Recovery Drill
- opt-in encrypted archive recovery rehearsal into isolated temporary storage, never over the live Hub
- synthetic end-to-end create, decrypt, integrity, document/config and SQLite record verification
- real-backup drill with GCM/manifest validation, SQLite table check and metadata-only evidence
- tampered archive/wrong passphrase/missing workspace/overwrite refusal and cleanup regression tests
- Linux backend and dedicated Windows backup/recovery CI coverage
- Windows operator disaster-recovery runbook: archive storage, safe scratch, offline master-key escrow, RPO/RTO evidence, rollback, exclusions, manual acceptance
- no network access, auto-restore, data migration, cloud service or service restarts
### Build 051 — Production Readiness and Roadmap Renewal
- read-only, no-credential loopback readiness preflight for API version, health, anonymous access denial and browser security headers
- Windows API binding guard and no-clobber metadata-only acceptance report
- distinguish code-CI GREEN from household firewall/Tailscale, certificate, encrypted real backup and device operator acceptance
- renew the roadmap around usable applications with multi-business/workshop scope, accessible workflows and optional Frigate

## Phase 11 — Practical Applications and Operator Experience

### Build 052 — Unified Operations Dashboard & Guided Onboarding
- implement read-only contextual dashboard with manual refresh and safe state summaries
- replace siloed home status cards with useful, accessible daily operator views
- user-selectable Home, Workshop and Business contexts; no single project baked into core
- compact read-only health/attention summaries, onboarding progress, and clear disabled/unconfigured service states
- help icons and guided steps for local-first account, Ollama, MQTT, Home Assistant and camera setup
- do not expose secrets or execute real-world actions from dashboard cards

### Build 053 — Local Service Diagnostics & Guided Repair
- clear dependency/status diagnostics for Hub, Ollama, HA, MQTT and go2rtc
- explicit operator-run fix instructions, stable log pointers, safe no-duplicate-start checks
- avoid automatic restarts or dangerous "repair everything" buttons

### Build 054 — Cameras and Event Timeline Workbench
- filter/sort camera events and known stream health without exposing RTSP credentials
- local event annotation, review and export guards; Frigate offline remains supported
- permission checks and storage/retention warnings

### Build 055 — Knowledge Projects & Collection Workspace
- multi-project document collections, source review and status clarity
- safer ingest/duplicate handling and useful citations in project context
- bounded work queues without automatic uploads

### Build 056 — Automations Operations Console
- human-readable schedule/event state, failures and replay-prevention evidence
- guarded draft → preview → confirm flows for permitted low-risk actions only
- never unlock high-risk device writes by default

### Build 057 — Workshop Equipment & Safety Readiness
- configurable workstation/equipment inventory and maintenance-readiness records
- notices for hazardous activities; no automatic CNC/forge/laser execution
- allow offline, multi-project work without paid services

### Build 058 — Business Connector Operations Workspace
- unified read-only Devil n Dove, Rosie Dazzlers and Yard Workers status panels
- scoped freshness and evidence, owner-approved narrow write workflow only
- no shared credentials in browser, logs or exports

### Build 059 — Conversation, Voice and Knowledge UX
- improve local text/voice chat usability, model/profile switching and grounded answers
- explicit microphone/speech opt-in, clear tool confirmation, transcript editing
- avoid automatic publication or non-approved home-control actions

### Build 060 — Guided Release Adoption & Practical Workflow Acceptance
- owner-operated acceptance cards for common home/workshop/business tasks
- fast failed-service triage and traceable build-to-build observations
- maintain CI, security, backup and Windows compatibility gates
- opt-in hourly outbound Windows release adoption after independent five-job GREEN main push
- owner-reviewed one-time Scheduled Task installation, clean fast-forward, known processes only
- migration changes HOLD; do not auto-migrate or touch Home Assistant, MQTT, cameras, Ollama
- backend and local Vite preview restarts with bounded health checks, local metadata-only evidence
- private-browser acceptance checklist separate from physical Windows sign-off

### Build 061 — Release Recovery Assurance & Verified Backup Gates
- exercise staged-release recovery on a real Windows machine, including failure injection
- validate encrypted real-backup restore evidence without touching live data
- design migration approval and rollback procedure; no silent schema changes
- examine updater health, start-on-login behavior and explicit operator alerts
- read-only, no-network assurance report for managed release pointer, rollback journal, same-schema retained release and backup metadata
- explicitly mark browser acceptance, actual failover test, off-machine restore and Task Scheduler configuration UNVERIFIED
- preserve fail-closed startup, no surprise schema DDL, no home device control and no automatic enrollment
- add Linux/Windows regression coverage for malformed status, interrupted journal, stale backup metadata and schema mismatch

### Build 062 — Managed Enrollment Acceptance & Update Observability
- owner-confirmed local deployment and recovery acceptance, after a tested distinct same-schema rollback
- read-only scheduled-task and event evidence, failed-release notification review, safe bounded retention
- no unattended migration, Home Assistant or camera side effects
- operator-refresh System panel with owner/admin API and fixed sanitized local adoption/journal/alert evidence
- strict Windows task-action inspection and seven-day failure Event 610 presence; no task writes
- never infer rollback, DPAPI decryption, or live process acceptance from metadata

### Build 063 — Release Health Cohorts & Supervised Recovery Evidence
- explicit release-health cohorts and operator acceptance evidence for distinct same-schema versions
- bound failure triage to immutable release identity, recovery journal and real device observations
- improve metadata-only UI without automatic migration or external service changes
- bounded seven-day daily cohorts by fixed release-status enums, never raw log text or guessed SHA attribution
- immutable 40-character distinct release references and six-step private operator self-attestation
- incomplete/stale/invalid reports and truncated log coverage remain visible, no autonomous enrollment

### Build 064 — Release Incident Triage & Recovery Evidence Continuity
- classify recurring HOLD/FAILED/ROLLED_BACK outcomes and distinguish repeated incidents
- preserve a privacy-safe operator incident review and follow-up trail without exposing raw log contents
- keep recovery exercises and migration approvals supervised, fail closed on absent evidence
- summarize bounded seven-day adoption failure/hold/rollback event counts, affected days and recurrence without invented IDs
- read an optional local operator-only review ledger with fixed enums and no private freeform data
- clarify Home Assistant VM/API, MQTT broker and camera-registry diagnostics on the Home page, without commanding devices

### Build 065 — Incident Follow-Up Routing & Integration Diagnostics
- guide authorized owner diagnostics across release, HA, MQTT and camera integrations
- preserve explicit operator acknowledgment and safe non-disruptive read-only evidence
- no unaudited external actions, remote credentials, autonomous schema changes or destructive recovery







## Build execution rules

Each build must:
1. begin from a known branch/SHA
2. state scope and non-scope
3. add/update tests
4. update docs
5. record security impact
6. verify migrations where applicable
7. record rollback path
8. pass CI before promotion


### Build 081 — Deferred Reboot Acceptance & Private Gateway Continuity Diagnostics
- operator-requested continuation without a Windows server reboot
- read-only cross-check of private Caddy gateway, tightly scoped firewall and
  exact logon scheduled-task identity
- fail-closed, synthetic Windows regression tests that never certify an unseen reboot
- client certificate trust, camera owner evidence and backup provenance remain
  separately accepted, not inferred from server diagnostics
- no machine restart, firewall mutation, credential exposure or paid dependencies
- defer supervised server restart/VM integration acceptance until operator is available
- see [Build 081 operator runbook](BUILD_081_DEFERRED_REBOOT_ACCEPTANCE.md)



### Build 082 — Gateway Task Identity Reconciliation & Diagnostic Accuracy
- diagnose the Build 081 TaskOwned FALSE while preserving the working gateway
- same-SID and exact task action evidence with bounded, privacy-safe mismatch categories
- fix the legacy LAN inspector reserved PowerShell HOME variable collision
- read-only synthetic Windows CI and operator acceptance; no task rewrite or restart
- keep remote HTTPS and Windows server reboot acceptance separate; reboot remains deferred
- see docs/BUILD_082_GATEWAY_TASK_IDENTITY.md

### Build 083 — Context-Aware Daily Operations Action Queue
- home/workshop/business manual follow-ups derived from existing local-readiness snapshots
- prioritise configured attention over failed verification and optional onboarding
- bounded, privacy-safe text and exact known-section navigation only
- manual refresh; never infer device-operation authority or Windows reboot success
- no new APIs, migrations, external calls, service restarts, task writes or paid services
- see docs/BUILD_083_DAILY_ACTION_QUEUE.md

### Build 084 — Manual Follow-Up Review & Snapshot Revalidation
- let owners/operators acknowledge specific context-aware action queue entries for the current snapshot only
- reviewed does not mean repaired, safe, verified, or automatically executed
- keep actions visible; support manual reopen and outstanding/reviewed counts
- reset all review marks after a successful overview refresh; no persistence or server writes
- protect against status-data leakage and context confusion with React interaction tests
- no Windows server reboot, new backend route, migration, device write or business write
- see docs/BUILD_084_FOLLOW_UP_REVIEW.md

### Build 085 — Snapshot Change Detection & Reverification Guidance
- compare the two latest manually collected read-only operations snapshots in the open browser session
- surface attention, lost verification and reported readiness changes separately, by Home/Workshop/Business context
- keep static safe copy, fixed known navigation targets and no raw provider details
- never infer repair, physical safety, reboot recovery, or automatic restoration from a status transition
- no background polling, persistence, new endpoint, database writes or server reboot
- see docs/BUILD_085_SNAPSHOT_CHANGE_REVIEW.md

### Build 086 — Privacy-Safe Manual Operations Handoff
- prepare a deliberately shown, copyable, read-only Home/Workshop/Business manual status handoff
- use only fixed known service titles, approved readiness states, top follow-ups and prior snapshot change categories
- reflect transient reviewed-not-resolved acknowledgements, never a machine repair or safety claim
- hide the report on context change or manual overview refresh; retain no record or automatic sharing
- no new endpoint, browser storage, cloud export, device command, database change or server reboot
- see docs/BUILD_086_PRIVATE_OPERATIONS_HANDOFF.md

### Build 087 — Manual Operations Handoff Acceptance & Follow-Up Tracking
- opt-in, session-only handoff review checklist and explicit reviewed-not-resolved acknowledgement
- require deliberate report reveal before acknowledgement; allow manually reopening review
- reset acceptance on context change or overview refresh; no persistence or external sharing
- existing manual follow-up review remains separate and unverified until independently checked
- frontend and React interaction tests; no backend, device, Windows task, service, API, migration, or reboot mutation
- see docs/BUILD_087_HANDOFF_ACCEPTANCE.md

### Build 088 — Manual Follow-Up Verification Planner
- display context-scoped verification steps derived only from existing manual snapshot follow-ups
- direct owners to the established section, never claim verified, resolved, safe or repaired
- preserve independent verification requirement even after acknowledgement; reset on refresh
- no new API, storage, polling, device actions, Windows reboot, schema changes or service writes
- React interaction/privacy regression coverage and operator acceptance runbook
- see docs/BUILD_088_VERIFICATION_PLANNER.md

### Build 089 — Verification Queue Review Filter & Pending Counts
- toggle between all manual follow-ups and not-yet-reviewed entries for the active Home/Workshop/Business context
- show pending review counts without treating review as independent verification or repair
- reset the temporary filter on context switch or manual refresh, with no storage, device action or new API
- React privacy and interaction tests, operator acceptance and rollback instructions
- see docs/BUILD_089_VERIFICATION_QUEUE.md

### Build 090 — Scope to be confirmed
- select next practical operator feature after Build 089 release
