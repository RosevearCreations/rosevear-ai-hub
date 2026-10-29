/** Build 185 / QL-257: local, nonsecret owner status review. No authority is conferred. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifyQl256WitnessEnvelope } from "./ql256-hub-witness-envelope.mjs";

export const APPLICATIONS = Object.freeze([
  "ai-data-platform", "devilndove", "rosiedazzlers", "yard-workers", "icamp", "rosevear-ai-hub",
]);
const ISOLATED_TENANTS = new Set(["yard-workers", "icamp"]);
const FIELDS = Object.freeze([
  "custodian_role", "witness_role", "reviewer_role", "key_host", "signer_status",
  "spki_pin", "tenant_isolation", "owner_test_authorization", "connection",
]);
const ROLE = ["ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED", "NOT_ASSIGNED"];
const SIGNER = ["SIGNER_NOT_PROVISIONED", "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED", "SIGNER_STATUS_UNKNOWN"];
const PIN = ["VERIFIED_OUT_OF_BAND", "NOT_VERIFIED"];

export function createQl257BlankCheckpoint() {
  return { schema_version: "rosevear.ql257.owner-status.v1",
    apps: Object.fromEntries(APPLICATIONS.map(app => [app, {
      custodian_role: "NOT_ASSIGNED", witness_role: "NOT_ASSIGNED", reviewer_role: "NOT_ASSIGNED",
      key_host: "NOT_APPROVED", signer_status: "SIGNER_STATUS_UNKNOWN", spki_pin: "NOT_VERIFIED",
      tenant_isolation: ISOLATED_TENANTS.has(app) ? "NOT_VERIFIED" : "NOT_APPLICABLE",
      owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD",
    }])) };
}

function exactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every(k => keys.includes(k));
}

export function reviewQl257OwnerCheckpoint(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 16_384)
    throw new Error("Missing or oversized nonsecret QL-257 checkpoint.");
  let packet;
  try { packet = JSON.parse(raw); } catch { throw new Error("Invalid QL-257 JSON."); }
  if (!exactKeys(packet, ["schema_version", "apps"]) ||
    packet.schema_version !== "rosevear.ql257.owner-status.v1" ||
    !exactKeys(packet.apps, APPLICATIONS))
    throw new Error("QL-257 requires exactly six named app status reports, no extra fields.");

  const reports = APPLICATIONS.map(app => {
    const entry = packet.apps[app];
    if (!exactKeys(entry, FIELDS) ||
      !ROLE.includes(entry.custodian_role) || !ROLE.includes(entry.witness_role) ||
      !ROLE.includes(entry.reviewer_role) || !["APPROVED", "NOT_APPROVED"].includes(entry.key_host) ||
      !SIGNER.includes(entry.signer_status) || !PIN.includes(entry.spki_pin) ||
      !["VERIFIED", "NOT_VERIFIED", "NOT_APPLICABLE"].includes(entry.tenant_isolation) ||
      (ISOLATED_TENANTS.has(app) ? entry.tenant_isolation === "NOT_APPLICABLE" : entry.tenant_isolation !== "NOT_APPLICABLE") ||
      entry.owner_test_authorization !== "NOT_GIVEN" || entry.connection !== "DISCONNECTED / HOLD")
      throw new Error(`QL-257 ${app}: invalid or prohibited status claim; no secrets, owner approvals or connections allowed.`);

    const blockers = [];
    if (entry.custodian_role !== ROLE[0]) blockers.push("AUTHENTICATE_PRIVATE_CUSTODIAN");
    if (entry.witness_role !== ROLE[0]) blockers.push("AUTHENTICATE_SEPARATE_WITNESS");
    if (entry.reviewer_role !== ROLE[0]) blockers.push("AUTHENTICATE_SEPARATE_REVIEWER");
    if (entry.key_host !== "APPROVED") blockers.push("APPROVE_RESTRICTED_PRIVATE_KEY_STORE");
    if (entry.signer_status === "SIGNER_STATUS_UNKNOWN") blockers.push("CHECK_REAL_SIGNER_PRIVATELY");
    if (entry.signer_status === "SIGNER_NOT_PROVISIONED") blockers.push("PROVISION_REAL_APP_SPECIFIC_SIGNER_PRIVATELY");
    if (entry.spki_pin !== "VERIFIED_OUT_OF_BAND") blockers.push("CHECK_PUBLIC_PIN_OUT_OF_BAND");
    if (ISOLATED_TENANTS.has(app) && entry.tenant_isolation !== "VERIFIED")
      blockers.push("INDEPENDENTLY_CHECK_NONPRODUCTION_TENANT_ISOLATION");
    // Even claimed complete roles cannot establish independent identity or original source proof.
    blockers.push("INDEPENDENT_REVIEW_OF_GENUINE_ORIGINAL_SIGNED_PROOF_AND_RECEIPTS");
    return { app, stated_signer_status: entry.signer_status, operator_stated_only: true,
      externally_authenticated_by_this_tool: false, blockers,
      owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD" };
  });
  return { schema_version: "rosevear.ql257.review.v1", checkpoint_class: "UNTRUSTED_NONSECRET_OWNER_STATUS_WORDS_ONLY",
    apps_received: reports.length, reports, genuine_signed_proof_B: "NOT_AVAILABLE",
    original_gateway_GET_and_seven_denials: "NOT_RUN", relay_installed_or_started: "NO",
    owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD",
    next_global_action: "PRIVATE_ROLE_AND_STORE_DECISIONS_THEN_INDEPENDENT_PUBLIC_PIN_AND_ORIGINAL_EVIDENCE_REVIEW" };
}

/** A cryptographic local match is not an independent witness identity/pin/custody check. */
export function reviewQl257PublicWitness(raw, options = {}) {
  try {
    const result = verifyQl256WitnessEnvelope(raw, options);
    return { challenge_status: "CURRENT_LOCAL_ED25519_MATCH_ONLY",
      witness_public_spki_sha256_candidate: result.witness_public_spki_sha256_candidate,
      independent_witness_origin: "NOT_VERIFIED", original_proof_B: "NOT_AVAILABLE",
      publish_proof_B: false, owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD" };
  } catch {
    // Never log potentially sensitive envelope contents or echo error input.
    return { challenge_status: "REJECTED_RENEW_WITH_FRESH_PRIVATE_CHALLENGE",
      independent_witness_origin: "NOT_VERIFIED", original_proof_B: "NOT_AVAILABLE",
      publish_proof_B: false, owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD" };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = name => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
  if (args.includes("--help")) {
    process.stdout.write("Offline nonsecret QL-257 review: --template OR --checkpoint <status-only-json> [--public-witness-envelope <PUBLIC-json>]. No network, signing, key store, owner authorization or relay.\n");
  } else if (args.includes("--template")) {
    process.stdout.write(JSON.stringify(createQl257BlankCheckpoint(), null, 2) + "\n");
  } else if (!args.includes("--checkpoint")) {
    process.stdout.write(JSON.stringify({ owner_status_checkpoint: "NOT_PROVIDED",
      real_private_custody: "NOT_VERIFIED", proof_B: "NOT_AVAILABLE",
      owner_test_authorization: "NOT_GIVEN", relay_installed_or_started: "NO",
      connection: "DISCONNECTED / HOLD" }, null, 2) + "\n");
  } else {
    try {
      const review = reviewQl257OwnerCheckpoint(readFileSync(option("--checkpoint"), "utf8"));
      const witness = args.includes("--public-witness-envelope") ?
        reviewQl257PublicWitness(readFileSync(option("--public-witness-envelope"), "utf8")) :
        { challenge_status: "NOT_PROVIDED_RENEWAL_NOT_AUTOMATIC" };
      process.stdout.write(JSON.stringify({ ...review, witness }, null, 2) + "\n");
    } catch {
      process.stderr.write("QL-257 checkpoint rejected: invalid nonsecret statuses or unreadable file. No connection change.\n");
      process.exitCode = 1;
    }
  }
}
