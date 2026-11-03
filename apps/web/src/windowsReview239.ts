/** Build 239: exact-source owner review provenance and conditional repair REVIEW gate.
 * Owner statements are not authenticated external evidence or a repair grant.
 */
import type { ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";
import type { Appearance236Draft, Appearance236Scope } from "./windowsAppearanceAcceptance236";
import type { Visual237Draft, Visual237RepairArea } from "./windowsVisualDisposition237";
import { summarizeReview238, type Review238Draft } from "./windowsReview238";

export type Provenance239Source = "not_recorded" | "private_correspondence" |
  "local_review_record" | "supervised_conversation";
export type Decision239Choice = "pending" | "defer" | "request_retest" |
  "request_independent_proof" | "request_repair_authorization_review";
export type Review239Entry = {
  source: Provenance239Source;
  sourceReference: string;
  sourceAcknowledged: boolean;
  provenanceAt: string;
  provenanceKey: string;
  decision: Decision239Choice;
  repairArea: Visual237RepairArea;
  rollbackReference: string;
  decisionReference: string;
  decisionAcknowledged: boolean;
  decisionAt: string;
  decisionKey: string;
};
export type Review239Draft = Record<string, Review239Entry | undefined>;
export const defaultReview239Entry: Review239Entry = {
  source: "not_recorded", sourceReference: "", sourceAcknowledged: false,
  provenanceAt: "", provenanceKey: "", decision: "pending", repairArea: "unselected",
  rollbackReference: "", decisionReference: "", decisionAcknowledged: false,
  decisionAt: "", decisionKey: "",
};
export type Review239Gate = "response_not_eligible" | "source_not_recorded" |
  "source_reference_gap" | "source_duplicate" | "source_witness_gap" |
  "source_stale" | "decision_pending" | "decision_scope_gap" |
  "rollback_gap" | "rollback_duplicate" | "decision_reference_gap" |
  "decision_duplicate" | "decision_witness_gap" | "decision_stale" |
  "owner_deferred" | "owner_retest_requested" | "independent_proof_requested" |
  "authorization_review_ready";
export const review239GateLabels: Record<Review239Gate, string> = {
  response_not_eligible: "Current Build 238 reply is missing or stale",
  source_not_recorded: "No actual owner-observed response source recorded",
  source_reference_gap: "Distinct provenance evidence code required",
  source_duplicate: "Provenance code already used for this evidence chain",
  source_witness_gap: "Owner source-observation acknowledgment required",
  source_stale: "Source provenance no longer matches the exact review reply",
  decision_pending: "Source recorded; select the next owner decision",
  decision_scope_gap: "Repair review scope must match the original visual symptom",
  rollback_gap: "Distinct safe rollback-plan reference required",
  rollback_duplicate: "Rollback reference must be unique in this evidence chain",
  decision_reference_gap: "Distinct owner decision evidence code required",
  decision_duplicate: "Owner decision evidence code already used",
  decision_witness_gap: "Separate owner acknowledgment is required",
  decision_stale: "Re-record decision after the current provenance record",
  owner_deferred: "Owner deferred; original finding stays open",
  owner_retest_requested: "Fresh owner retest requested; original finding open",
  independent_proof_requested: "Independent evidence requested; not authenticated",
  authorization_review_ready: "Conditional UI repair review REQUEST ready; NOT authorized",
};
type ResponseRow = ReturnType<typeof summarizeReview238>["rows"][number];
const canReview = (row: ResponseRow) => row.gate === "reply_unverified";
const validCode = (value: string) => value.length >= 4 &&
  safeWindowsFieldReference(value) === value;
const safeCode = (value: string) => safeWindowsFieldReference(value) || "MISSING";

/** Bind an owner report to the exact unchanged Build 236→238 evidence chain. */
export function provenance239Key(row: ResponseRow, entry: Review239Entry): string {
  return JSON.stringify({
    id: row.id, sourceReceipt: row.sourceEntry.reference,
    visualDecision: row.visualRow.entry.decisionKey,
    responseSnapshot: row.entry.snapshotKey, responseAt: row.entry.recordedAt,
    source: entry.source, ref: entry.sourceReference,
    ownerAcknowledged: entry.sourceAcknowledged,
  });
}
export function decision239Key(entry: Review239Entry): string {
  return JSON.stringify({
    provenanceKey: entry.provenanceKey, provenanceAt: entry.provenanceAt,
    decision: entry.decision, repairArea: entry.repairArea,
    rollback: entry.rollbackReference, reference: entry.decisionReference,
    ownerAcknowledged: entry.decisionAcknowledged,
  });
}
export function summarizeReview239(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, visualDraft: Visual237Draft,
  reviewDraft: Review238Draft, draft: Review239Draft) {
  const source = summarizeReview238(theme, scope, sourceDraft, visualDraft, reviewDraft);
  // A later rollback or owner decision may duplicate an existing provenance
  // code. Report the defect at that later gate, without making an earlier
  // source-of-evidence receipt appear retroactively invalid.
  const priorRefs = source.rows.flatMap(row => [
    row.sourceEntry.reference, row.sourceEntry.followupReference,
    row.visualRow.entry.retestReference, row.visualRow.entry.decisionReference,
    row.entry.reference,
  ]).filter(Boolean);
  const sourceRefs = [
    ...priorRefs, ...source.rows.map(row => draft[row.id]?.sourceReference).filter(Boolean),
  ];
  const refs = [
    ...sourceRefs,
    ...source.rows.flatMap(row => [
      draft[row.id]?.rollbackReference, draft[row.id]?.decisionReference,
    ]).filter(Boolean),
  ];
  const sourceCount = (value: string) => sourceRefs.filter(ref => ref === value).length;
  const count = (value: string) => refs.filter(ref => ref === value).length;
  const rows = source.rows.map(row => {
    const entry = draft[row.id] ?? defaultReview239Entry;
    const eligible = canReview(row);
    const sourceFresh = eligible && !!entry.provenanceAt &&
      Number.isFinite(Date.parse(entry.provenanceAt)) &&
      Date.parse(entry.provenanceAt) > Date.parse(row.entry.recordedAt) &&
      entry.provenanceKey === provenance239Key(row, entry);
    const decisionFresh = sourceFresh && !!entry.decisionAt &&
      Number.isFinite(Date.parse(entry.decisionAt)) &&
      Date.parse(entry.decisionAt) > Date.parse(entry.provenanceAt) &&
      entry.decisionKey === decision239Key(entry);
    const scopeMatches = entry.repairArea === row.visualRow.entry.repairArea &&
      entry.repairArea !== "unselected";
    let gate: Review239Gate;
    if (!eligible) gate = "response_not_eligible";
    else if (entry.source === "not_recorded") gate = "source_not_recorded";
    else if (!validCode(entry.sourceReference)) gate = "source_reference_gap";
    else if (sourceCount(entry.sourceReference) !== 1) gate = "source_duplicate";
    else if (!entry.sourceAcknowledged) gate = "source_witness_gap";
    else if (!sourceFresh) gate = "source_stale";
    else if (entry.decision === "pending") gate = "decision_pending";
    else if (entry.decision === "request_repair_authorization_review" && !scopeMatches)
      gate = "decision_scope_gap";
    else if (entry.decision === "request_repair_authorization_review" &&
      !validCode(entry.rollbackReference)) gate = "rollback_gap";
    else if (entry.decision === "request_repair_authorization_review" &&
      count(entry.rollbackReference) !== 1) gate = "rollback_duplicate";
    else if (!validCode(entry.decisionReference)) gate = "decision_reference_gap";
    else if (count(entry.decisionReference) !== 1) gate = "decision_duplicate";
    else if (!entry.decisionAcknowledged) gate = "decision_witness_gap";
    else if (!decisionFresh) gate = "decision_stale";
    else gate = entry.decision === "defer" ? "owner_deferred" :
      entry.decision === "request_retest" ? "owner_retest_requested" :
      entry.decision === "request_independent_proof" ? "independent_proof_requested" :
      "authorization_review_ready";
    return { ...row, responseRow: row, entry, eligible, sourceFresh, decisionFresh, gate };
  });
  return {
    rows, responseCandidates: rows.filter(row => row.eligible).length,
    ownerProvenanceRecorded: rows.filter(row => row.sourceFresh).length,
    independentProofRequests: rows.filter(row => row.gate === "independent_proof_requested").length,
    conditionalReviewRequests: rows.filter(row => row.gate === "authorization_review_ready").length,
    openFindings: source.openFindings,
    authenticatedOutsideReviews: 0 as const, independentWindowsAcceptance: 0 as const,
    repairsAuthorized: 0 as const, repairsExecuted: 0 as const, installations: 0 as const,
    privateRelay: "OFF" as const, sixAppIntegration: "DISCONNECTED / HOLD" as const,
    ql275: "UNDER REVIEW" as const, vault: "SECURITY HOLD" as const,
  };
}
export function formatReview239Packet(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, visualDraft: Visual237Draft,
  reviewDraft: Review238Draft, draft: Review239Draft) {
  const summary = summarizeReview239(theme, scope, sourceDraft, visualDraft, reviewDraft, draft);
  return [
    "Rosevear AI Hub — Build 239 owner UI review provenance / decision packet",
    "OWNER-ENTERED, NO EXTERNAL AUTHENTICATION — NO REPAIR AUTHORIZATION OR INSTALLATION",
    "Theme: " + theme + "; owner-entered installed version: " +
      (safeWindowsInstalledVersion(scope.installedVersion) || "MISSING"),
    "Candidate replies: " + summary.responseCandidates +
      "; owner source reports: " + summary.ownerProvenanceRecorded +
      "; independent proof requests: " + summary.independentProofRequests +
      "; conditional repair REVIEW requests: " + summary.conditionalReviewRequests,
    ...summary.rows.map(row => row.id +
      " | original " + safeCode(row.sourceEntry.reference) +
      " | review-request " + safeCode(row.visualRow.entry.decisionReference) +
      " | reply " + safeCode(row.responseRow.entry.reference) +
      " | source " + row.entry.source + " " + safeCode(row.entry.sourceReference) +
      " | source recorded " + (row.entry.provenanceAt || "MISSING") +
      " | decision " + row.entry.decision +
      " | UI-only scope " + row.entry.repairArea +
      " | rollback " + safeCode(row.entry.rollbackReference) +
      " | decision code " + safeCode(row.entry.decisionReference) +
      " | decision recorded " + (row.entry.decisionAt || "MISSING") +
      " | gate " + row.gate),
    "Original findings open: " + summary.openFindings +
      "; authenticated outside reviews 0; independent Windows acceptance 0.",
    "Repairs authorized 0; repairs executed 0; installations 0.",
    "Six apps DISCONNECTED / HOLD; relay OFF; QL-275 Under Review; vault SECURITY HOLD; gateway GETs 0.",
    "No provider messaging, external validation, network calls, devices, OS restarts, Windows installation or UI repair.",
    "Do not include names, addresses, URLs, IPs, IDs, screenshots, raw logs or credentials.",
  ].join("\n");
}
