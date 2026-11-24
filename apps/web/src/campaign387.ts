/** Build387: fail-closed client model, never a signed physical acceptance certificate. */
export const CAMPAIGN_STEP_IDS387 = [
  "original-host-path",
  "bounded-household-discovery",
  "ha-mqtt-guest",
  "printer-pc-job",
  "camera-live-stream",
  "grocery-pantry-transaction",
  "safe-automation",
  "three-master-ack",
  "seven-application-intake",
  "encrypted-backup-restore",
  "prelogin-cross-device",
  "roles-privacy-security",
  "sixteen-theme-field",
  "incident-recovery-ledger",
] as const;

export type CampaignStepId387 = typeof CAMPAIGN_STEP_IDS387[number];
export type OwnerObservation387 =
  "not_checked" | "owner_reports_observed" | "owner_reports_issue" | "unavailable";

export type CampaignGate387 = {
  id: CampaignStepId387;
  title: string;
  section: string;
  operatorProcedure: string;
  requiredIndependentEvidence: string;
  sourceVerified: false;
  fieldStatus: "HOLD_INDEPENDENT_EVIDENCE_MISSING";
  ownerReportIsSignedEvidence: false;
  unsafeActuationAuthorized: false;
};

export type Campaign387 = {
  schema: "rosevear.hub.household-master-acceptance387.v1";
  sourceBuild: 387;
  status: "ORIGINAL_HOST_LOCAL_CONTEXT_ONLY_FIELD_HOLD" | "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT";
  originalHostNameMatched: boolean;
  runtimeSampleAvailable: boolean;
  runtimeSource: string;
  osBootLocallyReportedMs: number | null;
  apiProcessUptimeObservedSeconds: number | null;
  localLanInterfacesReportedUp: number | null;
  localResourceWarningCodes: string[];
  gateCount: 14;
  fieldCertifiedCount: 0;
  independentOriginalHostWitnessVerified: false;
  realHouseholdDeviceEndToEndVerified: false;
  realPrinterJobMonitored: false;
  realCameraStreamVerified: false;
  safeAutomationPhysicalExecutionVerified: false;
  sevenSourceReceiptClosureVerified: false;
  independentThreeMasterAckVerified: false;
  offMachineRestoreIndependentlyVerified: false;
  preLoginRemoteAccessIndependentlyVerified: false;
  otherMasterApplicationsModified: false;
  privateCommsReceiverActivationAuthorized: false;
  backgroundNetworkOrDeviceProbesPerformed: 0;
  windowsServicesRestarted: 0;
  externalRequestsPerformed: 0;
  productionGreenMayBeConcludedFromOwnerReports: false;
  sourceReleaseAndFieldAcceptanceIndependent: true;
  gates: CampaignGate387[];
};

const forbidden387 = [
  "independentOriginalHostWitnessVerified",
  "realHouseholdDeviceEndToEndVerified",
  "realPrinterJobMonitored",
  "realCameraStreamVerified",
  "safeAutomationPhysicalExecutionVerified",
  "sevenSourceReceiptClosureVerified",
  "independentThreeMasterAckVerified",
  "offMachineRestoreIndependentlyVerified",
  "preLoginRemoteAccessIndependentlyVerified",
  "otherMasterApplicationsModified",
  "privateCommsReceiverActivationAuthorized",
  "productionGreenMayBeConcludedFromOwnerReports",
] as const;

/** A surprising success, missing step, extra route, or peer claim is rejected outright. */
export function trustedCampaign387(raw: unknown): raw is Campaign387 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const x = raw as Record<string, unknown>;
  return x.schema === "rosevear.hub.household-master-acceptance387.v1" &&
    x.sourceBuild === 387 &&
    (x.status === "ORIGINAL_HOST_LOCAL_CONTEXT_ONLY_FIELD_HOLD" ||
      x.status === "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT") &&
    x.gateCount === CAMPAIGN_STEP_IDS387.length &&
    x.fieldCertifiedCount === 0 &&
    x.sourceReleaseAndFieldAcceptanceIndependent === true &&
    x.backgroundNetworkOrDeviceProbesPerformed === 0 &&
    x.windowsServicesRestarted === 0 &&
    x.externalRequestsPerformed === 0 &&
    forbidden387.every(key => x[key] === false) &&
    typeof x.originalHostNameMatched === "boolean" &&
    typeof x.runtimeSampleAvailable === "boolean" &&
    (x.apiProcessUptimeObservedSeconds === null ||
      typeof x.apiProcessUptimeObservedSeconds === "number") &&
    Array.isArray(x.localResourceWarningCodes) &&
    x.localResourceWarningCodes.length <= 10 &&
    Array.isArray(x.gates) && x.gates.length === CAMPAIGN_STEP_IDS387.length &&
    x.gates.every((g: Record<string, unknown>, i: number) =>
      g.id === CAMPAIGN_STEP_IDS387[i] &&
      typeof g.title === "string" && g.title.length >= 4 &&
      typeof g.section === "string" &&
      ["System", "Devices", "MQTT", "Workshop", "Cameras", "Groceries",
        "Automations", "Users"].includes(g.section) &&
      typeof g.operatorProcedure === "string" && g.operatorProcedure.length > 15 &&
      typeof g.requiredIndependentEvidence === "string" &&
      g.sourceVerified === false &&
      g.fieldStatus === "HOLD_INDEPENDENT_EVIDENCE_MISSING" &&
      g.ownerReportIsSignedEvidence === false &&
      g.unsafeActuationAuthorized === false);
}

export function emptyCampaignReports387(): Record<CampaignStepId387, OwnerObservation387> {
  return Object.fromEntries(CAMPAIGN_STEP_IDS387.map(id => [id, "not_checked"])) as
    Record<CampaignStepId387, OwnerObservation387>;
}

const ALLOWED387: readonly OwnerObservation387[] = [
  "not_checked", "owner_reports_observed", "owner_reports_issue", "unavailable",
];

export function updateCampaignReport387(
  state: Record<CampaignStepId387, OwnerObservation387>,
  id: CampaignStepId387,
  next: OwnerObservation387,
): Record<CampaignStepId387, OwnerObservation387> {
  if (!CAMPAIGN_STEP_IDS387.includes(id) || !ALLOWED387.includes(next)) {
    throw new Error("HOLD_INVALID_FIELD_REPORT");
  }
  return { ...state, [id]: next };
}

export function campaignDisposition387(
  state: Record<CampaignStepId387, OwnerObservation387>,
) {
  const values = CAMPAIGN_STEP_IDS387.map(id => state[id]);
  const reviewed = values.filter(value => value !== "not_checked").length;
  const issues = values.filter(value => value === "owner_reports_issue").length;
  const unavailable = values.filter(value => value === "unavailable").length;
  return {
    ownerReviewed: reviewed,
    ownerReportedIssues: issues,
    ownerReportedUnavailable: unavailable,
    independentFieldAccepted: 0,
    certificate: "HOLD_NO_INDEPENDENT_FIELD_WITNESS" as const,
    status: issues ? "OWNER_ISSUES_OPEN" :
      reviewed === CAMPAIGN_STEP_IDS387.length ? "OWNER_REPORTS_ONLY_FIELD_HOLD" :
        "FIELD_CAMPAIGN_INCOMPLETE_HOLD",
  };
}
