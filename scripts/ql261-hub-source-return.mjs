/** Build 187 / QL-261: exact owner worksheet receipt handling; no private trust upgrade. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "rosevear-ai-hub";
const RELEASE = "ql258-six-app-owner-custody-checklist-public-source-recheck-held-v1";
const SNAPSHOT = "99d64047c49678733af762ff906f288ec3ee0bb8";
const PATH = "docs/integration/ql246-source-proof.json";
const STEP_KEYS = ["privateCustodian", "independentWitness", "independentReviewer",
  "privateHost", "signerPresence", "outOfBandPin", "tenantIsolation"];
const PROGRESS = ["NOT_REPORTED", "OWNER_REPORTS_IN_PROGRESS", "OWNER_REPORTS_DONE_NOT_VERIFIED"];
const ROOT_KEYS = ["release", "system", "repository", "publicGitHubSnapshot",
  "ownerReportedUnverifiedProgress", "independentCustodyAuthenticated", "sourceProofAccepted",
  "ownerTestAuthorization", "authenticatedGatewayGets", "connection", "livePilotHolds", "disposition"];

function exact(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every(k => keys.includes(k));
}

export function inspectQl261OwnerPacket(raw) {
  if (typeof raw !== "string" || raw.length < 250 || raw.length > 8192)
    throw new Error("Expected only an original sanitized QL-258 status packet.");
  let p;
  try { p = JSON.parse(raw); } catch { throw new Error("QL-258 return JSON malformed."); }
  if (!exact(p, ROOT_KEYS) || p.release !== RELEASE || p.system !== SOURCE ||
    p.repository !== SOURCE || p.independentCustodyAuthenticated !== false ||
    p.sourceProofAccepted !== false || p.ownerTestAuthorization !== "NOT_GIVEN" ||
    p.authenticatedGatewayGets !== 0 || p.connection !== "DISCONNECTED" ||
    p.livePilotHolds !== 12 ||
    p.disposition !== "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD")
    throw new Error("QL-258 source identity or HOLD claims invalid.");
  const s = p.publicGitHubSnapshot;
  if (!exact(s, ["observed", "mainSha", "requiredPath", "httpStatusAtObservedSha"]) ||
    s.observed !== "29 October 2026" || s.mainSha !== SNAPSHOT ||
    s.requiredPath !== PATH || s.httpStatusAtObservedSha !== 404)
    throw new Error("Only the immutable historical QL-258 source snapshot is accepted.");
  const progress = p.ownerReportedUnverifiedProgress;
  if (!exact(progress, STEP_KEYS) || progress.tenantIsolation !== "NOT_APPLICABLE" ||
    STEP_KEYS.slice(0, -1).some(key => !PROGRESS.includes(progress[key])))
    throw new Error("Private details or unsupported owner progress labels rejected.");

  // Reconstruct every field from the allowlist: never echo unexpected JSON or arbitrary values.
  const safe = { release: RELEASE, system: SOURCE, repository: SOURCE,
    publicGitHubSnapshot: { observed: "29 October 2026", mainSha: SNAPSHOT,
      requiredPath: PATH, httpStatusAtObservedSha: 404 },
    ownerReportedUnverifiedProgress: Object.fromEntries(STEP_KEYS.map(k => [k, progress[k]])),
    independentCustodyAuthenticated: false, sourceProofAccepted: false,
    ownerTestAuthorization: "NOT_GIVEN", authenticatedGatewayGets: 0,
    connection: "DISCONNECTED", livePilotHolds: 12,
    disposition: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD" };
  return { kind: "rosevear_ql261_hub_source_return_v1", sanitized_ql258_owner_packet: safe,
    source_snapshot_class: "HISTORICAL_NOT_CURRENT_MAIN",
    owner_reported_done_not_verified: STEP_KEYS.filter(k => progress[k] === "OWNER_REPORTS_DONE_NOT_VERIFIED").length,
    real_signer_status: "SIGNER_STATUS_UNKNOWN", actual_private_custody: "NOT_VERIFIED",
    independently_pinned_public_spki: "NOT_VERIFIED",
    original_signed_source_proof_B: "NOT_AVAILABLE",
    original_gateway_receipts: "NOT_RUN", independently_witnessed_seven_denials: "NOT_VERIFIED",
    rollback_installation_receipt: "NOT_APPLICABLE_RELAY_NOT_INSTALLED",
    owner_test_authorization: "NOT_GIVEN", relay_installed_or_started: "NO",
    connection: "DISCONNECTED / HOLD",
    next_real_blocker: "AUTHENTICATE_PRIVATE_CUSTODIAN_SEPARATE_NONCE_WITNESS_AND_REVIEWER_BEFORE_SIGNER_DECISION" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--owner-packet");
  if (args.includes("--help")) process.stdout.write(
    "Offline QL-261 status-only return: --owner-packet <sanitized-QL258-JSON>. No keys, live host, gateway or owner TEST authority.\n");
  else if (i < 0) process.stdout.write(JSON.stringify({
    exact_ql258_owner_packet: "NOT_PROVIDED", real_signer_status: "SIGNER_STATUS_UNKNOWN",
    original_signed_source_proof_B: "NOT_AVAILABLE", relay_installed_or_started: "NO",
    owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD" }, null, 2) + "\n");
  else {
    try { process.stdout.write(JSON.stringify(inspectQl261OwnerPacket(
      readFileSync(args[i + 1], "utf8")), null, 2) + "\n"); }
    catch { process.stderr.write("QL-261 unsafe or missing owner packet rejected; no connection change.\n");
      process.exitCode = 1; }
  }
}
