# Rosevear AI Hub Build 281 — owner follow-up queue and module baseline

## Delivered functionality

- The Home owner/administrator notification review journal now has a *personal* queue, built entirely from the existing account-scoped, browser-local Build 280 entries.
- One row per notification shows the newest personal outcome, elapsed days since that outcome, local-review priority and a safe link back to the recorded inbox page.
- Filters: outstanding/reviewed/all, 7+/14+ days/clock check, and high/attention/routine priority. These filters never fetch or alter the actual inbox.
- An outstanding latest local review at least 14 days old is **high**; an outstanding review at least 7 days old, explicitly marked follow-up, or with a future clock timestamp is **attention**; others are **routine**. A locally reviewed entry is *never* treated as proof of server resolution.
- Missing or relocated notifications remain unverified. Original journal capacity, browser account isolation and permission restrictions remain in place. Nothing runs as a background automation.

Implementation: [`apps/web/src/alertFollowUpQueue.ts`](../apps/web/src/alertFollowUpQueue.ts), [`apps/web/src/HomeActivitySummary.tsx`](../apps/web/src/HomeActivitySummary.tsx); tests: [`alertFollowUpQueue.test.ts`](../apps/web/src/alertFollowUpQueue.test.ts), [`HomeActivitySummary.test.tsx`](../apps/web/src/HomeActivitySummary.test.tsx).

## Provisional module implementation coverage — AI Hub only

These **percentages are reviewer estimates of code coverage and product readiness, not audited completion of the entire Rosevear application suite**. Each applicable row is evaluated against five equally weighted milestones: identifiable scope/documentation (20), usable front-end journey (20), working local API/persistence where appropriate (20), automated tests including negative states (20), and independent confirmation on the real Ree Windows server or target device (20). Where scope is not an AI Hub responsibility, `N/A` is reported instead of a misleading zero. Some cross-cutting rows have conservative discounts for an incomplete end-to-end workflow. This is not a security certification.

| Requested module / facet | AI Hub estimate | Direct code evidence and important gap |
| --- | ---: | --- |
| Customer experience — mobile | N/A | No customer-facing AI Hub product; customer workflows belong to the business applications. |
| Customer experience — desktop | N/A | Same boundary. |
| Customer experience — tablet | N/A | Same boundary. |
| Worker — mobile | N/A | Hub has owner/admin and read-only accounts, not a field-worker portal. |
| Worker — desktop | N/A | Same boundary. |
| Worker — tablet | N/A | Same boundary. |
| Admin/owner — desktop | 80% | [`App.tsx`](../apps/web/src/App.tsx), [`AuthView.tsx`](../apps/web/src/AuthView.tsx), and their tests; real Windows owner acceptance not reverified. |
| Admin/owner — mobile | 60% | Responsive shell, navigation and [`PwaInstallPanel.tsx`](../apps/web/src/PwaInstallPanel.tsx); no independent phone acceptance. |
| Admin/owner — tablet | 60% | Responsive layouts are present, but no independent tablet acceptance. |
| Project tracking | 80% | [`WorkshopJobsPanel.tsx`](../apps/web/src/WorkshopJobsPanel.tsx), [`workshop_jobs.py`](../server/src/rosevear_ai_hub/api/workshop_jobs.py), tests; manual local workshop projects only. |
| Job preparation and progress | 80% | Workshop job statuses, estimates, material use and evidence in the same ledger; no field/production proof. |
| Supplies / consumables planning | 60% | Workshop bill-of-materials estimated/actual quantities; no reliable purchasing or stock ledger. |
| Tools and equipment | 80% | [`ToolsView.tsx`](../apps/web/src/ToolsView.tsx), [`WorkshopMaintenancePlanner.tsx`](../apps/web/src/WorkshopMaintenancePlanner.tsx), server tool and workshop APIs; no physical inventory audit. |
| Business inventory | N/A | Product stock is owned by each business app; Hub read-only connector previews do not own it. |
| End products / retail catalogue | N/A | Owned by Devil n Dove or other selling apps. |
| Job financial tracking | N/A | No Hub job costing ledger; workshop explicitly records no financial posting. |
| Payroll | N/A | Business payroll, not Hub scope. |
| Invoicing | N/A | Invoicing belongs to business apps. |
| Accounting | N/A | No Hub accounting general ledger. |
| Taxation | N/A | Tax management belongs to business apps. |
| Storefront | N/A | No Hub public storefront. |
| Social integration | N/A | Business marketing/publishing integration, not implemented as a Hub capability. |
| Advertising | N/A | Campaign and ads management are not Hub capabilities. |
| Rosevear six-app integration | 60% | [`SixAppReadinessPanel.tsx`](../apps/web/src/SixAppReadinessPanel.tsx), [`IntegrationHealthPanel.tsx`](../apps/web/src/IntegrationHealthPanel.tsx), [`integration_v1.py`](../server/src/rosevear_ai_hub/api/integration_v1.py); private relay and external trusted connection remain HOLD. |
| I.T. integration and release dashboard | 60% | [`ReleaseObservabilityPanel.tsx`](../apps/web/src/ReleaseObservabilityPanel.tsx), System workspaces and tests; many local/evidence panels, but not an independently live full-estate dashboard. |
| Security, roles and audit | 80% | [`auth.py`](../server/src/rosevear_ai_hub/auth.py), [`audit.py`](../server/src/rosevear_ai_hub/audit.py), [`SecurityReviewPanel.tsx`](../apps/web/src/SecurityReviewPanel.tsx), tests; vault trust and external/live security acceptance are separate HOLDs. |
| Home notifications and personal triage | 80% | [`HomeActivitySummary.tsx`](../apps/web/src/HomeActivitySummary.tsx), [`notifications.py`](../server/src/rosevear_ai_hub/api/notifications.py), Builds 274–281 tests; client-local notes, not server acknowledgement. |
| Cameras and video review | 80% | [`CameraView.tsx`](../apps/web/src/CameraView.tsx), [`cameras.py`](../server/src/rosevear_ai_hub/api/cameras.py), tests; actual cameras/providers need independent live acceptance. |
| Devices, Home Assistant and MQTT | 80% | [`HomeAssistantView.tsx`](../apps/web/src/HomeAssistantView.tsx), [`MQTTView.tsx`](../apps/web/src/MQTTView.tsx), server APIs/tests; no blanket certification of actual equipment. |
| Legacy X10 bridge | 40% | [`X10BridgeFeasibility.tsx`](../apps/web/src/X10BridgeFeasibility.tsx); no connected X10 hardware proof. |
| Local AI, knowledge and voice | 80% | [`ChatView.tsx`](../apps/web/src/ChatView.tsx), [`KnowledgeView.tsx`](../apps/web/src/KnowledgeView.tsx), [`chat.py`](../server/src/rosevear_ai_hub/api/chat.py), tests; actual local Ollama and speech device acceptance outstanding. |
| Windows startup, backup and recovery | 80% | [`BackupRecoveryWorkbench.tsx`](../apps/web/src/BackupRecoveryWorkbench.tsx), [`HubUpdatePanel.tsx`](../apps/web/src/HubUpdatePanel.tsx), [`backup.py`](../server/src/rosevear_ai_hub/backup.py), tests; deployed Windows startup/recovery evidence required. |

### Not a suite-wide completion number

Do not average `N/A` with percentages or claim that these are the completion of Rosie Dazzlers, Yard Workers, Devil n Dove, iCamp or AI Data Platform. Each of those products needs its own feature inventory, tests, real deployment, and owner acceptance to produce a comparable suite-wide scorecard. The AI Hub source includes previews of some business records but does not replace their operational modules.

### Release and field evidence must be kept separate

- `main` GitHub checks GREEN means the repository passed the required source release pipeline for the named SHA.
- Actual installed Ree Windows Hub version, Tailscale/Caddy, device responses, camera video, MQTT hardware, Ollama inference, backups and private Comms relay are **not** certified by source checks.
- Old historical source/prelaunch worksheets are not automatically prerequisites for routine Hub use; actual risky operations still require fresh field acceptance and independent trust evidence.
