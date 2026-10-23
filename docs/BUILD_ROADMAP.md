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

### Build 116 — Private Camera Stream Health & Playback Acceptance (queued)
- reconcile camera registration, private go2rtc listener safety and fresh per-camera probe evidence
- guide supervised RTSP source checks without leaking endpoint URLs or passwords
- require live moving video, not a healthy API flag, before per-camera field acceptance

### Build 117 — Post-Reboot Home, Workshop & Camera Acceptance Runbook (queued)
- verify existing Windows startup task, Home Assistant VM, MQTT, Ollama, HTTPS and camera dependencies in their real order
- compare before/after authenticated inventory and startup availability after owner-supervised reboot
- preserve manual control of restarts, credentials, backups and any integration repair

### Build 118 — Device & Camera Field Recovery Acceptance Summary (queued)
- consolidate authenticated Home Assistant device outcomes and per-camera playback owner receipts
- keep unresolved and reopened identities visible with explicit next-action ownership
- separate source CI GREEN from installed Windows runtime and actual household equipment acceptance

### Build 119 — Local Household Password Vault Security Architecture (queued; requested 2026-10-23)
- scope a distinct household personal password manager accessible from the authenticated Hub client; do **not** reuse Knowledge, integration Secrets, chat memory or AI tools for plaintext passwords
- security review covering Windows server compromise, stolen client, shared household accounts, backup theft, recovery, LAN and limited Tailscale access, and phishing
- select mature, independently reviewed cryptographic primitives/libraries and investigate a mature self-hosted password-manager integration versus custom vault implementation before approving a build direction
- define client-side encryption, unique per-user vault separation, vault lock/unlock and audit without secret values; no production storage until security review is complete

### Build 120 — Encrypted Local Vault, Client Lock & Secret-Isolation Boundary (queued; gated on Build 119)
- implement or integrate reviewed, authenticated encrypted local-only vault storage with client-side unlock; keep master password, derived vault key and plaintext item values out of Hub server logs, SQL query results, AI prompts, Knowledge search and exports
- protect clipboard exposure, autofill/injection surfaces, browser persistence, unlock idle timeout, session revocation, secure item editing and least-privilege owner/household separation
- enforce safe, separately encrypted backup and tested restore with no silent cloud synchronization

### Build 121 — Hardware-Key/Passkey MFA, Step-Up & Emergency Recovery (queued; gated on Build 120)
- add a phishing-resistant WebAuthn/passkey or supported hardware authenticator second factor, with backup authenticator, device registration/revocation, reauthentication for vault unlock or recovery
- require a verified private HTTPS origin (Caddy) on LAN and carefully restricted remote Tailscale access; do not expose vault endpoints via public router forwarding
- document safe offline recovery codes and owner-held encrypted recovery materials; MFA must not be bypassable by ordinary Hub role escalation

### Build 122 — Password Vault Security Verification & Windows Owner Acceptance (queued; gated on Build 121)
- test threat-model controls, encryption/rotation, lost device/session, invalid 2FA, offline backup restoration, and secret leakage through logs, browser caches, AI and Knowledge
- verify family Hub-client access, dual private LAN/Tailscale paths, session timeout, clipboard redaction, accessibility and Windows restart survival
- classify GitHub CI evidence separately from actual server installation and owner-supervised field security acceptance
