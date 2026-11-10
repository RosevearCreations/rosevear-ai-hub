import { EVIDENCE_REGISTRY_GATES_295, type CustodyNote295, type HandoffDryRun295 } from "./windowsCustodyHandoff295";

/** Build 296 is local, read-only evidence *planning*. No source registry is connected. */
export const FIELD_RECEIPT_CHECKLIST_296 = EVIDENCE_REGISTRY_GATES_295.map(gate => ({
  id: gate.id,
  authority: gate.authority,
  requiredEvidence: gate.requiredEvidence,
  state: "INDEPENDENT_PROOF_NOT_RECEIVED" as const,
}));
export type ExceptionCode296 =
  | "NO_OWNER_CUSTODY_NOTE" | "STALE_OWNER_CUSTODY_NOTE"
  | "NO_OPERATOR_HANDOFF_DRY_RUN" | "UNVERIFIED_ORIGINAL_EVIDENCE";
export type Exception296 = Readonly<{
  recordedAtUtc: string;
  sourceSha: string;
  code: ExceptionCode296;
  state: "OPEN_OWNER_REVIEW_HOLD";
  provenance: "BROWSER_SESSION_METADATA_ONLY";
  independentVerificationCount: 0;
  fieldReceiptAccepted: false;
  shellAuthorized: false;
}>;
export type ChecklistReview296 = Readonly<{
  reviewedAtUtc: string;
  sourceSha: string;
  ownerDecision: "APPROVE_CHECKLIST_FOR_FIELD_REVIEW_ONLY";
  source: "LOCAL_OWNER_ACKNOWLEDGEMENT_ONLY";
  gateStates: readonly {
    id: string;
    state: "INDEPENDENT_PROOF_NOT_RECEIVED";
  }[];
  verifiedGateCount: 0;
  signedOwnerConsentVerified: false;
  originalHostAccepted: false;
  receiptAccepted: false;
  shellAuthorized: false;
}>;

const SHA40 = /^[0-9a-f]{40}$/;
function validDate(value: string, nowMs: number) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= nowMs + 60_000;
}
export function validCustody296(note: CustodyNote295 | null, sha: string, nowMs: number): boolean {
  return !!note && note.source === "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY" &&
    note.authority === "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY" &&
    note.linkage === "SOURCE_AND_TIME_CORRELATION_ONLY" &&
    note.sourceSha === sha && /^[0-9a-f]{64}$/.test(note.unsignedDigest) &&
    note.physicalHostAccepted === false &&
    note.cryptographicReceiptVerified === false &&
    note.masterShellPublisherAuthorized === false &&
    note.verifiedRegistryRecords === 0 && note.independentlyVerifiedGates === 0 &&
    validDate(note.reviewedAtUtc, nowMs);
}
function validDryRun(run: HandoffDryRun295, sha: string, nowMs: number) {
  return run.source === "OWNER_CUSTODY_METADATA_UNVERIFIED" &&
    run.sourceSha === sha &&
    run.decision === "BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE" &&
    run.missingIndependentAuthorities === 7 &&
    run.registryConnected === false && run.transport === "DISABLED" &&
    run.messagesSent === 0 && run.verifiedReceipts === 0 &&
    run.masterShellAuthorized === false && validDate(run.simulatedAtUtc, nowMs);
}
export function deriveCustodyExceptions296(input: {
  notes: readonly CustodyNote295[];
  dryRuns: readonly HandoffDryRun295[];
  expectedMainSha: string;
  nowMs: number;
}): readonly ExceptionCode296[] {
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!SHA40.test(sha) || !Number.isSafeInteger(input.nowMs) || input.nowMs < 0)
    return ["NO_OWNER_CUSTODY_NOTE", "UNVERIFIED_ORIGINAL_EVIDENCE"];
  const latest = [...input.notes.slice(-10)].reverse().find(n => validCustody296(n, sha, input.nowMs));
  const issues: ExceptionCode296[] = [];
  if (!latest) issues.push("NO_OWNER_CUSTODY_NOTE");
  else if (input.nowMs - Date.parse(latest.reviewedAtUtc) > 30 * 60_000)
    issues.push("STALE_OWNER_CUSTODY_NOTE");
  if (!input.dryRuns.slice(-10).some(r => validDryRun(r, sha, input.nowMs)))
    issues.push("NO_OPERATOR_HANDOFF_DRY_RUN");
  // No amount of locally claimed corroboration can clear this last exception.
  issues.push("UNVERIFIED_ORIGINAL_EVIDENCE");
  return issues;
}

export function recordCustodyException296(input: {
  notes: readonly CustodyNote295[];
  dryRuns: readonly HandoffDryRun295[];
  expectedMainSha: string;
  code: ExceptionCode296;
  acknowledged: boolean;
  nowMs: number;
}): Exception296 | null {
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!input.acknowledged || !SHA40.test(sha) ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0) return null;
  if (!deriveCustodyExceptions296(input).includes(input.code)) return null;
  return {
    recordedAtUtc: new Date(input.nowMs).toISOString(), sourceSha: sha,
    code: input.code, state: "OPEN_OWNER_REVIEW_HOLD",
    provenance: "BROWSER_SESSION_METADATA_ONLY",
    independentVerificationCount: 0, fieldReceiptAccepted: false, shellAuthorized: false,
  };
}
export function recordOwnerChecklist296(input: {
  note: CustodyNote295 | null;
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}): ChecklistReview296 | null {
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!input.acknowledged || !SHA40.test(sha) ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
    !validCustody296(input.note, sha, input.nowMs)) return null;
  return {
    reviewedAtUtc: new Date(input.nowMs).toISOString(), sourceSha: sha,
    ownerDecision: "APPROVE_CHECKLIST_FOR_FIELD_REVIEW_ONLY",
    source: "LOCAL_OWNER_ACKNOWLEDGEMENT_ONLY",
    gateStates: FIELD_RECEIPT_CHECKLIST_296.map(g => ({
      id: g.id, state: "INDEPENDENT_PROOF_NOT_RECEIVED" as const,
    })),
    verifiedGateCount: 0, signedOwnerConsentVerified: false,
    originalHostAccepted: false, receiptAccepted: false, shellAuthorized: false,
  };
}

/** A shell-format *projection*, not a registered source, read model, or live receiver. */
export function projectShellEvidenceReadiness296(input: {
  notes: readonly CustodyNote295[];
  dryRuns: readonly HandoffDryRun295[];
  checklists: readonly ChecklistReview296[];
  exceptions: readonly Exception296[];
  expectedMainSha: string;
  nowMs: number;
}) {
  const sha = input.expectedMainSha.trim().toLowerCase();
  const custody = input.notes.some(n => validCustody296(n, sha, input.nowMs));
  const checklist = input.checklists.some(c =>
    c.sourceSha === sha && c.ownerDecision === "APPROVE_CHECKLIST_FOR_FIELD_REVIEW_ONLY" &&
    c.verifiedGateCount === 0 && c.receiptAccepted === false &&
    c.shellAuthorized === false && c.originalHostAccepted === false &&
    c.signedOwnerConsentVerified === false &&
    c.gateStates.length === 7 && c.gateStates.every(g =>
      g.state === "INDEPENDENT_PROOF_NOT_RECEIVED") &&
    validDate(c.reviewedAtUtc, input.nowMs));
  const dryRun = input.dryRuns.some(r => validDryRun(r, sha, input.nowMs));
  const issueCodes = deriveCustodyExceptions296(input);
  return {
    schema: "rosevear.ai-hub.shell-evidence-readiness-preview.v1" as const,
    source: "BROWSER_SESSION_READ_ONLY_PREVIEW" as const,
    sourceSha: SHA40.test(sha) ? sha : null,
    reviewMetadataState: custody && checklist ? "REVIEW_CHECKLIST_PREPARED_HOLD" as const
      : "REVIEW_METADATA_INCOMPLETE_HOLD" as const,
    custodyNotePresent: custody, checklistOwnerReviewed: checklist,
    dryRunObserved: dryRun, activeExceptionCodes: issueCodes,
    recordedExceptionCount: input.exceptions.filter(e =>
      e.sourceSha === sha && e.state === "OPEN_OWNER_REVIEW_HOLD" &&
      e.independentVerificationCount === 0 && e.shellAuthorized === false &&
      e.fieldReceiptAccepted === false && validDate(e.recordedAtUtc, input.nowMs)).length,
    destinations: ["AI_DATA_PLATFORM_READ_ONLY_REVIEW", "COMMS_HUB_OPERATOR_REVIEW"] as const,
    sourceRegistryConnection: "NOT_CONNECTED" as const,
    shellIntegration: "READ_ONLY_DESIGN_PREVIEW_NOT_PUBLISHED" as const,
    verifiedEvidenceCount: 0 as const,
    acceptedReceipts: 0 as const,
    messagesSent: 0 as const,
    productionAuthorized: false as const,
  };
}
export function exportCustodyExceptions296(exceptions: readonly Exception296[],
  checklists: readonly ChecklistReview296[]) {
  return {
    schema: "rosevear.ai-hub.owner-exceptions-checklist.v1" as const,
    source: "PRIVATE_BROWSER_SESSION_OWNER_NOTES_ONLY" as const,
    independentVerifiedEvidence: 0 as const,
    actualSignedReceipts: 0 as const,
    shellAuthorization: "HOLD_UNVERIFIED" as const,
    exceptions: exceptions.slice(-20),
    checklists: checklists.slice(-10),
  };
}
