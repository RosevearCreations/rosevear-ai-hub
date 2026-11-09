/**
 * Build 283 owner-review draft. This is NOT the shared Master Shell contract,
 * a deployed-state feed, a signed receipt, or a claim of tenant connectivity.
 * Figures are the source-review estimates documented in Build 281.
 */
export type HubModuleEstimate = Readonly<{
  id: string;
  label: string;
  percent: number | null;
  evidence: string;
  outstanding: string;
}>;

export const hubModuleEstimates: readonly HubModuleEstimate[] = [
  { id: "customer-mobile", label: "Customer experience · mobile", percent: null, evidence: "Owner-only Hub product scope", outstanding: "Owned by the business applications" },
  { id: "customer-desktop", label: "Customer experience · desktop", percent: null, evidence: "Owner-only Hub product scope", outstanding: "Owned by the business applications" },
  { id: "customer-tablet", label: "Customer experience · tablet", percent: null, evidence: "Owner-only Hub product scope", outstanding: "Owned by the business applications" },
  { id: "worker-mobile", label: "Worker experience · mobile", percent: null, evidence: "Hub is not a field-worker portal", outstanding: "Owned by the business applications" },
  { id: "worker-desktop", label: "Worker experience · desktop", percent: null, evidence: "Hub is not a field-worker portal", outstanding: "Owned by the business applications" },
  { id: "worker-tablet", label: "Worker experience · tablet", percent: null, evidence: "Hub is not a field-worker portal", outstanding: "Owned by the business applications" },
  { id: "admin-desktop", label: "Owner/admin · desktop", percent: 80, evidence: "apps/web/src/App.tsx; AuthView.tsx", outstanding: "Independent Ree Windows owner acceptance" },
  { id: "admin-mobile", label: "Owner/admin · mobile", percent: 60, evidence: "apps/web/src/PwaInstallPanel.tsx", outstanding: "Independent phone workflow acceptance" },
  { id: "admin-tablet", label: "Owner/admin · tablet", percent: 60, evidence: "apps/web/src/App.tsx responsive shell", outstanding: "Independent tablet workflow acceptance" },
  { id: "projects", label: "Project tracking", percent: 80, evidence: "apps/web/src/WorkshopJobsPanel.tsx", outstanding: "Real workshop field acceptance" },
  { id: "job-preparation", label: "Job preparation and tracking", percent: 80, evidence: "server/src/rosevear_ai_hub/api/workshop_jobs.py", outstanding: "Actual job execution and sign-off" },
  { id: "supplies", label: "Supplies and consumables", percent: 60, evidence: "apps/web/src/WorkshopJobsPanel.tsx", outstanding: "Purchasing and audited inventory movement" },
  { id: "tools", label: "Tools and equipment", percent: 80, evidence: "apps/web/src/ToolsView.tsx", outstanding: "Physical device and tool inventory audit" },
  { id: "business-inventory", label: "Business inventory", percent: null, evidence: "Source-app ownership boundary", outstanding: "Business applications report own stock" },
  { id: "products", label: "End products and catalogue", percent: null, evidence: "Source-app ownership boundary", outstanding: "Devil n Dove and other source apps own products" },
  { id: "financials", label: "Job finances, payroll, invoicing, accounting and tax", percent: null, evidence: "Hub has no accounting ledger", outstanding: "Business applications own financial operations" },
  { id: "storefront", label: "Storefront, advertising and social", percent: null, evidence: "Hub has no public storefront", outstanding: "Business applications own customer marketing" },
  { id: "six-app", label: "Rosevear application integration", percent: 60, evidence: "apps/web/src/IntegrationHealthPanel.tsx; server/src/rosevear_ai_hub/api/integration_v1.py", outstanding: "Fresh authenticated and independently witnessed connection evidence" },
  { id: "it-dashboard", label: "I.T. integration and release dashboard", percent: 60, evidence: "apps/web/src/ReleaseObservabilityPanel.tsx", outstanding: "Verified live estate monitoring; telemetry ingestion contract" },
  { id: "security", label: "Security, roles and audit", percent: 80, evidence: "server/src/rosevear_ai_hub/auth.py; audit.py", outstanding: "Owner acceptance and external-trust review" },
  { id: "notifications", label: "Notifications and follow-up", percent: 80, evidence: "apps/web/src/HomeActivitySummary.tsx; OwnerFollowUpInsights.tsx", outstanding: "External notification delivery and true server acknowledgment" },
  { id: "cameras", label: "Cameras and video", percent: 80, evidence: "apps/web/src/CameraView.tsx", outstanding: "Real cameras and provider acceptance" },
  { id: "devices", label: "Home Assistant and MQTT devices", percent: 80, evidence: "apps/web/src/HomeAssistantView.tsx; MQTTView.tsx", outstanding: "Connected equipment and message verification" },
  { id: "x10", label: "Legacy X10 bridge", percent: 40, evidence: "apps/web/src/X10BridgeFeasibility.tsx", outstanding: "Functional legacy hardware proof" },
  { id: "local-ai", label: "Local AI, knowledge and voice", percent: 80, evidence: "apps/web/src/ChatView.tsx; KnowledgeView.tsx", outstanding: "Ollama and audio hardware acceptance" },
  { id: "windows-recovery", label: "Windows startup, backup and recovery", percent: 80, evidence: "apps/web/src/BackupRecoveryWorkbench.tsx", outstanding: "Installed Windows backup and restore acceptance" },
];

export const masterShellRoutingAssessment = [
  { flow: "AI Hub → AI Data Platform", state: "CONTRACT_PENDING", detail: "Proposal: evidence-linked module and health reporting; receiving schema, cadence, signing and identity not yet ratified." },
  { flow: "AI Hub ↔ Rosevear Comms Hub", state: "EXISTING_SOURCE_CONTRACT", detail: "Existing QL-365D public manifest and protected source handler must be reused; no new grant or private GET is implied." },
  { flow: "Direct one-to-one", state: "POLICY_PENDING", detail: "Existing scoped local integrations are separate from new cross-app sharing approval." },
  { flow: "One-to-many / many-to-one / many-to-many", state: "POLICY_PENDING", detail: "Publisher, audience, per-tenant access, delivery guarantees and revocation require shared contract approval." },
] as const;

export const masterShellOpenDecisions = [
  "Shared application identity and signed report envelope ownership",
  "Versioned module taxonomy, N/A treatment and completion evidence weighting",
  "Reporting cadence, freshness/expiry, acknowledgments and replay controls",
  "Tenant boundaries, least-privilege recipient policy and per-flow consent",
  "Release CI evidence versus actual deployed Windows/device evidence",
  "Incident ownership split between AI Data Platform and Comms Hub",
] as const;

export function buildMasterShellCandidateReport() {
  return {
    schema: "rosevear.ai-hub.master-shell-candidate.v0",
    status: "OWNER_REVIEW_ONLY_NOT_SENT",
    appId: "rosevear-ai-hub",
    repository: "RosevearCreations/rosevear-ai-hub",
    shellRole: "local_support",
    tenantBoundary: "no_customer_tenant",
    estimateSource: "docs/BUILD_281_OWNER_FOLLOW_UP_QUEUE_AND_MODULE_BASELINE.md",
    completionMethod: "Five source-review milestones, 20 points each; field acceptance pending",
    verifiedDeployedCompletion: null,
    sections: hubModuleEstimates.map(({ id, label, percent, evidence, outstanding }) => ({
      id, label, estimatedPercent: percent, evidence, outstanding,
      evidenceState: percent === null ? "NOT_APPLICABLE" : "SOURCE_REVIEW_NOT_FIELD_VERIFIED",
    })),
    transport: "NO_REPORT_PUBLISHER_OR_RECEIVER_ACTIVATED",
  } as const;
}
