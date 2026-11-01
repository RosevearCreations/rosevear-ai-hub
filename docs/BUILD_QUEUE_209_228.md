# Rosevear AI Hub — Next 20 Builds (209–228)

**Planning baseline:** Builds 209–216 source promoted to `main` and exact-main CI GREEN. Build 217 is the current implementation. This remains a requirements queue; source promotion never certifies installed Windows acceptance.

**Priority:** Make the installed Windows Hub useful and reliable for the owners first; improve discoverability and real device/camera diagnostics; then develop safe workshop, operations and security features. Keep existing working screens and data. Every screen should use the Standard theme consistently, respond well on laptop/tablet and offer contextual ⓘ help, accessible keyboard operation and plain-language statuses.

## Owner experience, diagnostics and Windows reliability

### Build 209 — Diagnostic Triage Priority Readback, Retest View Recovery Controls & Standard Theme Owner Review Completion Follow-Up (SOURCE PROMOTED)
- Rank *observed* service changes by explicit, explainable severity and freshness; show source, last sample and suggested **manual** next step without inventing failures.
- Add an owner-only Clear Saved View and reset-to-All recovery control for Windows retest filters; preserve review observations and audit boundaries.
- Summarize unfinished Standard theme review items with direct links, keyboard focus and a printable owner follow-up checklist.
- **Accept:** deterministic status/filter tests, accessible focus tests, no background probes, no physical acceptance inference. **QL-275 deferred.**

### Build 210 — Windows Startup Dependency Map & Guided Recovery Readback (SOURCE PROMOTED)
- Show the expected order and separately observed state of backend, web UI, Ollama, MQTT, Home Assistant VM, Caddy and Tailscale; distinguish unknown from stopped.
- Document one-click *instructions* for verified startup tasks, logs and restart troubleshooting, with no silent Windows service operations.
- **Accept:** stale/partial-service tests and a real owner Windows checklist before any automation is proposed.

### Build 211 — Installed Version, Configuration Drift & Release-to-Device Verification (SOURCE PROMOTED)
- Compare reported installed web/backend/desktop versions with immutable `main` source and release artifacts; show what was **not** checked.
- Introduce an owner-entered installation/reboot retest receipt and a clear mismatch or rollback follow-up.
- **Accept:** no assumption that successful GitHub CI means the Windows machine has updated.

### Build 212 — Home Assistant Device Inventory Reconciliation & Missing-Device Workbench (SOURCE PROMOTED)
- List HA-present, Hub-present, missing, duplicate and stale identities with source timestamps, areas and integration names.
- Provide a guided owner review of why devices can be green in HA yet absent in Hub; allow reversible local annotations, never auto-adopt or merge.
- **Accept:** empty/partial inventory cases and non-mutating provider adapters covered by tests.

### Build 213 — Camera Inventory Compatibility & Connection Diagnostics (SOURCE PROMOTED)
- Build camera-source cards for Blink, littlelf, Nooie, Netvue, Bell/Alarm.com and SkyBell with explicit capability/unsupported/unknown labels.
- Track whether each camera has a *verified permitted* local path, cloud-only limitation or separate credential/owner authorization need; no implied universal camera support.
- **Accept:** no unauthorized stream scraping, credential display or speculative camera control.

### Build 214 — Private Camera Wall Health, Playback & Evidence Follow-Up (SOURCE PROMOTED)
- Improve room/group camera wall, last-good frame metadata, privacy masking and manual playback acceptance records for supported feeds.
- Correlate offline feeds with source-specific owner troubleshooting; avoid auto-loading private streams for low-privilege users.
- **Accept:** role isolation, unsupported-provider cases, error and timeout recovery, and actual Windows/network field sign-off separated from source CI.

### Build 215 — MQTT and X10 Legacy Device Bridging Feasibility (SOURCE PROMOTED)
- Add read-only MQTT topic discovery, identity mapping suggestions and a compatibility inventory for legacy X10 hardware, pan/tilt mounts and motion sensors.
- Explain the required X10 interface/bridge and proposed Meross/HA rule path, with a preview-only event-to-action diagram.
- **Accept:** no MQTT publish, HA action or physical device trigger until hardware, scope, safe stopping and owner permission are independently verified.

## Practical home and workshop operations

### Build 216 — Home Operations Rooms, Scenes & Safe Action Approval
- Deliver a clearer room dashboard and device health summaries, with proposed Home Assistant scene drafts and permission-aware confirmations.
- Default to read-only previews; require separate explicit owner action and authorization for any control adapter.
- **Accept:** deny-by-default tests, stale-state warnings and a manual safe-stop path.

### Build 217 — Workshop Equipment Registry & Maintenance Calendar
- Organize CNC 3018, Ender printers, Ortur laser, casting furnaces, lathe, tumbler and other equipment by location, model, accessories and service intervals.
- Add owner-set reminders, printable safety checklists, maintenance history and contextual ⓘ help; avoid claiming machine telemetry.
- **Accept:** offline/manual entries work, data export works and hazardous-machine operation remains outside Hub automation.

### Build 218 — Workshop Jobs, Material Use & Project Evidence
- Add lightweight projects for jewelry, 3D prints, CNC, laser, casting and sublimation with BOM quantities, consumable use, progress and photos/notes.
- Track estimated vs actual materials and time without assuming production-grade inventory or financial accounting.
- **Accept:** correct units, reversible edits, private evidence storage boundaries and accessible compact entry forms.

### Build 219 — Household and Workshop Maintenance Action Board
- Combine due inspections, device/camera follow-ups and workshop upkeep into a deduplicated owner-controlled task board.
- Support assignment, due date, acknowledgement and reasoned defer/close states; do not auto-dismiss unresolved equipment or connectivity hazards.
- **Accept:** permission tests, stale-source labeling, export and keyboard usable completion paths.

### Build 220 — Local AI Model Health, Usage & Resource Budget
- Show installed Ollama model inventory, memory/storage implications, responsiveness and manually requested local health checks where APIs allow.
- Explain model selection and safe resource limits for a shared Windows host running HA and cameras; no surprise model downloads or autonomous reconfiguration.
- **Accept:** documented resource measurements, timeout recovery and privacy-first telemetry opt-in.

## Usability, recovery and operational readiness

### Build 221 — Standard Theme System, I.T. & Management Console Refresh
- Unify real module cards, navigation, status details, management queues and statistics using the existing midnight Standard theme; no demo counts or fake health data.
- Preserve each module's functionality, add responsive layouts, readable tables and contextual circled-i help.
- **Accept:** visual checks on desktop/tablet, accessibility and existing-route regression coverage.

### Build 222 — Global Search, Help Centre & Guided Troubleshooting
- Search across permitted devices, cameras, maintenance entries, diagnostic screens and help articles with clear source labels.
- Offer task-oriented guidance for missing devices, offline cameras and incomplete startup; restrict sensitive results by role.
- **Accept:** keyboard navigation, no unauthorized results or network searches and useful empty states.

### Build 223 — Owner Preferences, Saved Views & Recovery Safety
- Add named owner preferences for dashboard density, theme, room filters and review layouts with import/export and safe reset.
- Separate display preferences from security-sensitive acceptance receipts; validate schema, reject stale versions and never persist secrets.
- **Accept:** migration, malformed import, role separation and full recovery tests.

### Build 224 — Backup Inventory, Restore Dry-Run & Disaster Recovery Checklist
- Present a source-backed inventory of configured backup paths, retention expectations, restore dependencies and last *verified* test.
- Guide an owner-supervised, non-destructive restore rehearsal using disposable data, including a Windows rollback plan.
- **Accept:** no automatic secret copies, no production overwrite, explicit evidence of a successful dry-run before claiming restore readiness.

### Build 225 — Access Control, Audit Log & Local Network Security Review
- Audit Admin/Owner/household roles, privileged navigation, exposed endpoints, Tailscale/Caddy trust assumptions and log data minimization.
- Add readable local audit search/export for authorized users and highlight policy drift without automatically changing firewall or identity settings.
- **Accept:** least-privilege, negative authorization tests and redacted exports.

## Deferred security and integration readiness

### Build 226 — First-Party Local Vault Security Design Decision Gate
- Revisit the desired *self-hosted* password/document vault with a threat model, encrypted-at-rest design, hardware-key/passkey MFA, backup/recovery and provider-versus-build tradeoffs.
- Prepare an independent security review package and explicit owner decision checkpoint; do **not** implement or store real secrets before approval.
- **Accept:** independent reviewer requirements, recovery failure cases and 0/6 verified security gates clearly visible until proven.

### Build 227 — Six-App Integration Contract & Nonproduction Readiness Dashboard
- Show per-app read-only capability, immutable source provenance, independent witness, scoped identity and gateway TEST permissions for AI Data Platform, Devil n Dove, Rosie Dazzlers, Yard Workers, iCamp and Comms Hub.
- Expose which original evidence is missing and what an owner must separately authorize; retain disconnected default and avoid private proof uploads.
- **Accept:** no live GETs or relay activation, no false independent verification. **QL-275 remains Under Review unless explicitly resumed by owner.**

### Build 228 — Windows Owner Field Acceptance, Regression Matrix & Next Roadmap
- Provide a repeatable installed-Windows walkthrough covering startup, HA inventory, representative supported camera, MQTT, Standard theme, keyboard usability, role guards, backup/rollback and resource usage.
- Record actual owner observations separately from CI and identify blockers, completed follow-ups and the next evidence-backed roadmap.
- **Accept:** reproducible source tests plus distinct authentic owner field results; never mark hardware, cameras, vault or integration GREEN solely because source CI is GREEN.

## Delivery and safety rules for every build

1. Build numbers 209–228 are the agreed queue; completed builds are labeled **SOURCE PROMOTED**. Continue in numerical order unless the owners explicitly reprioritize. Update this document and `BUILD_ROADMAP.md` as requirements evolve.
2. Feature branch → reviewed `dev` merge and checks → reviewed `main` promotion → **exact-main** required CI green. Record PRs, SHA, workflow and outstanding on-device tests. Never claim Production GREEN without evidence.
3. No breaking changes to working screens, no fabricated real-world measurements, no hidden credentials, no background actuation, no unpaid provider dependencies without owner approval. Keep free-tier constraints visible.
4. QL-275 remains **Under Review / owner-deferred**; six-app integration is **DISCONNECTED/HOLD**, private relay **OFF**, authenticated gateway GETs **0**, and no owner TEST permission is inferred. Removing the word HELD from the *project work queue* does not remove technical security restrictions.
5. First-party password/document Vault remains **SECURITY HOLD (0/6 independently verified)** until separate owner authorization and independent cryptographic/security acceptance. Physical Windows and camera acceptance are never equated to GitHub CI.

**Queue tracking:** 20 defined builds (209–228); Builds 209–216 source promoted. Build 217 underway; 12 remain in the queue (217–228).
