import { inspectMasterAcceptance309, type Acceptance309 } from "./masterShellAcceptance309";

type Rec = Record<string, unknown>;
const record = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance310 = Acceptance309 & {
  installedRelease309Expected: string;
  commsQl417AtReconciliation: string;
  aiDataBuild373AtReconciliation: string;
  originalHostAdoption: string;
  oneTestExportAudit: string;
  controllerReview: string;
};

export function inspectMasterAcceptance310(value: unknown): Acceptance310 | null {
  if (!record(value) ||
    value.schema !== "rosevear.ai-hub.master360-field-adoption310.v1" ||
    value.sourceBuild !== 310 ||
    value.installedRelease309Expected !== "0a94c72ee4a1ded1babeac68deeb981ad33835ef" ||
    value.commsQl417AtReconciliation !== "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6" ||
    value.aiDataBuild373AtReconciliation !== "2e5405519b5c96a7bbd803688a099eae300dde31" ||
    value.originalHostAdoption !== "HOLD_NO_INDEPENDENT_SIGNED_BUILD309_FIELD_REVIEW" ||
    value.oneTestExportAudit !== "HOLD_NO_AUTHENTICATED_PROTECTED_TRANSPORT_RECEIPT" ||
    value.controllerReview !== "HOLD_NO_SIGNED_AI_DATA_OWNER_DECISION" ||
    value.receiver !== "OFF" || value.connection !== "HOLD" ||
    value.masterSync !== "HOLD" || value.newWindowsScheduledTasks !== 0) return null;
  const old = { ...value,
    schema: "rosevear.ai-hub.master360-operational-acceptance309.v1", sourceBuild: 309 };
  return inspectMasterAcceptance309(old) ? value as Acceptance310 : null;
}
