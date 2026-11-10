type ServiceId303 = "hub_api" | "hub_web" | "caddy_proxy";
type ServiceState303 = "NOT_OBSERVED" | "STALE" | "TCP_REACHABLE" | "TCP_UNREACHABLE";
const IDS: ServiceId303[] = ["hub_api", "hub_web", "caddy_proxy"];
const STATES: ServiceState303[] = ["NOT_OBSERVED", "STALE", "TCP_REACHABLE", "TCP_UNREACHABLE"];
const SHA = /^[a-f0-9]{40}$/;
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export type Uptime303 = {
  collectionState: "MONITORING_LOCAL" | "AWAITING_FIRST_SAMPLE" | "HOLD_NOT_ENABLED_OR_WRONG_HOST";
  sampleCount: number;
  lastSampleAtUtc: string | null;
  processSessionSeconds: number;
  services: { id: ServiceId303; state: ServiceState303; reachableSamples: number; sampleCount: number }[];
};

export function inspectMasterShellUptime303(value: unknown): Uptime303 | null {
  if (!record(value) || value.schema !== "rosevear.ai-hub.master-shell-local-uptime.v1" ||
    value.sourceId !== "rosevear-ai-hub" || value.sourceRole !== "SOURCE" ||
    value.expectedAutomationHost !== "DESKTOP-AE894KC" || value.connection !== "HOLD" ||
    value.authenticatedShellTransport !== "DISABLED" || value.automatedExternalActions !== 0 ||
    value.scope !== "LOCAL_LOOPBACK_AVAILABILITY_NOT_APPLICATION_HEALTH" ||
    !["MONITORING_LOCAL", "AWAITING_FIRST_SAMPLE", "HOLD_NOT_ENABLED_OR_WRONG_HOST"].includes(String(value.collectionState)) ||
    !Number.isSafeInteger(value.sampleCount) || Number(value.sampleCount) < 0 || Number(value.sampleCount) > 1440 ||
    !Number.isSafeInteger(value.processSessionSeconds) || Number(value.processSessionSeconds) < 0 ||
    !Array.isArray(value.services) || value.services.length !== 3) return null;
  const seen = new Set<string>();
  for (const service of value.services) {
    if (!record(service) || !IDS.includes(service.id as ServiceId303) || seen.has(String(service.id)) ||
      service.check !== "LOOPBACK_TCP_ONLY" ||
      !STATES.includes(service.state as ServiceState303) ||
      service.sampleCount !== value.sampleCount ||
      !Number.isSafeInteger(service.reachableSamples) || Number(service.reachableSamples) < 0 ||
      Number(service.reachableSamples) > Number(value.sampleCount)) return null;
    seen.add(String(service.id));
  }
  if (value.lastSampleAtUtc !== null &&
      (typeof value.lastSampleAtUtc !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value.lastSampleAtUtc))) return null;
  return value as unknown as Uptime303;
}

/** Status-only, no receipt identifiers, transport, or owner-acceptance claims. */
export function buildMasterShellHandoff303(input: {
  currentMainSha: string;
  uptime: Uptime303 | null;
  receiptCandidateState: string;
  caseIssueCodes: readonly string[];
  nowMs: number;
  acknowledged: boolean;
}) {
  if (!input.acknowledged || !SHA.test(input.currentMainSha) ||
      !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
      !Number.isFinite(new Date(input.nowMs).getTime()) ||
      input.caseIssueCodes.length > 25 ||
      !input.caseIssueCodes.every(code => /^[A-Z][A-Z0-9_]{2,60}$/.test(code))) return null;
  return {
    schema: "rosevear.ai-hub.master-shell-supervised-pilot.v1" as const,
    sourceId: "rosevear-ai-hub" as const,
    sourceRole: "SOURCE" as const,
    expectedAutomationHost: "DESKTOP-AE894KC" as const,
    sourceMainSha: input.currentMainSha,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    monitoring: {
      destination: "ai-data-platform" as const,
      observation: input.uptime?.collectionState ?? "NOT_OBSERVED",
      loopbackSampleCount: input.uptime?.sampleCount ?? 0,
      history: "PROCESS_LOCAL_NOT_DURABLE" as const,
      verifiedApplicationUptime: false as const,
      connection: "HOLD" as const,
    },
    incidentOperations: {
      destination: "rosevear-comms-hub" as const,
      issueCodes: [...new Set(input.caseIssueCodes)],
      route: "OFFLINE_OWNER_REVIEW_ONLY" as const,
      receiver: "OFF" as const,
      alertsSent: 0 as const,
      connection: "HOLD" as const,
    },
    oneReceiptPilot: {
      metadataCandidate: input.receiptCandidateState,
      originalSourceSignatureVerified: false as const,
      independentReviewerVerified: false as const,
      ownerConsentVerified: false as const,
      durableReplayClaimed: false as const,
      ownerSupervisedOneTestAuthorized: false as const,
      acceptedReceipts: 0 as const,
      state: "HOLD_ORIGINAL_PROTECTED_EVIDENCE_REQUIRED" as const,
    },
    externalAutomationActions: 0 as const,
    published: false as const,
    connection: "HOLD" as const,
  };
}
