/** Build 238: owner-entered, unverified UI review replies. Never an authenticated review or repair grant. */
import type { ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import type { Appearance236Draft, Appearance236Scope } from "./windowsAppearanceAcceptance236";
import { summarizeVisual237, visual237SourceKey, type Visual237Draft } from "./windowsVisualDisposition237";

export type Review238Outcome = "not_received" | "reply_received" | "more_evidence" | "declined";
export type Review238Entry = {
  outcome: Review238Outcome;
  reference: string;
  ownerAcknowledged: boolean;
  recordedAt: string;
  snapshotKey: string;
};
export type Review238Draft = Record<string, Review238Entry | undefined>;
export const defaultReview238Entry: Review238Entry = {
  outcome: "not_received", reference: "", ownerAcknowledged: false,
  recordedAt: "", snapshotKey: "",
};
export type Review238Gate = "request_not_ready" | "no_reply" | "reference_missing" |
  "reference_duplicate" | "owner_ack_missing" | "response_stale" |
  "reply_unverified" | "more_evidence_unverified" | "declined_unverified";
export const review238GateLabels: Record<Review238Gate, string> = {
  request_not_ready: "No current eligible Build 237 review request",
  no_reply: "Awaiting actual review response",
  reference_missing: "A safe response receipt code is required",
  reference_duplicate: "Receipt code duplicates existing case evidence",
  owner_ack_missing: "Owner must acknowledge personally recording this claim",
  response_stale: "Re-record after the latest unchanged Build 237 decision",
  reply_unverified: "Reply recorded by owner; outside identity NOT authenticated",
  more_evidence_unverified: "Additional evidence requested; source finding still open",
  declined_unverified: "Review declined (owner-entered); source finding still open",
};

type SourceRow = ReturnType<typeof summarizeVisual237>["rows"][number];

/** Links each owner-entered response to the exact Build 236 and 237 record. */
export function review238SnapshotKey(row: SourceRow, entry: Review238Entry): string {
  return JSON.stringify({
    id: row.id, source: visual237SourceKey(row.sourceRow),
    retest: row.entry.retestKey, retestAt: row.entry.retestAt,
    decision: row.entry.decisionKey, decisionAt: row.entry.decisionAt,
    area: row.entry.repairArea, outcome: entry.outcome,
    reference: entry.reference, ownerAcknowledged: entry.ownerAcknowledged,
  });
}

export function summarizeReview238(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, visualDraft: Visual237Draft,
  draft: Review238Draft) {
  const source = summarizeVisual237(theme, scope, sourceDraft, visualDraft);
  const priorRefs = source.rows.flatMap(row => [
    row.sourceEntry.reference, row.sourceEntry.followupReference,
    row.entry.retestReference, row.entry.decisionReference,
  ]).filter(Boolean);
  const replyRefs = source.rows.map(row => draft[row.id]?.reference || "").filter(Boolean);
  const usedRefs = [...priorRefs, ...replyRefs];
  const rows = source.rows.map(row => {
    const entry = draft[row.id] ?? defaultReview238Entry;
    const eligible = row.gate === "review_ready";
    const unique = entry.reference.length >= 4 &&
      safeWindowsFieldReference(entry.reference) === entry.reference &&
      usedRefs.filter(ref => ref === entry.reference).length === 1;
    const fresh = !!entry.recordedAt && Number.isFinite(Date.parse(entry.recordedAt)) &&
      Date.parse(entry.recordedAt) > Date.parse(row.entry.decisionAt) &&
      entry.snapshotKey === review238SnapshotKey(row, entry);
    let gate: Review238Gate;
    if (!eligible) gate = "request_not_ready";
    else if (entry.outcome === "not_received") gate = "no_reply";
    else if (entry.reference.length < 4 ||
      safeWindowsFieldReference(entry.reference) !== entry.reference) gate = "reference_missing";
    else if (!unique) gate = "reference_duplicate";
    else if (!entry.ownerAcknowledged) gate = "owner_ack_missing";
    else if (!fresh) gate = "response_stale";
    else gate = entry.outcome === "reply_received" ? "reply_unverified" :
      entry.outcome === "more_evidence" ? "more_evidence_unverified" : "declined_unverified";
    return { ...row, visualRow: row, entry, eligible, gate, unique, fresh };
  });
  return {
    rows, reviewRequests: rows.filter(row => row.eligible).length,
    ownerRecordedReplies: rows.filter(row => row.gate === "reply_unverified").length,
    evidenceRequests: rows.filter(row => row.gate === "more_evidence_unverified").length,
    declinedReports: rows.filter(row => row.gate === "declined_unverified").length,
    openFindings: source.openFindings,
    authenticatedOutsideReviews: 0 as const,
    independentWindowsAcceptance: 0 as const,
    repairsAuthorized: 0 as const, repairsExecuted: 0 as const,
    sixAppIntegration: "DISCONNECTED / HOLD" as const, privateRelay: "OFF" as const,
    ql275: "UNDER REVIEW" as const, vault: "SECURITY HOLD" as const,
  };
}

export function formatReview238Packet(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, visualDraft: Visual237Draft,
  draft: Review238Draft) {
  const summary = summarizeReview238(theme, scope, sourceDraft, visualDraft, draft);
  return [
    "Rosevear AI Hub — Build 238 owner UI review reply reconciliation",
    "OWNER-ENTERED, NOT AUTHENTICATED, SESSION ONLY — NO REPAIR OR INSTALL AUTHORIZATION",
    "Theme: " + theme + "; installed version: " + scope.installedVersion.replace(/[^A-Za-z0-9._+ -]/g, "").slice(0, 60),
    "Review requests: " + summary.reviewRequests + "; owner-recorded replies: " + summary.ownerRecordedReplies +
      "; more evidence: " + summary.evidenceRequests + "; declined: " + summary.declinedReports +
      "; original open findings: " + summary.openFindings,
    ...summary.rows.map(row => row.id + " | Build 237 gate " + row.visualRow.gate +
      " | area " + row.visualRow.entry.repairArea + " | decision " +
      (row.visualRow.entry.decisionReference || "MISSING") +
      " | response " + (row.entry.reference || "MISSING") +
      " | owner reported " + row.entry.outcome + " | " + row.gate +
      " | recorded " + (row.entry.recordedAt || "MISSING")),
    "Authenticated outside reviews 0; independent Windows acceptance 0; repairs authorized 0; repairs executed 0.",
    "Six apps DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD; authenticated gateway GETs 0.",
    "No provider calls, uploads, device control, OS changes, Windows installation or UI repairs were performed.",
    "Never include names, IPs, device IDs, credentials, URLs, images or logs.",
  ].join("\n");
}
