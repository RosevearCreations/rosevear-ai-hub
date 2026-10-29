/** Build 186: import only the exact nonsecret QL-258 Comms Hub owner worksheet export. */
export const QL258_HUB_RELEASE = "ql258-six-app-owner-custody-checklist-public-source-recheck-held-v1";
export const QL258_HUB_SNAPSHOT = "99d64047c49678733af762ff906f288ec3ee0bb8";
export const QL258_HUB_PREVIOUS_MAIN = "8d6faa77d7a44f8f97cd51d0acd209fe00b2c32c";
export const QL258_HUB_STEPS = [
  ["privateCustodian", "Signing-key custodian"],
  ["independentWitness", "Different independent witness"],
  ["independentReviewer", "Separate reviewer"],
  ["privateHost", "Restricted persistent key store"],
  ["signerPresence", "Real signer status privately checked"],
  ["outOfBandPin", "Public SPKI pin independently verified"],
  ["tenantIsolation", "Nonproduction tenant isolation"],
] as const;
export type Ql258StepKey = (typeof QL258_HUB_STEPS)[number][0];
export type Ql258Progress = "NOT_REPORTED" | "OWNER_REPORTS_IN_PROGRESS" |
  "OWNER_REPORTS_DONE_NOT_VERIFIED" | "NOT_APPLICABLE";
export type Ql258HubReview = {
  kind: "rosevear_ai_hub_ql258_owner_progress_review";
  evidence_class: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE";
  source_handoff_release: typeof QL258_HUB_RELEASE;
  observed_public_snapshot_sha: typeof QL258_HUB_SNAPSHOT;
  snapshot_is_historical_not_current_main: true;
  steps: Record<Ql258StepKey, Ql258Progress>;
  reported_done_not_verified: number;
  independently_authenticated_roles_or_keys: false;
  original_signed_source_proof_B: "NOT_AVAILABLE";
  owner_test_authorization: "NOT_GIVEN";
  authenticated_gateway_GETs: 0;
  live_pilot_holds: 12;
  relay_installed_or_started: "NO";
  connection: "DISCONNECTED / HOLD";
};

function exactKeys(item: unknown, keys: readonly string[]): item is Record<string, unknown> {
  return item !== null && typeof item === "object" && !Array.isArray(item) &&
    Object.keys(item).length === keys.length && Object.keys(item).every(k => keys.includes(k));
}
const PROGRESS = ["NOT_REPORTED", "OWNER_REPORTS_IN_PROGRESS", "OWNER_REPORTS_DONE_NOT_VERIFIED"];
const PACKET_KEYS = ["release", "system", "repository", "publicGitHubSnapshot",
  "ownerReportedUnverifiedProgress", "independentCustodyAuthenticated", "sourceProofAccepted",
  "ownerTestAuthorization", "authenticatedGatewayGets", "connection", "livePilotHolds", "disposition"];

export function inspectQl258HubHandoff(raw: string): Ql258HubReview {
  if (typeof raw !== "string" || raw.length < 250 || raw.length > 8192)
    throw new Error("QL-258 handoff is missing or too large; paste only its sanitized JSON.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("QL-258 handoff must be valid status-only JSON."); }
  if (!exactKeys(parsed, PACKET_KEYS) || parsed.release !== QL258_HUB_RELEASE ||
    parsed.system !== "rosevear-ai-hub" || parsed.repository !== "rosevear-ai-hub" ||
    parsed.independentCustodyAuthenticated !== false || parsed.sourceProofAccepted !== false ||
    parsed.ownerTestAuthorization !== "NOT_GIVEN" || parsed.authenticatedGatewayGets !== 0 ||
    parsed.connection !== "DISCONNECTED" || parsed.livePilotHolds !== 12 ||
    parsed.disposition !== "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD")
    throw new Error("QL-258 handoff failed its fixed system, HOLD, or no-approval security contract.");
  const snapshot = parsed.publicGitHubSnapshot;
  if (!exactKeys(snapshot, ["observed", "mainSha", "requiredPath", "httpStatusAtObservedSha"]) ||
    snapshot.observed !== "29 October 2026" || snapshot.mainSha !== QL258_HUB_SNAPSHOT ||
    snapshot.requiredPath !== "docs/integration/ql246-source-proof.json" ||
    snapshot.httpStatusAtObservedSha !== 404)
    throw new Error("QL-258 handoff must retain its dated, immutable 404 source snapshot.");
  const report = parsed.ownerReportedUnverifiedProgress;
  const keys = QL258_HUB_STEPS.map(([key]) => key);
  if (!exactKeys(report, keys) || report.tenantIsolation !== "NOT_APPLICABLE" ||
    keys.some(key => key !== "tenantIsolation" && !PROGRESS.includes(report[key] as string)))
    throw new Error("QL-258 accepts seven fixed progress labels only; private data and tenant claims rejected.");
  const steps = Object.fromEntries(keys.map(key => [key, report[key]])) as Record<Ql258StepKey, Ql258Progress>;
  return { kind: "rosevear_ai_hub_ql258_owner_progress_review",
    evidence_class: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE",
    source_handoff_release: QL258_HUB_RELEASE,
    observed_public_snapshot_sha: QL258_HUB_SNAPSHOT,
    snapshot_is_historical_not_current_main: true,
    steps, reported_done_not_verified: keys.filter(key => steps[key] === "OWNER_REPORTS_DONE_NOT_VERIFIED").length,
    independently_authenticated_roles_or_keys: false, original_signed_source_proof_B: "NOT_AVAILABLE",
    owner_test_authorization: "NOT_GIVEN", authenticated_gateway_GETs: 0,
    live_pilot_holds: 12, relay_installed_or_started: "NO", connection: "DISCONNECTED / HOLD" };
}
