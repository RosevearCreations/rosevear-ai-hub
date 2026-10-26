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

### Build 090 — Context Review Summary & Independent Verification Boundary
- present a current Home/Workshop/Business summary of outstanding/reviewed manual follow-ups and reported attention/unknown statuses
- derive from the existing finite sanitized snapshot; do not imply repair, physical safety or independent verification
- reset counts with the existing snapshot refresh; no persistent state or provider data export
- include React privacy tests and operator runbook; no API, device action, migration, task or reboot changes
- see docs/BUILD_090_CONTEXT_REVIEW_SUMMARY.md

### Build 091 — Contextual Priority Triage Summary
- summarize current context manual follow-ups by needs-attention, unverified and optional setup classifications
- show up to three ordered, safe known-section triage links; never perform a repair or imply service safety
- use only existing sanitized snapshot/action data, without polling, persistence, exports or new APIs
- add React interaction/privacy coverage and an operator runbook; no Windows services, tasks, devices or migrations touched
- see docs/BUILD_091_PRIORITY_TRIAGE.md

### Build 092 — Triage Visibility Filter & Review Continuity
- opt-in all / not-yet-reviewed view for existing read-only top-priority triage
- leave manual verification plan intact and never infer review means repair, safety, or independent verification
- clear temporary filter on context switch and overview refresh; no data persistence or additional APIs
- React interaction/privacy regression and operator rollback runbook
- see docs/BUILD_092_TRIAGE_FILTER.md

### Build 093 — Bounded Triage Coverage Transparency
- explicitly disclose that the read-only priority triage shows at most three items and link the operator conceptually to full action and verification queues
- report current filtered triage count only when truncation is possible; never treat a reviewed follow-up as verified or repaired
- retain existing safe session-only behavior, context switching and privacy protections
- add React regression test, operator acceptance and rollback runbook; no backend/device/Windows changes
- see docs/BUILD_093_TRIAGE_COVERAGE.md

### Build 094 — Triage Review Progress & Verification Boundary
- show reviewed/pending counts in current sanitized Home, Workshop, Business priority triage
- emphasize that review acknowledgement never verifies or resolves the underlying condition
- counts reset with manual snapshot review invalidation; no persistence or new server/device calls
- React regression and operator acceptance runbook; no Windows, backend or migration changes
- see docs/BUILD_094_TRIAGE_REVIEW_PROGRESS.md

### Build 095 — Contextual First-Safe-Check Playbooks
- add two finite, operator-only first checks to each known Home/Workshop/Business priority triage entry
- distinguish configured attention, unverified service, and optional setup without echoing provider payloads
- preserve current context, review filter and independent verification workflow; no auto-repair or false safety claim
- React helper and interaction/privacy regression coverage; no new API, persistence, Windows action, migration, device or business write
- see docs/BUILD_095_SAFE_FIRST_CHECKS.md

### Build 096 — Manual Verification Checklist Progress
- present the two existing Build 095 static first-safe-check instructions in the independent verification plan with separate operator review checkboxes
- count instructions reviewed for the active Home/Workshop/Business manual snapshot, without claiming independently verified/healthy/safe equipment
- keep checklist progress session-only; clear it on working-context changes or manual refresh, not when filtering the queue
- no persistence, integration calls from checkbox clicks, backend, migrations, reboot, Windows changes, device or business writes
- React unit and interaction privacy/regression tests, plus runbook and rollback guidance
- see docs/BUILD_096_MANUAL_CHECKLIST_PROGRESS.md

### Build 097 — Outstanding Safe-Check Workbench
- show per-follow-up safe-check instruction review counts for the active Home, Workshop or Business snapshot
- add an opt-in filter showing only unreviewed instructions and follow-ups that still have pending instruction reviews
- preserve the independent follow-up acknowledgement filter; all review marks and the filter reset on snapshot or context change
- keep complete guidance accessible with Show all and never equate checklist review with service verification, safety or repair
- no new APIs, devices, broker messages, Windows tasks, schema migrations, persistence or backend writes
- see docs/BUILD_097_OUTSTANDING_SAFE_CHECKS.md

### Build 098 — Sanitized Safe-Check Handoff Progress
- include allowlisted first-safe-check instruction review counts and pending/reviewed guidance in the current private operations handoff report
- make instruction review distinct from actual verification, service resolution or equipment safety; no raw provider data
- invalidate previously accepted handoff review on changes to the instruction checklist or follow-up acknowledgement
- no automatic copy, send, persistence, new endpoint, Windows change, migrations or device/business actions
- add unit, React privacy regression tests and manual operator acceptance/rollback instructions
- see docs/BUILD_098_SAFE_CHECK_HANDOFF.md

### Build 099 — Outstanding Handoff Review Digest
- add finite current-context counters for pending follow-up acknowledgements and pending first-safe-check instruction reviews
- render the digest in the handoff acceptance panel and the private read-only handoff report, with warnings if work remains or no follow-ups are suggested
- always distinguish complete review marks from independent verification, device safety, service repairs and incident closure
- no new API, persistent records, OS service, device command, business write or automatic sharing
- unit and React privacy/context/refresh regression coverage and manual review instructions
- see docs/BUILD_099_HANDOFF_OPEN_ITEMS.md

### Build 100 — Operator Review Gap Navigator
- show only pending follow-up acknowledgement or instruction-review gaps in the current Home, Workshop or Business snapshot
- navigate exclusively to existing allowlisted service sections and append privacy-safe pending routes to the manual handoff report
- never imply verification, repair, safety or incident closure; no backend, migrations, Windows tasks, device or business writes
- unit and React tests for completion, navigation, privacy, context isolation and refresh
- see docs/BUILD_100_REVIEW_GAP_NAVIGATOR.md

### Build 101 — Manual Review Priority Filter
- add an opt-in, session-only filter for the Build 100 handoff review navigator: show all outstanding routes or only reported attention/unverified services
- clearly distinguish optional setup from a service failure; keep all pending routes in the private manually copied handoff report regardless of screen filter
- automatically reset the filter when the selected Home, Workshop or Business context changes or when a new manual snapshot is collected
- no API, persistence, automatic communication, device action, business write, Windows task or repair certification
- unit and React tests for optional-only situations, missing verification, context isolation, refresh and privacy
- see docs/BUILD_101_REVIEW_PRIORITY_FILTER.md

### Build 102 — Next Manual Review Route
- suggest the next outstanding, allowlisted handoff review route for the selected Home, Workshop or Business snapshot
- guide the operator through outstanding first-safe-check instruction reviews before the remaining follow-up acknowledgement
- respect the optional-setup priority filter without hiding any pending routes in the private handoff report
- reset naturally when operator reviews change, context changes or a new manual snapshot is collected
- no backend, migrations, persistence, Windows changes, automatic communication or device/business writes
- React navigation, privacy, refresh and context-isolation tests; see docs/BUILD_102_NEXT_MANUAL_REVIEW_ROUTE.md

### Build 103 — Focused Manual Review Checklist
- show the current suggested route's two allowlisted first-safe-check guidance steps directly in the Build 102 focus card
- let the operator mark instructions read and follow-up acknowledgement separately, reusing exactly the existing session-only review state
- keep the full verification workbench, private handoff report, outstanding counters and focus navigation in sync
- invalidate a previously accepted handoff on review changes; reset review marks on context switch and manual refresh
- keep optional setup excluded only by the selected screen filter; no hidden route loss from the private report
- no new backend, data writes, persistence, Windows services or automated device/business actions
- see docs/BUILD_103_FOCUSED_MANUAL_REVIEW_CHECKLIST.md

### Build 104 — Supervised Windows Restart Readiness & Task Identity Evidence
- provide a read-only PowerShell inspection of the existing Hub sign-in and five-minute recovery tasks
- fail closed if either task is absent, disabled, unowned, has an unexpected action, or has the wrong trigger
- distinguish source/CI readiness from an actual supervised server reboot and all separately hosted services
- publish before/after restart instructions for Home Assistant VM, MQTT, Ollama, HTTPS gateway and cameras without altering their startup configuration
- add pure evidence classification tests and a Windows CI gate; no reboot, task installs, services, credentials or database changes
- see docs/BUILD_104_SUPERVISED_RESTART_READINESS.md

### Build 105 — Reboot Recovery Dependency Ordering & Database Readiness
- hold on unsupported live SQLite schema revision instead of automatically applying migrations
- read-only preflight plus guarded retry of the existing HTTPS gateway task after API and PWA readiness
- preserve supervised backup/migration workflow, known task identity and safe recovery logs
- see docs/BUILD_105_REBOOT_RECOVERY_DEPENDENCY_ORDERING.md

### Build 106 — Home Assistant VM & MQTT Post-Reboot Dependency Acceptance
- safely inspect the *existing* VirtualBox Home Assistant VM firmware/running state and only approved private HA/MQTT TCP endpoints
- fail closed with fixed reason codes; distinguish prerequisites from authenticated integrations and manual device/camera acceptance
- document the observed 11 system devices, subsequently added Samsung TV, missing household inventory and independent camera registry
- preserve owner-controlled VM startup, backups, TLS, credentials, HA discovery and camera imports; no automatic repairs
- add Windows PowerShell pure evidence regression and owner runbook
- see docs/BUILD_106_HA_MQTT_POST_REBOOT_ACCEPTANCE.md

### Build 107 — Device Inventory & Camera Recovery
- add a read-only recovery inventory to Devices which independently probes Home Assistant, Hub camera registry and go2rtc health
- download a bounded, identity-only JSON snapshot and compare it to a manually chosen earlier snapshot after a reboot
- distinguish unavailable API/registry (unknown count), actual empty registry, missing prior identity and newly discovered identity
- explain Home Assistant integration-level enrollment and existing bulk-reviewed ONVIF preview/acceptance without re-adding every item manually
- preserve separate camera streaming/playback and encrypted isolated backup gates; never automatically discover, control, import, migrate or restore devices
- unit and React tests for sanitization, import validation, missing/new counts, privacy, failed probes and zero mutation
- see docs/BUILD_107_DEVICE_CAMERA_RECOVERY.md

### Build 108 — Supervised Device & Camera Field Reconciliation
- use actual owner-exported before/after snapshots to classify absent Home Assistant integrations and camera identities
- reconcile known cameras with operator-reviewed discovery receipts, then verify authorized live stream playback per selected camera
- keep database restoration, integration enrollment and any physical controls explicit, backed up and supervised
- owner-disposition per missing device/entity/camera identity, with private, identity-only review receipt download
- individual live-playback acknowledgement held unless locally safe go2rtc transport and fresh healthy per-camera stream evidence exist
- reset operator decisions on refreshing evidence, and distinguish unverified real-world playback from code CI success
- see docs/BUILD_108_SUPERVISED_DEVICE_CAMERA_FIELD_RECONCILIATION.md

### Build 109 — Device & Camera Recovery Receipt Reconciliation & Owner Acceptance
- reconcile owner-exported field-review receipts with later snapshots and physical HA/camera observations
- preserve unresolved integration, identity changes and camera playback as explicit holds
- require independent owner verification before any repair or physical-device acceptance claim
- strict private Build 108 receipt import: bounded schema, time/identity validation and secret stripping
- exact-ID recovery classification and owner-reviewed retirement exceptions, no automatic renamed device matching
- per-camera fresh moving-video owner review; prior observations do not carry forward
- private owner-acceptance receipt export with all unresolved holds, resets on new inventory readings
- see docs/BUILD_109_DEVICE_CAMERA_RECOVERY_RECEIPT_OWNER_ACCEPTANCE.md

### Build 110 — Integration-Level Missing Device Evidence & Camera Recovery Follow-Up Queue
- classify unresolved HA integration/device identity cases with imported private field evidence
- group camera registration, streaming and playback follow-ups without storing RTSP credentials in receipts
- preserve explicit owner supervision and no automatic device control or database restoration
- strict Build 109 owner-acceptance receipt import with allowlisted identity and camera evidence, summary and timestamp validation
- exact-ID, fresh later inventory reconciliation; owner-accepted retirement held as an exception until an identity reappears
- batch-assign missing HA identities to explicitly owner-supplied integration group labels; unknown integration stays visible
- distinct registration, stream readiness and moving-live-video stages with session-only owner recheck marks
- export all unresolved follow-ups as a private identity-only worklist with next supervised steps, never stream secrets
- see docs/BUILD_110_INTEGRATION_DEVICE_CAMERA_FOLLOW_UP_QUEUE.md

### Build 111 — Owner-Supervised Integration Follow-Up Closure & Camera Playback Recheck Ledger
- reimport prior Build 110 worklists and compare strictly later HA and camera evidence by exact identity
- keep owner-reviewed close/reopen decisions and unresolved camera playback as independent private evidence
- preserve safe human-only controls, no automatic integration onboarding, camera registration or device actions
- append bounded private owner closure ledgers with hold, closure and reopened counts; old acknowledgments do not automatically carry forward
- enforce healthy private stream and direct owner-observed moving video for each camera
- see docs/BUILD_111_OWNER_SUPERVISED_FOLLOW_UP_CLOSURE_LEDGER.md

### Build 112 — Supervised Field Recheck Drift & Evidence Chain Handoff
- compare successive Build 111 closure ledger entries for reopened, still-held and owner-rechecked identities without rewriting history
- produce a private owner handoff listing unresolved HA integrations and camera/video holds, with source timestamps and no secrets
- keep independent physical acceptance and explicit human controls; no device action, camera enrollment or database restoration
- import only matching private Build 110 worklists and validated Build 111 ledgers; first review is a baseline, not a comparison
- distinguish session-only review of a written handoff from actual physical device/camera acceptance
- export private chronological evidence summary and suggested supervised next steps without stream URLs or secrets
- see docs/BUILD_112_SUPERVISED_DRIFT_EVIDENCE_CHAIN_HANDOFF.md

### Build 113 — Installed Windows Hub Version & Field Evidence Adoption
- verify the installed server/PWA version against protected main release receipts without modifying services
- distinguish source CI, downloaded desktop artifacts and actual owner-installed Windows runtime
- expose uninstalled or stale frontend/assets as field-adoption holds rather than fabricated production health
- stamp frontend builds with a source SHA and tracked-checkout clean flag; compare against owner-entered main Actions evidence and local updater pointer
- import only Build 112 summary counts and lineage, require separate operator checks and export a metadata-only private FIELD ADOPTION HOLD receipt
- preserve an explicit unverified process/device state even when all owner-entered version markers match
- see docs/BUILD_113_INSTALLED_WINDOWS_VERSION_FIELD_ADOPTION.md

### Build 114 — Home Assistant Integration Discovery & Missing Device Diagnosis
- group current missing identities by owner-confirmed HA integrations and safe read-only diagnostics
- guide batch-assisted integration recovery while preventing automatic onboarding, credentials disclosure and blind entity creation
- require fresh registry and real physical device-function tests before owner acceptance
- implement an owner-only HA workbench accepting validated Build 107 inventory or Build 110 follow-up JSON and an explicit current authenticated registry GET
- distinguish absent, unavailable and reported exact IDs, showing live entity-platform hints without asserting absent integration configuration
- support batch owner-confirmed grouping, per-integration HA UI findings and per-identity fresh physical function observations; reset observations on refresh
- export identity-only private diagnostic receipt with all unresolved holds; retain separate independent Windows/HA field-acceptance gate
- see docs/BUILD_114_HOME_ASSISTANT_INTEGRATION_DISCOVERY.md

### Build 115 — Operator-Reviewed Camera Discovery & Bulk Restore Candidates
- compare existing camera registry and ONVIF discovery receipts by stable identity and bounded model evidence
- present owner-selected multi-camera registration candidates with conflict/duplicate safety gates
- never add, replace or switch live feeds without explicit operator approval and reversible record evidence
- import allowlisted prior Build 107/110 camera identities locally; exact UUID + prior-name matches only become supervised bulk candidates
- explicitly take one bounded ONVIF preview and live camera-registry reading; compare registered, endpoint drift, network collisions, repeated names, unmatched IDs and renamed identities
- require physical hardware/model confirmation, fresh registry preflight and one-time owner-bound authorization before batch registering disabled entries
- return a private identity-only registration receipt; retain camera stream/playback physical acceptance holds
- see docs/BUILD_115_CAMERA_DISCOVERY_BULK_RESTORE.md

### Build 116 — Private Camera Stream Health & Playback Acceptance
- reconcile camera registration, private go2rtc listener safety and fresh per-camera probe evidence
- guide supervised RTSP source checks without leaking endpoint URLs or passwords
- require live moving video, not a healthy API flag, before per-camera field acceptance
- implement explicit single-camera session acceptance with a fresh exact stream probe, owner-observed moving video and repeat probe; no durable field receipt or automatic enablement
- restrict private go2rtc viewer launch to a browser running on the Windows Hub itself, validate loopback-only ports and exact stream identity; no automatic iframe playback
- refresh contextual Cameras/Devices help, add a circled information guide per playback workbench, and refine accessible responsive camera cards and status styling
- see docs/BUILD_116_PRIVATE_CAMERA_STREAM_PLAYBACK_ACCEPTANCE.md

### Build 117 — Post-Reboot Home, Workshop & Camera Acceptance Runbook
- verify existing Windows startup task, Home Assistant VM, MQTT, Ollama, HTTPS and camera dependencies in their real order
- compare before/after authenticated inventory and startup availability after owner-supervised reboot
- preserve manual control of restarts, credentials, backups and any integration repair
- implement an owner-only **System** review with explicit on-demand read-only status capture and private validated baseline import
- compare exact HA entity IDs and registered camera UUIDs; hold if identities change, services fail, installation version drifts or there is no positive baseline camera evidence
- gate transient review on six separate manually observed Windows, VM, authenticated integrations, installed model, private HTTPS and moving-video checks
- add circled-i help, accessible status display, responsive service and evidence cards; no automation or durable acceptance assertions
- see docs/BUILD_117_POST_REBOOT_ACCEPTANCE_RUNBOOK.md

### Build 118 — Device & Camera Field Recovery Acceptance Summary
- consolidate authenticated Home Assistant device outcomes and per-camera playback owner receipts
- keep unresolved and reopened identities visible with explicit next-action ownership
- separate source CI GREEN from installed Windows runtime and actual household equipment acceptance
- add owner-only System workbench for validated Build 110 worklist and matching Build 111 chronological closure ledger
- acquire six authenticated GET-only integration/device/camera status readings only on explicit request; reject absent, stale and malformed evidence
- reconcile exact HA device/entity IDs, registered cameras and bounded private encrypted stream health while requiring real device function and supervised moving video
- filter all/open/reopened identities, assign role-based next actions, and reset any owner observation on new capture
- generate sanitized private identity-only summary preserving historical/newly reopened holds and unconditional independent installed-Windows field HOLD
- see docs/BUILD_118_DEVICE_CAMERA_FIELD_RECOVERY_SUMMARY.md

### Build 119 — Local Household Password Vault Security Architecture (implemented; release verification pending)
- scope a distinct household personal password manager accessible from the authenticated Hub client; do **not** reuse Knowledge, integration Secrets, chat memory or AI tools for plaintext passwords
- security review covering Windows server compromise, stolen client, shared household accounts, backup theft, recovery, LAN and limited Tailscale access, and phishing
- select mature, independently reviewed cryptographic primitives/libraries and investigate a mature self-hosted password-manager integration versus custom vault implementation before approving a build direction
- define client-side encryption, unique per-user vault separation, vault lock/unlock and audit without secret values; no production storage until security review is complete
- expose a read-only, fail-closed Vault architecture page and contextual help to all signed-in Hub clients; every live credential interaction, MFA assertion and vault API remains disabled
- recommend evaluating official Bitwarden Lite before any custom cryptography, conditional on household licensing/sharing, Windows resources and a separate private HTTPS origin; no provider is installed or approved yet
- record ten mandatory review gates, threat model, owner approval conditions and unconditional `PASSWORD_VAULT_HOLD` on installed-Windows security acceptance
- see docs/BUILD_119_LOCAL_VAULT_SECURITY_ARCHITECTURE.md

### Build 120 — Encrypted Local Vault, Client Lock & Secret-Isolation Boundary (security-preparation subset implemented; live vault on HOLD)
- owner selected the preparation-only path: add a deterministic, fail-closed readiness contract and dedicated Hub review cards for provider approval, storage isolation, private origin, separate client lock, leak prevention and encrypted recovery
- no provider approval, deployment, actual encryption service, password form, client unlock, secret persistence, URL shortcut, vault endpoints or MFA assertion; all are explicitly disabled regardless of forged review flags
- see docs/BUILD_120_VAULT_PREPARATION.md; installation portion is gated on explicit provider/hosting approval and independent security review
- implement or integrate reviewed, authenticated encrypted local-only vault storage with client-side unlock; keep master password, derived vault key and plaintext item values out of Hub server logs, SQL query results, AI prompts, Knowledge search and exports
- protect clipboard exposure, autofill/injection surfaces, browser persistence, unlock idle timeout, session revocation, secure item editing and least-privilege owner/household separation
- enforce safe, separately encrypted backup and tested restore with no silent cloud synchronization

### Build 121 — Hardware-Key/Passkey MFA, Step-Up & Emergency Recovery (security policy subset implemented; actual MFA and recovery gated)
- document and display the eight mandatory independent-provider MFA, private-origin, identity, primary/backup factor, step-up, emergency recovery and denial-case reviews
- fail-closed non-interactive readiness assessment rejects forged review completion; no WebAuthn ceremony, factor registration, recovery code, secret entry, vault endpoint or new data persistence
- see docs/BUILD_121_MFA_RECOVERY_READINESS.md; actual factor enrollment and emergency recovery are gated on owner-approved provider and isolated live foundation
- add a phishing-resistant WebAuthn/passkey or supported hardware authenticator second factor, with backup authenticator, device registration/revocation, reauthentication for vault unlock or recovery
- require a verified private HTTPS origin (Caddy) on LAN and carefully restricted remote Tailscale access; do not expose vault endpoints via public router forwarding
- document safe offline recovery codes and owner-held encrypted recovery materials; MFA must not be bypassable by ordinary Hub role escalation

### Build 122 — Password Vault Security Verification & Windows Owner Acceptance (review/runbook subset implemented; actual field verification on HOLD)
- add fail-closed test/acceptance model and authenticated Vault field-test cards for provider isolation, cryptography, private HTTPS, real MFA, client lock, backup/restore, leaks and Windows reboot
- make untrusted review flags informative only; provider approval, actual Windows installation, field proof, real MFA, secret entry and production security acceptance remain disabled regardless of forged checklist success
- document disposable-account test drills, separate source-CI/field acceptance boundaries and sanitized evidence handling in docs/BUILD_122_VAULT_SECURITY_WINDOWS_ACCEPTANCE.md
- no live vault package, origin, keys, credential forms, browser storage, backend routes, scheduled jobs or actual Windows-device verification is introduced
- test threat-model controls, encryption/rotation, lost device/session, invalid 2FA, offline backup restoration, and secret leakage through logs, browser caches, AI and Knowledge
- verify family Hub-client access, dual private LAN/Tailscale paths, session timeout, clipboard redaction, accessibility and Windows restart survival
- classify GitHub CI evidence separately from actual server installation and owner-supervised field security acceptance

### Build 123 — Provider Decision Packet & Deployment Approval Boundary (owner review only)
- gather eight vendor-neutral approval criteria covering current license, maintained official software, encryption, identity separation, MFA, network isolation, encrypted backup and reversible pilot
- display three candidate approaches for investigation without asserting current licensing or choosing a provider; make required owner decision and independent security review prominent
- keep all live credential intake, provider installation, private origin, MFA, secret persistence and field acceptance on unconditional HOLD regardless of forged checklist reviews
- see docs/BUILD_123_VAULT_PROVIDER_DECISION.md; no live password-manager installation may proceed until a separate explicit owner provider/hosting choice

### Build 124 — First-Party Local Password & Document Vault Blueprint (read-only)
- owner explicitly selected a self-developed, Windows-hosted vault instead of a third-party password-vault service; Build 123 provider comparison is superseded
- plan personal passwords, secure notes and private encrypted documents with explicit household sharing, not Hub Secrets, Knowledge or AI indexing
- add eight security review gates covering audited cryptographic libraries, identity/MFA, encrypted documents, Windows isolation, trusted private HTTPS, offline recovery and independent owner acceptance
- keep all runtime vault access, password entry, document upload, MFA and Windows installation on unconditional HOLD; do not invent cryptography or treat local hosting as invulnerable
- see docs/BUILD_124_FIRST_PARTY_LOCAL_VAULT.md; proposed follow-ups Builds 125–130 cover threat model, synthetic test harness, isolated MFA service, documents, recovery and independent Windows acceptance

### Build 125 — First-Party Vault Threat Model & Cryptographic Library Review (review-only)
- document client/service/store/recovery trust boundaries, eight STRIDE plus operational threat scenarios and explicit tests for impersonation, tampering, secret leakage, privileges, malicious files, disaster and supply-chain failure
- shortlist W3C Web Crypto AES-GCM, RFC 9106 Argon2id, libsodium secretstream and W3C WebAuthn without choosing unreviewed binding versions or enabling encryption services
- document seven unresolved design decisions for client security, key derivation, key envelope, private document pipeline, MFA/recovery, Windows isolation and independent assessment
- keep real credentials, private document upload, keys, services and MFA disabled; CI GREEN only validates source, not the installed first-party vault
- see docs/BUILD_125_VAULT_THREAT_CRYPTO_REVIEW.md; next Build 126 requires a separately reviewed library-selection decision and remains disposable-data-only

### Build 126 — Disposable-Data Encryption & Tamper Test Harness (synthetic test-only)
- owner approved browser built-in W3C Web Crypto AES-256-GCM for synthetic fixtures only; no other production cryptographic library, KDF, document stream or MFA selection is approved
- exercise ephemeral, non-exportable 256-bit test keys, fresh random 96-bit IVs, 128-bit authentication tags and associated-data binding for invented owner/item/version fields
- reject damaged ciphertext/tag, truncation, wrong key/IV and changed identity/version; explicitly prove that exact replay still decrypts and requires a future server-side anti-rollback policy
- test code remains only in Vitest files and is not imported into shipped Hub assets; browser-device field test, independent security review and live owner approval remain on HOLD
- see docs/BUILD_126_SYNTHETIC_CRYPTO_TAMPER.md; next Build 127 is isolated private-service/identity boundary preparation, not live vault activation

### Build 127 — Isolated Vault Service & Identity Boundary Preview (fail-closed)
- enumerate private origin, separate family identity, Windows process/ACL, ciphertext-only service and offline recovery boundaries without creating public/private endpoints or services
- model denial of seven hypothetical operations for every Hub actor, even when independent session, origin, MFA and owner review flags are forged complete
- describe owner, household and service authorization negative cases, no Hub-cookie inheritance, no administrator bypass, no ability to turn on live storage from a review screen
- keep actual separate authentication, WebAuthn, passphrase/key handling, ciphertext persistence, uploads and Windows installation gated on independent design review and owner Windows acceptance
- see docs/BUILD_127_VAULT_SERVICE_IDENTITY_BOUNDARY.md; next Build 128 may prepare document pipeline with similarly isolated synthetic fixtures after its own security decisions

### Build 128 — Disposable Document Pipeline & Integrity Preparation (test-only; real files on HOLD)
- expand the browser-native Web Crypto synthetic test harness to invented, bounded byte chunks only, never a real File, Blob, upload or document storage operation
- bind each chunk to dummy owner/document/revision and a fresh envelope identifier, full declared length, chunk count and ordered chunk index, with a unique random 96-bit IV and 128-bit AES-GCM tag
- exercise missing, appended, duplicated, reordered, truncated and corrupted chunks, wrong owner/key/context, and mixing of separate envelopes; explicitly show a complete old envelope still replays successfully
- display six review stages and negative examples in read-only Hub cards with circled-i help; no document picker, active preview, upload, download, persistence or Windows listener
- require independent file admission/active-content review, version ledger, key management, backups, Windows ACL/field acceptance and separate owner sign-off before any real documents
- see docs/BUILD_128_SYNTHETIC_DOCUMENT_PIPELINE.md; proposed Build 129 may scope recovery and version-ledger design while keeping live vault on HOLD

### Build 129 — Document Recovery & Anti-Rollback Ledger Design (review-only)
- model synthetic snapshot revisions, envelope identities, hypothetical independent checkpoints and restore decisions without a database, file operation, cryptographic key, service or backup
- test stale/replayed valid ciphertext versions, same-version forks, unwitnessed future revisions, missing trusted witness, incomplete restore, owner/document mismatch and concurrent compare-and-swap proposals
- deliberately demonstrate the failure case where both encrypted data **and its supposed checkpoint** are rolled back together: the simulated ledger accepts old data, proving a genuinely independent protected witness is required
- document six safety gates for version witness, atomic commit, offline encrypted recovery, independent identity, negative cases and owner-supervised Windows disaster testing
- ship only review data, negative test fixtures, on-screen HOLD/RECOVERY OFF and circled-i help; no real vault read/write, MFA, upload, backup, restore or Windows service
- see docs/BUILD_129_DOCUMENT_RECOVERY_LEDGER.md; proposed Build 130 follows with independent Windows security and owner-acceptance protocol, not live activation

### Build 130 — Independent Windows Vault Security & Owner Acceptance Protocol (review-only)
- define eight independent review and field gates for pinned source/executable provenance, Windows service ACL, private HTTPS/Tailscale, separate household identity/MFA, client leakage controls, document recovery and owner-witnessed disaster drills
- distinguish GitHub source CI, external cryptographic/security audit, separately authorized installed Windows disposable pilot and actual owner field disposition; all independent audit and physical Windows evidence remain absent
- model a strict bounded synthetic-only evidence checklist that rejects duplicate/unknown/missing control IDs, forged approvals, altered provenance, added sensitive fields and incomplete observations without ever converting synthetic PASS into authorization
- show review gates, denial scenarios and circled-i help in the signed-in Vault page, with unconditional field/production HOLD and no forms, secret intake, network endpoint or Windows installation
- document independent reviewer handoff, release pinning, evidence minimization, mandatory fail conditions and distinct explicit owner authorization before any future pilot
- see docs/BUILD_130_WINDOWS_VAULT_ACCEPTANCE_PROTOCOL.md; no real vault activation or Windows field acceptance may be claimed from source GREEN

### Build 131 — Independent Vault Security Findings & Remediation Triage (review-only)
- define six independent audit-to-remediation stages spanning assessor scope, minimized evidence, severity, owner-assigned fixes, independent retests and a separate Windows pilot authorization boundary
- build pure synthetic-only risk triage for at most twelve opaque DEMO findings with explicit review gate, severity, disposition and invented provenance, rejecting duplicates, unknown states, forged approvals, drift or extra secret-bearing fields
- classify unresolved critical/high as synthetic blockers, other outstanding findings as synthetic retest-pending, and even empty/perfect fictional findings as "not an audit"; all outcomes preserve live vault SECURITY HOLD
- display signed-in Vault guidance, six denial scenarios and circled-i help; no issue entry, report upload, secret intake, persistence, audit authority, service install or real field acceptance
- document external reviewer handoff and first-party security boundaries under docs/BUILD_131_VAULT_SECURITY_FINDINGS_TRIAGE.md; no live password/document vault until a separately authorized implementation and independently observed Windows pilot

### Build 132 — Independent Vault Assessor Handoff & Evidence Readiness (review-only)
- define eight explicit evidence scopes: independent assessor contract, pinned source-to-Windows artifact, dependency/cryptography inventory, household identity and keys, private Windows/network isolation, document recovery, negative/retest cases and separate owner approval
- implement a strict, complete eight-scope synthetic packet classifier that rejects omitted/duplicate/unknown controls, forged independent reviews, actual source IDs, real-world provenance, waiver claims and extra potentially sensitive fields
- make even a synthetically complete handoff report `SYNTHETIC_HANDOFF_PREPARED_NOT_REVIEWED` with unconditional live-vault SECURITY HOLD, no reviewer signoff and no Windows field acceptance
- show signed-in read-only Vault guidance with eight review cards, six denial cases and circled-i help; no input form, upload, report storage, Windows process, MFA enrollment or network service
- document what a future independent reviewer must actually examine and what remains unimplemented; see docs/BUILD_132_ASSESSOR_HANDOFF_READINESS.md

### Build 133 — Vault Change-Impact Reassessment & Mandatory Retest Mapping (review-only)
- define six concrete vault change classes: source rebuild, cryptographic dependency/key changes, household identity/MFA, Windows process/ACL, private HTTPS/Tailscale and document/recovery/rollback witness changes
- map each simulated change to the affected Build 132 independent-assessor evidence scopes in stable canonical order; combined changes union the re-review requirements without duplicating controls
- implement a strict synthetic-only change-packet classifier that rejects empty/duplicate/unknown changes, real source or executable identities, forged external approvals, waivers and extra secret-bearing details
- require independent reassessment for every valid invented change map and leave vault installation, real passwords/documents, MFA, backup/restore and Windows owner pilot permanently HOLD at this stage
- include six denial scenarios, read-only signed-in Vault guidance and circled-i help; see docs/BUILD_133_VAULT_CHANGE_IMPACT_REVIEW.md

### Build 134 — Vault Security Readiness Command Center & Guided Review Navigation (read-only)
- consolidate the real currently-unverified implementation, Windows isolation, cryptographic approval, independent assessor, retest and owner Windows acceptance milestones in an honest top-of-page read-only dashboard
- add explicit direct links into eleven existing Vault review sections, grouped as independent review, data protection and architecture; anchor destinations must exist and accept keyboard focus
- preserve existing security material in place, with responsive navigation cards, visible keyboard focus, scroll offset and circled-i help; no active service controls or credential fields
- guard against forged owner/auditor/completion claims by hard-coding all six security milestones unverified and all password/document/MFA/recovery/Windows installation authority to DENY/HOLD
- add UI and policy regression tests, owner help and scope documentation under docs/BUILD_134_VAULT_READINESS_NAVIGATION.md; source CI GREEN remains separate from Windows field validation

### Build 135 — Vault Review Finder & Print-Safe Readiness Summary (read-only)
- help operators locate existing Vault security review headings using a bounded, transient topic filter and an explicit category selector; all destinations remain on-page, static and keyboard-accessible
- show searchable short descriptions, live result count and a no-results reset without any backend query, stored preferences or vault-data access
- provide one-click native browser print preview of the six real unverified security milestones and safety warning, excluding unrelated app navigation and the technical review body
- retain unconditional 0/6 verified, independent review missing, no Windows pilot, and all live password, document, MFA and backup operations HOLD
- cover filtering, print, accessibility, privacy and fixed denial invariants in Vitest; see docs/BUILD_135_VAULT_REVIEW_FINDER_PRINT.md

### Build 136 — Vault Guided Review Routes & Session Pinboard (read-only)
- organize eleven existing vault security sections into three clear advisory reading routes: design/separation, independent assessment, and recovery/Windows planning
- preserve Build 135 local search and category filtering while following route-defined on-page link order
- allow accessible per-section temporary pin/unpin and pinned-only view; clear pins on deliberate action or page unmount, never save them or treat them as approvals
- keep six actual unverified milestones and all production vault controls on HARD SECURITY HOLD, independent of route and pins
- add pure route coverage/denial tests and browser UI tests for route/filter/pin/reset; see docs/BUILD_136_VAULT_GUIDED_ROUTES_PINBOARD.md

### Build 137 — Vault Reading Progress & Continue-Where-You-Left-Off (session-only)
- permit temporary Mark read/unread on each of the eleven fixed review headings without accepting notes, private data or approval records
- show per-route and all-section reading counts and the next unread anchor in canonical guided route order
- combine unread-only view with route, topic, category and existing pin filters; reset explicitly and clear state on page refresh/unmount
- keep browser print summary free of session activity and all six real independently verified security milestones at 0 / 6 with unconditional Vault SECURITY HOLD
- cover all-read, invalid IDs, next navigation, marker reset and zero-result UI tests; see docs/BUILD_137_VAULT_READING_PROGRESS.md

## Phase 12 — Practical Home, Device, Camera and Workshop Operations (queued)

Builds 138–147 reached `main` source GREEN; Build 148 is implemented for reviewed promotion, with Build 149 proposed next. Deliver one build at a time through the existing reviewed `dev` → `main` process. Use the current Windows Hub, Home Assistant VM, MQTT, Frigate/go2rtc, Ollama and existing authenticated UI instead of introducing paid infrastructure. Read-only inspection comes before any separately authorized action. Local CI and GitHub GREEN never assert field acceptance on the household Windows server.

### Build 138 — Home Operations V2: Rooms, Health & Quick Navigation (PROMOTED · source GREEN)
- replace generic status-only landing cards with a functional room/context command center for Home, Cameras, Workshop and Services, with direct routes to the matching operational views
- compose bounded live/explicitly refreshed integration summaries from existing authorized Home Assistant, MQTT, camera, Ollama and Hub health APIs; label each source's last observation and unavailable/unconfigured state rather than inventing health
- add room/category filters, responsive cards, mobile-accessible navigation, keyboard focus and contextual circled-i help; preserve current operator roles and safe refresh handling
- **Acceptance:** stale/offline/partial fixtures render honestly, quick links resolve to real screens, and no room card can issue a physical command or reveal private connection details

Implementation and verification details: `docs/BUILD_138_HOME_OPERATIONS_V2.md`. Source promotion and independent Windows field acceptance remain distinct.

### Build 139 — Device 360 Registry, Identity Matching & Room Assignment (PROMOTED · source GREEN)
- unify inventory presentation across existing Home Assistant entity/device IDs, approved MQTT mappings and camera registry references, keeping provider identity and integration provenance distinguishable
- owner-review proposed duplicate candidates, rename/room metadata and unknown/unsupported devices without silently joining different physical devices or re-pairing them
- provide searchable, filterable device detail with source-linked last-seen data, capabilities, safe action eligibility and missing-device recovery link
- **Acceptance:** identity collisions, inaccessible devices and changed provider IDs are handled without destructive merge; unauthorized users cannot edit metadata and existing camera/HA records remain intact

Implementation and verification: `docs/BUILD_139_DEVICE_360_REGISTRY.md`. Provider identities and owner-reviewed annotations remain separate. The household Windows installation is not automatically updated by the source release.

### Build 140 — Guided Device Discovery Inbox & Owner-Safe Adoption (PROMOTED · source GREEN)
- create an explicit operator-started discovery inbox for Home Assistant, supported MQTT mappings and existing camera candidate previews, with source, confidence and duplicate warnings
- review one candidate at a time before adoption; separate discoverable, observed, approved, unsupported and rejected states; no default auto-enrollment or credential scraping
- include a manual legacy/X10 compatibility note and safe Home Assistant bridge path where supported, without pretending direct X10-to-Meross control is implemented
- **Acceptance:** scanning is opt-in, rejection or timeout changes no existing device, replay/duplicate adoption is blocked, and camera/HA permissions are never bypassed

Implementation, tests and Windows field-acceptance boundary: `docs/BUILD_140_GUIDED_DEVICE_DISCOVERY.md`. Source delivery does not enroll Home Assistant devices, connect MQTT topics or certify real camera operation.

### Build 141 — Camera Wall V2: Room Groups, Health & Private Views (PROMOTED · source GREEN)
- give approved cameras responsive room/site groups, readable health badges, available still previews and operator-selected larger playback panels
- never auto-load every RTSP stream; respect go2rtc/Frigate health, disabled-camera state, private URLs, role boundaries and bandwidth/concurrency limits
- allow private user view preferences only after review of current app storage/auth patterns; provide clear empty/offline/cert-error guidance and circled-i help
- **Acceptance:** multiple cameras render safely on narrow screens, unavailable streams do not block the grid, and no secrets or private RTSP URLs appear in client error output

Implementation and migration notes: `docs/BUILD_141_CAMERA_WALL_V2.md`. No authenticated snapshot endpoint or explicitly verified Frigate-to-registry mapping exists, so the wall shows an honest no-still placeholder until a future separately reviewed source is available; no unauthorized image or RTSP request is invented.

### Build 142 — Camera Events & Evidence Playback Workbench V2 (PROMOTED · source GREEN)
- merge existing camera event/Frigate metadata into a reviewed timeline with source, time zone, camera, event category, deduplication and bounded date filters
- link only to already authorized footage/playback endpoints; show missing media, clock drift, retention expiry and stale observations explicitly
- support operator acknowledgement of an event for follow-up without erasing source evidence, modifying retention or triggering automatic enforcement
- **Acceptance:** duplicate/out-of-order/test fixtures are safe, private playback is role checked, and summaries never invent recordings that are not available

Implementation and acceptance: `docs/BUILD_142_CAMERA_EVIDENCE_WORKBENCH_V2.md`. Until an authenticated media route and exact recording identity are reviewed, video links explicitly remain on hold even when a Frigate event reports clip or snapshot metadata.

### Build 143 — MQTT Topic Explorer, Device Mapping & Publish Preview (PROMOTED · source GREEN)
- add an authorized, bounded topic explorer over existing subscriptions and recent retained message metadata, with allowlisted namespace filters, last-seen and decoded-state previews where safe
- propose topic-to-device associations for explicit owner approval; redact credentials, tokens and private message bodies by default, and reject secret-bearing wildcard display
- retain current authenticated publish policy and require a clear exact-topic/payload confirmation before any real message; default to read-only
- **Acceptance:** unknown topics, floods, reconnects and malicious payloads cannot create implicit controls or disclose sensitive telemetry

Implementation, preview contract and field-acceptance boundary: `docs/BUILD_143_MQTT_TOPIC_EXPLORER.md`. Raw broker message payloads are hidden by default, and an explicit owner review does not authorize automatic device controls.

### Build 144 — Home Assistant Scenes & Safe Action Drafts (PROMOTED · source GREEN)
- let authorized operators assemble and preview small allowlisted Home Assistant actions across selected rooms/entities, with exact target, state and expected effect shown first
- distinguish preview, deliberate confirmation, executed, rejected and unverified outcome with audited per-action receipts; no background, bulk or AI-triggered execution
- block locks, alarms, heating extremes, workshop machinery and other high-risk control classes unless a later separately reviewed policy expressly authorizes them
- **Acceptance:** missing entities, stale previews, role denial and partial failure cannot be misrepresented as successful scenes; existing Home Assistant allowlist remains the final authority

Implementation, safety boundaries and manual Windows verification: `docs/BUILD_144_HOME_ASSISTANT_SCENES.md`. Preview tickets are single-use and process-local; source tests do not operate household hardware.

### Build 145 — Workshop Equipment 360 & Preventive Maintenance Planner (PROMOTED · source GREEN)
- extend existing workshop stations, inventory and manual inspection history into searchable equipment detail, service intervals and overdue maintenance calendar
- expose operator-owned manual inspection assignments, observations, parts/checklist references and next-safe-check guidance without certifying machinery
- keep equipment in blocked/unverified status when maintenance evidence is insufficient and clearly differentiate inspection observations from a permission to operate
- **Acceptance:** date and timezone edge cases, overdue status and equipment ownership are tested; no laser, forge, CNC, electrical or chemical control is automated

Implementation, Alembic migration, manual safety contract and Windows field checklist: `docs/BUILD_145_WORKSHOP_MAINTENANCE.md`.

### Build 146 — Windows Service Startup & Recovery Operations Console (PROMOTED · source GREEN)
- consolidate read-only health and startup-order guidance for the Hub API, Caddy/private HTTPS, Home Assistant VM, MQTT, go2rtc/Frigate and Ollama, including reboot and power-restoration diagnosis
- display observed versus assumed status, existing approved local startup-task identity, dependencies and safe next manual checks; never claim remote Windows access from source code alone
- require explicit separate owner authorization, a local allowlisted executor and witnessed field testing before exposing any restart/stop/repair action; no surprise scheduled-task replacement
- **Acceptance:** failed dependency and partial recovery fixtures show the right escalation, and default UI actions cannot reboot, kill processes or edit the real server

Implementation and manual Windows evidence runbook: `docs/BUILD_146_WINDOWS_STARTUP_RECOVERY.md`. The System console uses existing read-only GETs and a sanitized locally produced scheduled-task observation; physical recovery remains unverified.

### Build 147 — Responsive Command Shell, Theme Polish & Contextual Help Refresh (PROMOTED · source GREEN)
- standardize compact/expanded sub-screens, card spacing, readable contrast, focus states and mobile-friendly navigation across Home, Devices, Cameras, Home Assistant, MQTT, Workshop and Recovery
- provide consistent circled-i help on every new operational card, with task-specific guidance, expected status meanings, operator role boundaries and recovery links
- audit existing Help content for outdated claims (especially Vault: our selected first-party plan is **not** a third-party password-manager installation) and align advice with implemented features only
- **Acceptance:** keyboard/screen-reader and narrow-screen tests pass, cross-view links work, and help never offers nonexistent capabilities or encourages dangerous Windows/vault workarounds

Implementation and acceptance details: `docs/BUILD_147_RESPONSIVE_COMMAND_SHELL.md`. Command search is strictly role-scoped navigation, density/contrast are session-only, and contextual help is non-operational.

### Build 148 — Cross-Module Owner Trial, Accessibility & Local Windows Field Acceptance (IMPLEMENTED · source promotion pending)
- collect explicitly owner-witnessed outcomes from Home, Devices, Cameras, Home Assistant, MQTT, Workshop and System, including phone-width navigation, keyboard/screen-reader operation and private LAN/Tailscale access
- label source-ci results, Windows installation/version, API observations and physical device/camera observations separately; never promote a guessed physical GREEN from synthetic tests or screenshots alone
- turn stale integrations, mismatched device identities, playback gaps, startup problems and inaccessible UI into a bounded manual follow-up queue with owner acknowledgement and exportable private evidence
- **Acceptance:** representative offline/partial/unavailable cases remain truthful, owner trial failures retain follow-ups, and no background control, live credential intake, router change or unsafe Windows action is introduced

Implementation and field trial: `docs/BUILD_148_OWNER_FIELD_TRIAL.md`. The System workbench preserves nine classified manual checks, follow-up acknowledgement and historical retests in a private, bounded HOLD-labelled JSON receipt. No real Windows trial is inferred or fabricated by CI.

### Build 149 — Owner Trial Finding Reconciliation, Repair Handoff & Safe Retest Comparison (PROPOSED · next)
- import the private Build 148 owner-trial receipt, group active and historically recurring findings by system, severity and next-action role, and retain original event timestamps
- create reviewed, manual repair handoffs for Windows startup, stale HA/MQTT mappings, unavailable camera playback, workshop holds and inaccessible UI without activating physical controls
- compare later field observations against original findings; an owner-observed improvement is not independent acceptance, and missing proof must remain open
- **Acceptance:** no false automatic closures or inferred Windows/device GREEN, historical evidence stays intact, and private handoff data is explicit, bounded and non-secret

**Queue policy:** 138–147 promoted to source `main`; 148 awaits reviewed CI promotion; 149 is a proposal pending owner selection. Keep physical field acceptance separate from CI, honor free-tier limits, and leave the independent first-party password/document Vault at **0 / 6 verified · SECURITY HOLD** until separately authorized security work occurs.
