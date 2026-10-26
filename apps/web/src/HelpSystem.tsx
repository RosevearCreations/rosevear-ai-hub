import { useEffect, useRef, useState } from "react";

interface HelpTopic {
  purpose: string;
  tasks: string[];
  safety: string[];
  troubleshooting: string[];
}

const HELP_TOPICS: Record<string, HelpTopic> = {
  Home: {
    purpose: "Build 138: Home Operations V2 is a read-only command center for observed room inventory, local services and safe navigation.",
    tasks: [
      "Use Home, Cameras, Workshop and Services routes to see quick links into existing authenticated screens. Workshop administration links appear only for authorized operator roles.",
      "Filter the Home Assistant room inventory by room. Device/entity counts reflect the latest successful directory read, not per-device availability or safety.",
      "Review Hub, Home Assistant, MQTT, Cameras and Ollama observations with their sample time; a stale or unverified result needs checking in its source screen.",
      "Open the circled-i Help disclosure inside Home operations to review the safety and freshness labels.",
      "Choose Home, Workshop, or Business to filter status cards for that working context.",
      "Use Refresh overview to request fresh read-only service states, then open each section for details.",
      "A Not configured or Not verified card is not a device failure. Frigate is optional.",
      "Confirm the backend and Ollama health cards are online.",
      "Use the dashboard cards to move directly into Chat, Knowledge, Devices, MQTT, Automations, or Notifications.",
      "Treat Home as the first place to check after an update or restart.",
      "Build 045: use the sidebar Install the Hub panel on localhost or HTTPS. A browser may also offer Install app in its menu.",
    ],
    safety: [
      "Quick links only navigate. Home Operations does not issue device commands, switch scenes, run automations, load camera streams or display tokens and private host connection details.",
      "A Hub endpoint returning OK does not prove Windows startup, Home Assistant equipment safety or other integration health.",
      "Home is an overview; physical changes still pass through the permission and tool layers.",
      "Offline PWA mode never caches logged-in pages, conversation text, camera streams, private state, or queued device actions.",
      "An offline provider does not disable local dashboards, saved history, or deterministic automations.",
    ],
    troubleshooting: [
      "Backend offline: start or restart the FastAPI process and verify port 8765.",
      "PWA install missing: use http://127.0.0.1:5173 on the server or HTTPS; ordinary LAN HTTP addresses do not qualify as secure contexts.",
      "Ollama offline: start Ollama locally and verify the configured base URL.",
    ],
  },
  Chat: {
    purpose: "Build 059: provider-aware local chat with saved history, explicit voice review and a manual route to cited Knowledge answers.",
    tasks: [
      "Choose the profile that matches the job: General, Coding, Home, Workshop, or Business.",
      "Write a question in Chat and choose Check this question in Knowledge to transfer an editable draft. Search and citation generation are separate manual actions.",
      "Streaming chat temporarily disables conversation switching; stop the reply first if you need another conversation.",
      "Select an installed model, open or create a conversation, then send the request.",
      "Use Knowledge for citation-heavy document questions when you need explicit evidence.",
      "For speech recognition: install whisper-cli and a local model, then Record locally; review the transcript before Send.",
      "For local voice playback (Build 043): select Speak on a completed assistant reply; Stop voice interrupts playback. Longer replies offer a 600-character excerpt.",
      "Build 044: Record locally, review the separate voice draft, then select Review voice command. Only an exact allow-listed action has a Confirm exact action button.",
      "Use Move question to Chat for reviewed non-command speech; voice commands never automatically send Chat messages.",
    ],
    safety: [
      "Local microphone transcription never sends chat or executes a device command automatically; review the editable text.",
      "Changing a Knowledge query, collection, source or mode clears previously shown evidence so old citations are not mistaken for new results.",
      "Local Windows SAPI voice playback is opt-in, offline and never acts as a tool command; generated WAV files are temporary.",
      "Voice recognition does not prove identity: every action requires the current authenticated account and an explicit confirmation click.",
      "Do not execute hazardous, bulk, ambiguous, or unapproved speech. Sensitive Level-2 actions keep the existing separate approval process.",
      "AI text is not authority for physical or business state.",
      "High-risk actions remain blocked or require exact confirmation even when requested in chat.",
    ],
    troubleshooting: [
      "Speech unavailable: install the local whisper.cpp executable and GGML model; see Build 042 setup guide.",
      "Speak disabled: verify the Windows SAPI voice is installed and you are signed into the Hub. No cloud voices are used.",
      "Voice preview blocked: correct the spoken wording, check Devices allowlist and confirm the exact single safe target.",
      "401 Unauthorized: sign in using the existing Hub account; do not disable authentication to enable voice.",
      "Microphone unavailable: use localhost/HTTPS and grant microphone permission in the browser.",
      "No model available: install or start an Ollama model.",
      "Generation failure: keep the conversation; provider recovery does not erase history.",
    ],
  },
  Vault: {
    purpose: "The planned first-party, locally hosted household password and document vault is a security-gated, non-operational architecture preview, not a third-party installation.",
    tasks: [
      "Review the first-party threat model, mandatory architecture gates, independent encrypted storage and private HTTPS access plan before any pilot.",
      "A future reviewed first-party vault must have separate personal accounts, independent unlock, hardware-key/passkey MFA, offline emergency recovery and independent encrypted backups.",
      "Keep Knowledge for recipes, car servicing instructions and owners manuals. Keep integration Secrets for tokens used by the Hub only.",
      "No password storage is available here. The local first-party implementation remains blocked until security verification and a separately authorized Windows pilot pass.",
    ],
    safety: [
      "Do not enter passwords, master keys, recovery codes or two-factor seeds into this Hub preview, Knowledge, Chat, AI tools or Support screenshots.",
      "The vault preview does not install a password server, enable two-factor login, activate sharing or accept secrets. All live credential operations remain blocked.",
      "No public port forwarding, Tailscale Funnel, Hub proxy of decrypted entries or reuse of the Hub SECRET_ENCRYPTION_KEY for personal vaults.",
    ],
    troubleshooting: [
      "Vault SECURITY HOLD is expected: architecture drafts and synthetic tests are not an activated password service or proof of a safe first-party implementation.",
      "If the Hub login works, that still does not grant access to anyone's personal password records.",
      "Do not try to repair this preview by placing passwords in Secrets or Knowledge. Wait for a reviewed first-party implementation and separate MFA acceptance.",
    ],
  },
  Workshop: {
    purpose: "Build 145: private multi-project equipment 360, manual inspection evidence and owner-reviewed preventive maintenance schedules.",
    tasks: [
      "Register project-specific workstations, hazardous activity labels and equipment as initially unverified.",
      "Filter by project, review maintenance status, and record manual inspection observations.",
      "Inspect history and blocked status before undertaking separate external safety procedures.",
      "Apply Build 057 Alembic migration 0018 after verifying an encrypted restorable backup while the API is stopped.",
      "Build 145: filter equipment by project, text or due date; open a machine to inspect its due schedule, manual owner assignment, checklist, parts references and append-only maintenance history.",
      "Owner/Admin may create a service plan with explicit due date and repeat interval. A stale plan revision cannot overwrite an updated schedule. Record checked only after marking every checklist item actually completed.",
      "Apply Alembic migration 0026 only on the reviewed Windows maintenance path after an encrypted backup and verified restore procedure.",
    ],
    safety: [
      "No inspection record is a permit to operate lasers, CNC, forges, electrical or chemical equipment.",
      "Observed OK still requires independent safety review; unsafe observations mark equipment blocked.",
      "No automatic machine control, remote execution, background task or connector writes are enabled.",
      "Only Owner/Administrator can manage the private workshop register; writes are audited.",
      "A complete maintenance checklist updates the due date only; it never certifies equipment or clears an unsafe hold. Needs-service and unsafe reports do not advance the date.",
    ],
    troubleshooting: [
      "Workshop maintenance API error: verify local database is migrated through Alembic revision 0026 (equipment/inspection foundation was introduced in 0018).",
      "Cannot select a workstation: confirm its project key matches the equipment project.",
      "No recent inspection: manually verify and record a new observation, never assume safe readiness.",
    ],
  },
  Knowledge: {
    purpose: "Ingests private files, organizes collections, searches indexed content, and produces citations.",
    tasks: [
      "Create or select a collection before ingesting a document. Build 055 adds one source-review workbench for each project.",
      "Upload PDF, TXT, Markdown, or DOCX files, then index/re-index as needed.",
      "Select Search this project to scope existing cited evidence results to one collection.",
      "Owner/Admin can review or flag an existing source and manually index up to three queued sources sequentially.",
    ],
    safety: [
      "Local-only collections should remain local unless you deliberately configure a non-local provider later.",
      "Document deletion is a confirmed Level-2 action and cannot be silently replayed.",
      "Private review notes remain owner/admin only. Source approval is not permission to publish or upload.",
    ],
    troubleshooting: [
      "Needs indexing: re-index the document after confirming Ollama embeddings are available.",
      "Duplicate upload: the content hash intentionally prevents identical source duplication across collections; move the existing source intentionally rather than copying.",
    ],
  },
  Devices: {
    purpose: "Guided opt-in discovery inbox, source-aware Device 360 identities, Home Assistant entities, missing device recovery and the explicit safe-control allow list.",
    tasks: [
      "Build 140: Owner/Admin start the Guided Discovery Inbox source read intentionally; opening Devices never scans or enrolls hardware. Review source availability, confidence, exact provider IDs, duplicate warnings and five-minute freshness before a one-at-a-time decision.",
      "A discovery decision is only a versioned local review. Home Assistant enrollment remains in its supported HA integration; MQTT references are notes rather than subscriptions. Reject, investigate and unsupported decisions never change connected devices.",
      "ONVIF discovery requires a separate explicit scan. Review an exact unregistered UUID, save follow-up approval, then independently confirm one camera registration. Only a still-valid, single-use ticket may register it, disabled-first; verify in Cameras before enabling anything.",
      "X10 legacy motion sensors and Meross devices do not pair directly here. If an independently supported X10 bridge works with Home Assistant, configure it separately and re-read the source inventory; this inbox does not claim a bridge exists.",
      "In Device 360, search by exact source identity, label or room; filter Home Assistant devices, entities, camera records and manually reviewed MQTT topics. Counts are source identities, not necessarily unique pieces of hardware.",
      "Inspect a source's last reported observation, room origin, capabilities and current safe-control eligibility. Unavailable or stale provider readings do not prove a device is removed or safe.",
      "Owner/Admin may annotate a display name and local Hub room, classify unsupported identities and record possible or distinct cross-source matches. No rename, merge, adoption, room change in Home Assistant or pairing happens at the provider.",
      "Owner/Admin can record an exact, non-secret MQTT topic after acknowledging it is only a local reference, never a broker subscription or publish. Existing camera and MQTT permissions remain unchanged.",
      "Refresh entity inventory and filter by area, device, domain, or state.",
      "For Build 114 missing-device diagnosis, compare prior saved inventory against one fresh authenticated HA read. Group only confirmed missing identities by integration; missing entities are not necessarily broken integrations.",
      "When adding recognized devices, compare exact IDs and areas before enabling any controls. Save field notes; require a fresh registry read and a real device function check before acceptance.",
      "Owner/Admin can add ordinary lights, switches, and scenes to the safe-control allow list.",
      "Use the bounded control buttons only for the exact approved entity.",
      "Build 144: Owner/Admin can draft up to four distinct safe light/switch effects. Preview only reads current Home Assistant states; review exact targets and type the one-use phrase within two minutes to execute deliberately.",
    ],
    safety: [
      "Source readings expire after five minutes; stale or unavailable sources are a HOLD, not permission to adopt. Duplicate UUIDs and conflicting camera endpoints prohibit registration.",
      "Device 360 source IDs are preserved. A proposed duplicate never silently merges or reassigns two physical devices; a provider ID change is held separately until owner review.",
      "Discovery and diagnostic reviews do not automatically enroll devices, repair Home Assistant, change integrations, or issue physical commands.",
      "Safety-sensitive or hazardous targets remain prohibited even if their names resemble ordinary devices.",
      "Home Assistant must be available for writes; the Hub does not queue uncertain physical changes.",
      "Scene drafts hold opaque native scene activations and high-risk machines, locks, alarms or heating. A partial or unverified scene stops future steps; Home Assistant state is not proof that a physical device moved.",
    ],
    troubleshooting: [
      "An expected device is absent: check Home Assistant Devices & Services, its actual integration and discovery network before treating a guessed entity ID as real.",
      "Connection unavailable: verify HOME_ASSISTANT_URL and the token in Secrets or environment.",
      "Control denied: verify entity type, allow-list membership, tool enable state, and current HA state.",
    ],
  },
  Cameras: {
    purpose: "Build 141 Camera Wall V2 provides a single deliberate private video panel; Build 142 combines Frigate event metadata and Hub review-only history with safe evidence filters and manual follow-up.",
    tasks: [
      "Build 142: Refresh Frigate to inspect at most 100 recent source events, with duplicate event IDs reconciled. Local older reviews are retained but are not proof of available media.",
      "Filter evidence by camera, source, object category, local calendar dates and review state; change timestamp display from local timezone to UTC as needed.",
      "Owner/Admin can Acknowledge for follow-up on a fresh, consistent current Frigate event. This writes a local review status, keeps any existing note, and never changes recordings, clip retention or physical controls.",
      "If the workbench reports conflict, clock drift, stale sample or media unverified, refresh and inspect the recorder through separately authorized access. No raw Frigate or RTSP playback links are exposed.",
      "Use Room or site to group cameras by Device 360 owner-reviewed room annotations. Unassigned and unavailable rooms are explicit; no guessed camera-to-HA pairing is performed.",
      "Choose Favorites and Compact cards, then Save private layout to the current signed-in Hub account. Only camera IDs and density are saved, never streams or RTSP source addresses.",
      "The wall deliberately displays a no-still placeholder if there is no supported authenticated snapshot source. Click Start private preview for one eligible stream, then Stop large preview; switching selection stops the old stream.",
      "Use the summary cards to see total, enabled, configured, healthy, and attention-needed cameras.",
      "Review local ONVIF candidates. Select only recognizable devices; registration keeps newly added cameras disabled until our own verification.",
      "Compare the camera discovery bulk-restore workbench with the existing registry; check duplicate endpoint IDs and network collisions before approving any registration.",
      "Configure the RTSP source in its password field only when required. Never paste a camera password into Chat, Help, Knowledge, or the diagnostic receipt.",
      "For Build 116, select one registered camera in Private stream and playback acceptance, run a fresh private probe, then deliberately Start private preview on the Windows server browser.",
      "Mark the moving-video checkbox only after personally seeing motion from that exact camera, then select Recheck this same private stream. Stop preview afterward.",
      "The camera tile preview is also start/stop on demand; a green probe alone does not mean our camera was accepted.",
      "In Cameras, filter Frigate timeline events by camera, object and review state; order newest or oldest first.",
      "Owner/Admin can add private local event notes, flag/review events, and manually export up to 100 review metadata rows after acknowledgement.",
    ],
    safety: [
      "Camera Wall never auto-loads streams, cannot start more than one large stream and stops playback if the browser tab is hidden or transport eligibility fails. Private preferences are per-account and revision checked.",
      "Source credentials are submitted only to the encrypted server-side stream configuration and must never be redisplayed or included in help or exports.",
      "A locally healthy producer is not proof of moving video. Session-only review is not an installed Windows or permanent owner field-acceptance receipt.",
      "go2rtc API and RTSP must remain loopback-only; private viewer launch is limited to browsers running on the Windows Hub itself.",
      "Preview is off until clicked, and no camera stream, router port, Home Assistant integration or MQTT service is automatically modified by acceptance.",
      "Build 054 saves only Hub-local event review metadata, never modifying Frigate recordings, labels, retention, streams, or event sources.",
      "Review-note CSV exports contain private local notes; store or delete them securely. No camera clips are exported.",
      "The Frigate internal API is accepted only on localhost/loopback; do not expose its unauthenticated internal port to the LAN or internet.",
    ],
    troubleshooting: [
      "Camera not listed: register only after safe discovery and physical identification. A newly registered camera stays disabled until deliberately reviewed.",
      "Private probe unavailable: inspect the go2rtc loopback flags, camera enabled state, encrypted RTSP source and current registry identity before retrying.",
      "Preview unavailable from a different device: open the Hub in a browser on the Windows server itself. Do not expose an unauthenticated go2rtc port or redirect localhost to the remote camera host.",
      "Health marked healthy but no moving video: stop preview, diagnose actual RTSP media and replay, and leave field acceptance on hold.",
      "Frigate offline is non-fatal: the camera dashboard and go2rtc continue to work without it.",
      "For Frigate, verify the local service is reachable at FRIGATE_BASE_URL and remains bound to loopback.",
      "For live-view or camera-health issues, verify go2rtc, RTSP configuration, and private camera reachability separately.",
    ],
  },
  MQTT: {
    purpose: "Build 143: inspect bounded, redacted MQTT topic observations, review source-to-device links and deliberately preview one exact publish before sending.",
    tasks: [
      "Verify broker status, then refresh the owner-only topic explorer. It reads only already subscribed and allowlisted buffered observations without adding broker subscriptions.",
      "Use a concrete namespace filter; hidden or absent message bodies are not proof a physical device is offline.",
      "Select an observed MQTT topic and a current Home Assistant device for an explicit possible-match review. The saved note cannot pair, adopt or command a device.",
      "Preview a concrete allowlisted publish, check its payload byte count and checksum, then type that exact topic again to authorize one send. Confirmed broker acceptance is not device action proof.",
    ],
    safety: [
      "Sensitive topic names and received payloads are hidden by default, including direct legacy message API reads. Unknown wildcard topics cannot trigger discovery controls.",
      "Anonymous fallback and retained publishing are prohibited. Broker credentials remain server-side, and payload text is not copied into audit history.",
    ],
    troubleshooting: [
      "Not configured: set broker host, username, password, and MQTT_ALLOWED_TOPICS.",
      "Subscription denied: compare the requested filter exactly with the configured allow-list policy.",
    ],
  },
  Notifications: {
    purpose: "Shows persistent local household alerts created by the Hub and deterministic automations.",
    tasks: [
      "Filter by read state or severity, then mark items read or dismiss them for your account.",
      "Owner/Admin can use Send local test to verify the notification path.",
      "Automation authors can use notification.household.send for Level-1 in-app alerts.",
    ],
    safety: [
      "Build 030 notifications are local in-app records only; they do not send email, SMS, or external push messages.",
      "External messaging remains Level-2 and is not introduced by this build.",
    ],
    troubleshooting: [
      "No alert appears: verify the automation run succeeded and notification.household.send is enabled in Tools.",
      "After an upgrade, run Alembic to head so notifications and notification_receipts exist.",
    ],
  },
  Business: {
    purpose:
      "Provides bounded live reads for all three businesses plus Build 040's two exact Level-2 confirmed writes: a Devil n Dove review-only story draft and a Yard Workers private internal job comment.",
    tasks: [
      "Keep the existing business credentials in Secrets; Build 040 introduces no new provider credential.",
      "For Devil n Dove, enter a product ID and draft wording, then Prepare exact confirmation, review the arguments, Approve exact write, and Execute confirmed write.",
      "For Yard Workers, enter the numeric job ID and internal update, then use the same three-stage confirmation flow. The signed-in Yard Workers user needs Jobs create access and Supervisor+ authority.",
      "Use the existing Read buttons for bounded previews. Rosie Dazzlers remains strictly read-only in Build 040.",
    ],
    safety: [
      "There is no generic business write proxy. Only business.devilndove.story_draft.create and business.yardworkers.job_comment.create are registered write tools.",
      "Devil n Dove is forced to display_status=draft and privacy_status=needs_review; the Hub cannot approve or publish the story.",
      "Yard Workers is forced to comment_type=update, visible_to_client=false, is_special_instruction=false, and set_job_instruction=false.",
      "Rosie Dazzlers inherits the hard-blocked base write path because its current mutation APIs are broader than this safety boundary.",
      "Exact confirmation is consumed before the external request. A timeout, provider error, or ambiguous result is never automatically retried; inspect the source system before preparing a new confirmation.",
    ],
    troubleshooting: [
      "Unconfigured: add or rotate every required connector credential in Secrets; session-style access tokens can expire.",
      "Confirmation mismatch or replay rejection: prepare a new exact confirmation only for the intended arguments.",
      "Yard Workers write rejected: refresh the access token and verify Jobs create permission plus Supervisor+ role.",
      "After a failed/uncertain write, inspect the source system first because the approval has already been consumed and the Hub deliberately will not retry it.",
    ],
  },
  System: {
    purpose: "Shows owner/admin read-only Windows startup/recovery observations, post-reboot diagnostics, device/camera field review, installed version evidence, resource budgets and private LAN/Tailscale access.",
    tasks: [
      "Build 151: under Independent retest review, inspect the nine Source identity change & repeat-trial routes. Filter repeat-required changes or missing/historical evidence, then select the exact trial case and open its existing module to check manually.",
      "Build 151: after personally verifying the actual Windows version and recording a field trial, classify the source as confirmed alias, unknown or mismatch. Enter only a made-up asset_ tracking token, never a device identifier, location, serial, MAC, IP or secret.",
      "Build 151: export a private source routing receipt containing the Build 148–150 evidence chain and owner-safe checks; Build 148–151 imports always become historical and require new Windows verification. No route dispatches a job.",
      "Build 150: after a Build 149 handoff is prepared, use the independent retest review to mark one of seven exact evidence criteria as missing, contradictory or personally present. Every mark is a private, unverified reviewer claim.",
      "Build 150: review original failure, prepared handoff, installed Windows, later witnessed retest, unchanged identity, safety permissions and a separate reviewer; an imported receipt can never count as fresh acceptance.",
      "Build 150: export the private independent review JSON to preserve the complete Build 148–150 chain, or import any previous Build 148/149/150 receipt. The review packet may be prepared, but closure stays NOT AUTHORIZED.",
      "Build 149: under the field trial ledger, filter historical findings by system, severity, assigned role or repeated observation. Triage is descriptive, not physical risk certification.",
      "Build 149: draft an internal repair handoff from an actual witnessed issue; manually review the exact source issue before preparing it for separate private delivery. Preparation never sends a task or performs the repair.",
      "Build 149: compare later owner trial observations with the original handed-off finding, import old Build 148 or new Build 149 receipts and export the bounded private reconciliation JSON. Observed improvements remain on independent review HOLD.",
      "Build 148: use the Cross-module owner field trial to record witnessed outcomes separately from source CI, read-only integration status, installed Windows evidence and independent acceptance.",
      "Build 148: choose each module, review the existing screen, categorize any problem and assign a next-action role; a later observed pass remains on independent field HOLD. Export the private receipt explicitly for continuity.",
      "Build 147: use the mobile Open menu button, Ctrl/Cmd+K screen finder or Jump to another screen to navigate authorized Hub sections. Density and contrast controls change presentation only.",
      "Build 146: in Service startup & recovery console, capture an explicit before-maintenance and later after-maintenance API classification; it never starts or stops anything.",
      "Run scripts/inspect-hub-startup-console.ps1 locally on the actual Windows PC after inspecting the script; paste only the classified JSON into the Build 146 import. No usernames, paths, task commands or secrets are accepted.",
      "Build 146: compare original Windows task results with Home Assistant, MQTT, Ollama, Hub, private go2rtc and Frigate health; check actual VM identity and private HTTPS separately, then export a private, HOLD-labelled owner review receipt.",
      "Build 117 Post-reboot acceptance is manual: inspect backups, the existing Windows startup task and original Home Assistant VM first. No Runbook button reboots or repairs a service.",
      "Capture a before-reboot snapshot, show its private JSON and save it securely. After an owner-supervised Windows reboot, import that baseline and take a separate after snapshot.",
      "Compare exact Home Assistant entity IDs, separate Hub camera IDs, service status and Hub version. Matching counts alone cannot prove equipment recovered.",
      "Check all manual field observations only when personally confirmed: Task Scheduler history, VM EFI/boot, authenticated HA/MQTT, local Ollama, private HTTPS client and actual moving camera video.",
      "Build 118 recovery summary: import the private Build 110 worklist and exact matching Build 111 owner closure ledger, then select Read current authenticated registry.",
      "Filter unresolved or reopened Home Assistant identities and registered cameras; compare historical owner marks with fresh exact IDs, and assign the next household/workshop/camera operator.",
      "For devices, test real function. For cameras, use Build 116's private supervised moving-video viewer. Check the matching Build 118 box only after personally observing the action.",
      "Download Build 118's private sanitized owner summary with unresolved holds, reopens, owner assignments and source timestamps; no installed-Windows field acceptance is asserted.",
      "PowerShell read-only inspectors: scripts/inspect-hub-reboot-readiness.ps1, scripts/inspect-hub-startup-readiness.ps1, and scripts/inspect-hub-ha-mqtt-readiness.ps1. Run only from the installed Windows checkout after verifying their contents.",
      "Use Local service diagnostics as Owner/Admin to inspect Hub, Ollama, Home Assistant, MQTT and go2rtc; expand guided checks and manually inspect Windows logs without automatic repairs.",
      "Open the resource budget panel as Owner/Admin, select Refresh to sample memory and disk once; no background polling is performed.",
      "Compare observed values to the documented guidelines; warnings do not shut down Ollama, MQTT, cameras or automations.",
      "On the Windows server, update Build 046, verify /version and confirm the production web loads at http://127.0.0.1:8765/.",
      "Install Tailscale on the server and approved client devices, sign into the same private tailnet, and review Tailscale network access rules.",
      "Run scripts/enable-tailscale-serve.ps1 first without flags to check local safety, then use -Enable only after inspecting any existing Serve/Funnel configuration.",
      "Use the private https://*.ts.net URL printed by tailscale serve status. Log into the Hub as normal on each device.",
    ],
    safety: [
      "Build 151 compares unverified pseudonymous aliases and installed-version labels. Equal aliases do not prove the same physical source; a change, reopened case, historical import, stale source or unknown Windows context always retains FIELD_ACCEPTANCE_HOLD.",
      "Build 150 does not authenticate an independent reviewer or certify their identity. Every reviewer attestation is self-reported, and contradictory, missing, stale or imported evidence cannot authorize closure.",
      "Build 149 does not authorize repairs, dispatch handoffs, close findings automatically or infer installed Windows/device acceptance from a JSON receipt or successful CI.",
      "Build 148 never auto-probes hardware or certifies Windows. Its optional status refresh uses only existing read-only GETs; no secrets, private endpoints, device commands, camera streams or router changes are collected.",
      "Build 147 navigation, themes, help disclosures and keyboard shortcuts never run commands, broaden roles, enroll hardware or affect Vault security holds.",
      "Build 146 requires a fresh operator-supplied Windows task report and six real operator observations for session review; success statuses or checkboxes cannot certify installed-Windows recovery.",
      "Build 146 does not run PowerShell, repair tasks, reboot Windows, restart services, start VirtualBox, send MQTT messages, poll automatically or modify router/camera settings.",
      "Post-reboot snapshots stay in this browser session unless an operator copies the private identity-only JSON; never share it in a public issue or include credentials and camera endpoint URLs.",
      "Build 117 cannot prove the PC actually rebooted; the owner must review the Windows scheduled task and after-start logs separately. Session reviewed is not an installed acceptance receipt.",
      "Build 118 historical closure, a healthy stream probe and owner checkbox are not independently signed proof of real device function or installed Windows success. Its exported summary always remains FIELD_ACCEPTANCE_HOLD.",
      "Do not create duplicate VirtualBox machines, Mosquitto brokers, Ollama servers, scheduled tasks, Caddy/HTTPS endpoints or go2rtc listeners to make a green check appear.",
      "Never use Tailscale Funnel, router port forwarding, public DNS proxies or wildcard API origins for the Hub.",
      "Tailnet membership alone does not replace Hub password/role checks. Restrict access with Tailscale grants or ACLs.",
      "Keep Hub API and go2rtc/Ollama listeners bound to 127.0.0.1; private HTTPS is terminated by Tailscale Serve.",
      "A remote PWA still cannot queue offline actions, view cached private data or bypass confirmations.",
    ],
    troubleshooting: [
      "Build 146 service marked unverified: an authenticated GET was unavailable; inspect the original Windows host and integration logs instead of assuming the device is broken.",
      "Build 146 Windows report rejected: run the exact local inspector and paste only its JSON, within 24 hours; do not copy raw Task Scheduler XML or action arguments.",
      "Missing device after restart: investigate existing Home Assistant integration and device-registry provenance before adding anything; a disappeared camera registry is independent from Home Assistant discoveries.",
      "Baseline import rejected: use only the exact Build 117 JSON schema copied from the local review. Unexpected URLs, keys or credentials are rejected.",
      "Service status ready but camera video missing: keep physical field acceptance on hold and use the separate Build 116 supervised moving-video check on the Windows Hub itself.",
      "Build 118 worklist/ledger mismatch: use the exact paired Build 110 and 111 private files; never edit identities or timestamps to make records match.",
      "Build 118 summary stale or reopened: refresh authenticated devices/camera registry explicitly, reassign the next action and repeat physical checks; all session observations reset on refresh.",
      "If a diagnostic is Not verified, confirm Hub account permissions and inspect the relevant local service logs; do not assume an outage or disclose raw errors.",
      "If the remote app loads but APIs fail, check Build 046 is deployed: frontend calls same-origin /api instead of the remote device's localhost.",
      "If Tailscale Serve is unavailable, complete the Tailscale device login and HTTPS approval first. No public exposure is necessary.",
      "If the browser reports 401 Unauthorized, sign into the Hub; never disable the app's authentication.",
      "If / does not load on port 8765, rebuild the web dist and restart only the Hub API.",
      "Some camera streams may need a separate secure same-origin viewer; never expose go2rtc's unauthenticated ports.",
    ],
  },
  Automations: {
    purpose: "Authors deterministic rules, including local Frigate event triggers, and exposes runtime and execution history.",
    tasks: [
      "Draft a rule, review exact Rule Schema JSON, then use the Level-2 save confirmation.",
      "Leave new rules disabled until trigger, conditions, targets, and cooldown are verified.",
      "Inspect execution history before changing a rule after a failure or interruption.",
      "Build 056 Operations shows event trigger readiness, dropped events, cooldown and last observed run; no clock scheduler is implied.",
      "Prepare an exact pause/enable confirmation, verify the details, and approve or reject it separately.",
    ],
    safety: [
      "AI may draft rules but never saves or executes them by itself.",
      "Failed/interrupted physical actions are not automatically replayed because the remote outcome may be uncertain.",
      "The rule can appear event-ready from configuration alone even when a broker or device is unreachable. Never infer a confirmed connection.",
    ],
    troubleshooting: [
      "Draft rejected: fix unsupported tools, arguments, entities, or MQTT policy mismatches.",
      "Run failed: inspect failure kind, Audit evidence, tool status, and integration availability.",
    ],
  },
  Confirmations: {
    purpose: "Shows exact Level-2 action previews that require explicit Owner/Admin approval or rejection.",
    tasks: [
      "Read the summary and exact arguments before approving.",
      "Reject actions that are stale, unexpected, ambiguous, or no longer necessary.",
      "Complete the protected operation before the confirmation expires.",
    ],
    safety: [
      "Confirmations are bound to exact arguments and are single-use.",
      "Level-3 actions remain prohibited and do not become safe merely because someone requests confirmation.",
    ],
    troubleshooting: [
      "Expired: prepare a new confirmation from the original workflow.",
      "Mismatch/replay rejection: refresh the record and prepare a new exact action.",
    ],
  },
  Audit: {
    purpose: "Provides immutable, searchable evidence for authentication, tools, confirmations, automations, and important changes.",
    tasks: [
      "Filter by actor, event type, object, tool, result, confirmation, text, or time.",
      "Open sanitized arguments and result evidence for an incident or change.",
      "Use Audit alongside automation history when diagnosing physical-action failures.",
    ],
    safety: [
      "Secrets and sensitive argument fields are sanitized before persistence.",
      "Audit evidence is append-oriented; it is not a command queue.",
    ],
    troubleshooting: [
      "Unexpected empty result: clear filters and widen the time range.",
      "Missing actor on automation events is normal for server-owned deterministic execution.",
    ],
  },
  Secrets: {
    purpose: "Stores supported integration credentials encrypted at rest or reports environment-backed values.",
    tasks: [
      "Enter a replacement value, save/rotate, then verify the consuming integration.",
      "Use master-key rewrap only while both current and previous encryption keys are correctly configured; Build 032 includes encrypted camera RTSP sources in that rewrap.",
      "Keep environment-backed secrets out of GitHub and application logs.",
    ],
    safety: [
      "Saved plaintext is never redisplayed by the UI.",
      "Never remove the previous master key until rewrap has succeeded and integrations are verified.",
    ],
    troubleshooting: [
      "Encryption unavailable: configure SECRET_ENCRYPTION_KEY on the Hub machine.",
      "Integration still offline: verify the correct secret source is effective and restart when environment variables changed.",
    ],
  },
  Tools: {
    purpose: "Shows normalized tool contracts, capabilities, enable state, risk level, and confirmation policy.",
    tasks: [
      "Review the exact input/output schema before enabling a tool.",
      "Owner/Admin can disable a tool globally when an integration or delegated action should stop.",
      "Confirm automation tools are both enabled and supported by the deterministic Event Engine.",
    ],
    safety: [
      "Level-2 tools require confirmation and Level-3 tools cannot be freely delegated.",
      "Disabling a tool is an immediate policy control; enabled automations recheck tool state before execution.",
    ],
    troubleshooting: [
      "Automation rejected: make sure every referenced tool exists, is enabled, and has an Event Engine executor.",
      "Schema validation failed: correct the exact arguments rather than bypassing validation.",
    ],
  },
  Users: {
    purpose: "Manages local Hub accounts and role-based access.",
    tasks: [
      "Owner/Admin can create household or read-only accounts.",
      "Owners manage privileged roles and must preserve at least one enabled owner.",
      "Disable unused accounts rather than sharing credentials.",
    ],
    safety: [
      "Passwords are hashed and raw session tokens are not stored.",
      "Administrator privileges are narrower than Owner privileges for privileged-account changes.",
    ],
    troubleshooting: [
      "Login rejected: verify account enabled state and reset the password through an authorized admin workflow.",
      "Last-owner protection intentionally blocks removing the final enabled owner.",
    ],
  },
};

const DEFAULT_HELP: HelpTopic = {
  purpose: "Contextual help for this Rosevear AI Hub section.",
  tasks: ["Use the visible controls in sequence and review status messages before moving on."],
  safety: ["Keep high-risk or external actions behind the Hub permission and confirmation boundaries."],
  troubleshooting: ["Use Audit and the section status/error messages to identify the failing layer."],
};

export function SectionHelp({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const topic = HELP_TOPICS[section] ?? DEFAULT_HELP;

  useEffect(() => setOpen(false), [section]);

  function closeHelp() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeHelp();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="section-help">
      <button
        ref={triggerRef}
        className="help-trigger"
        type="button"
        aria-label={"Help for " + section}
        aria-controls="section-help-panel"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        i
      </button>

      {open ? (
        <aside
          id="section-help-panel"
          className="help-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="section-help-title"
        >
          <div className="help-panel-header">
            <div>
              <p className="eyebrow">Section help</p>
              <h2 id="section-help-title">{section}</h2>
            </div>
            <button
              className="help-close"
              type="button"
              aria-label="Close help"
              onClick={closeHelp}
            >
              ×
            </button>
          </div>

          <p>{topic.purpose}</p>

          <section>
            <h3>Common tasks</h3>
            <ol>{topic.tasks.map((item) => <li key={item}>{item}</li>)}</ol>
          </section>

          <section>
            <h3>Safety and permissions</h3>
            <ul>{topic.safety.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section>
            <h3>Troubleshooting</h3>
            <ul>{topic.troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </aside>
      ) : null}
    </div>
  );
}
