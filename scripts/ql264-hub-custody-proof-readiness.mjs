/** Build 191 / QL-264. Offline, public-status-only gate; never authenticates private humans.
 * The only opt-in network operation is the existing exact-SHA PUBLIC GitHub proof check.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "RosevearCreations/rosevear-ai-hub";
const SHA = /^[a-f0-9]{40}$/;
const HEX = /^[a-f0-9]{64}$/;
const OPAQUE = /^np-[A-Za-z0-9_-]{8,80}$/;
const FIELDS = ["schema_version", "repository", "source_system", "audited_source_sha_A",
  "role_receipts", "signer_status", "signer_pin_status", "restricted_store_status",
  "custodian_status", "witness_status", "reviewer_status", "nonproduction_isolation",
  "issued_at", "expires_at", "owner_test_authorization", "gateway_get_status",
  "windows_relay"];
const ROLES = ["custodian", "witness", "reviewer"];
const CLAIM = ["NOT_VERIFIED", "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND", "REJECTED"];
const SIGNALS = Object.freeze([
  "missing_authentication", "invalid_credential", "expired_credential",
  "wrong_nonproduction_tenant", "wrong_application_audience", "replayed_nonce",
  "mismatched_independent_pin"
]);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const exact = (obj, keys) => !!obj && typeof obj === "object" && !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length && keys.every((key, i) => Object.keys(obj)[i] === key);

/** A public status return describes claims only; original private receipts stay with reviewer. */
export function reconcileQl264PublicDecision(raw, { sourceA, expectedRawSha256, nowMs = Date.now() } = {}) {
  if (raw === undefined) return Object.freeze({
    original_public_decision: "NOT_PROVIDED", public_decision_bytes_sha256: "NOT_AVAILABLE",
    private_custody_authentication: "NOT_VERIFIED", independent_witness: "NOT_VERIFIED",
    independent_reviewer: "NOT_VERIFIED", signer_existence: "SIGNER_STATUS_UNKNOWN",
    approved_restricted_store: "NOT_VERIFIED", independent_public_pin: "NOT_VERIFIED",
    nonproduction_tenant_isolation: "NOT_VERIFIED", source_proof_B_accepted: false,
    owner_test_authorization: "NOT_GIVEN", gateway_gets: "NOT_RUN",
    windows_private_relay: "NOT_INSTALLED_OFF", connection: "DISCONNECTED / HOLD"
  });
  if (typeof raw !== "string" || raw.length < 250 || raw.length > 8192 ||
    !SHA.test(sourceA ?? "") || !Number.isSafeInteger(nowMs) || nowMs <= 0 ||
    (expectedRawSha256 !== undefined && !HEX.test(expectedRawSha256)))
    throw new Error("Original bounded nonsecret public return and audited source A required.");
  const rawDigest = sha256(Buffer.from(raw, "utf8"));
  if (expectedRawSha256 !== undefined && rawDigest !== expectedRawSha256)
    throw new Error("Original public return raw bytes differ from separately recorded digest.");
  let p;
  try { p = JSON.parse(raw); } catch { throw new Error("Public QL-264 decision is not valid JSON."); }
  if (!exact(p, FIELDS) || !exact(p.role_receipts, ROLES))
    throw new Error("QL-264 return contains missing, reordered, or private-capable fields.");
  const roleRefs = ROLES.map(role => p.role_receipts[role]);
  if (roleRefs.some(x => x !== null && (typeof x !== "string" || !OPAQUE.test(x))) ||
    new Set(roleRefs.filter(Boolean)).size !== roleRefs.filter(Boolean).length)
    throw new Error("QL-264 role references must be distinct opaque nonsecret IDs or null.");
  if (p.schema_version !== "rosevear.ql264.public-private-decision-status.v1" ||
    p.repository !== REPO || p.source_system !== "rosevear-ai-hub" ||
    p.audited_source_sha_A !== sourceA ||
    !["SIGNER_STATUS_UNKNOWN", "SIGNER_NOT_PROVISIONED", "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED"].includes(p.signer_status) ||
    !CLAIM.includes(p.signer_pin_status) ||
    !["NOT_APPROVED", "REVIEWER_REPORTS_APPROVED"].includes(p.restricted_store_status) ||
    !CLAIM.includes(p.custodian_status) || !CLAIM.includes(p.witness_status) ||
    !CLAIM.includes(p.reviewer_status) ||
    !["NOT_VERIFIED", "REVIEWER_REPORTS_ISOLATED_NONPRODUCTION"].includes(p.nonproduction_isolation) ||
    p.owner_test_authorization !== "NOT_GIVEN" || p.gateway_get_status !== "NOT_RUN" ||
    p.windows_relay !== "NOT_INSTALLED_OFF" ||
    !Number.isSafeInteger(p.issued_at) || !Number.isSafeInteger(p.expires_at) ||
    p.issued_at > nowMs || p.expires_at <= nowMs ||
    p.expires_at - p.issued_at > 900_000 || p.expires_at <= p.issued_at)
    throw new Error("QL-264 source identity, freshness, enum, relay or HOLD status invalid.");
  for (const role of ROLES) {
    if (p[`${role}_status`] === "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND" && !p.role_receipts[role])
      throw new Error("Reported private role decision lacks an opaque receipt reference.");
  }
  return Object.freeze({
    original_public_decision: "RECEIVED_SCHEMA_VALID_CLAIMS_ONLY",
    public_decision_bytes_sha256: rawDigest,
    audited_source_A_claim: p.audited_source_sha_A,
    role_references_distinct: "OPAQUE_VALUES_ONLY_NOT_HUMAN_AUTHENTICATION",
    claimed_signer_status: p.signer_status,
    claimed_private_role_statuses: {
      custodian: p.custodian_status, witness: p.witness_status, reviewer: p.reviewer_status
    },
    claimed_store_status: p.restricted_store_status,
    claimed_pin_status: p.signer_pin_status,
    claimed_tenant_isolation: p.nonproduction_isolation,
    private_custody_authentication: "NOT_VERIFIED_BY_PUBLIC_RETURN",
    real_independent_reviewer_decision: "REQUIRES_PRIVATE_ORIGINAL_REVIEW",
    source_proof_B_accepted: false, owner_test_authorization: "NOT_GIVEN",
    gateway_gets: "NOT_RUN", windows_private_relay: "NOT_INSTALLED_OFF",
    connection: "DISCONNECTED / HOLD"
  });
}

/** This is a static reviewed preview, not a network exercise or a signed authorization. */
export function planQl264ReversibleTestOnly() {
  return Object.freeze({
    kind: "rosevear.ql264.offline-reversible-test-plan.v1",
    simulated: true, network_requests: 0, credentials_used: false,
    allowlisted_methods: ["GET"],
    allowlisted_paths: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
    proposed_max_minutes: 15, proposed_max_gets: 9,
    proposed_seven_denials: [...SIGNALS],
    required_before_execution: [
      "authenticated_source_signer_custody_and_separate_witness_reviewer",
      "original_ql246_signed_proof_B_and_out_of_band_public_pin",
      "verified_isolated_nonproduction_origin_and_scoped_identity",
      "separately_authenticated_owner_TEST_only_permission",
      "independently_reviewed_stop_rollback_and_original_evidence_custody"
    ],
    installation_or_private_network_route: "PROHIBITED",
    stop_rollback_status: "PLAN_ONLY_NOT_APPROVED_OR_EXECUTED",
    activation_eligible: false, owner_test_authorization: "NOT_GIVEN",
    gateway_gets: "NOT_RUN", windows_private_relay: "NOT_INSTALLED_OFF",
    connection: "DISCONNECTED / HOLD"
  });
}

/** Call only with --public-get, which delegates solely to existing GitHub-public proof recheck. */
export async function auditQl264PublicProofB({ sourceA, proofB, recheck } = {}) {
  if (!SHA.test(sourceA ?? "") || !SHA.test(proofB ?? "") || sourceA === proofB)
    throw new Error("Distinct immutable audited source A and proof B SHA required.");
  const run = recheck ?? (await import("./ql263-hub-reviewer-proof-gate.mjs")).recheckQl263PublicProofB;
  const observed = await run({ sourceA, proofB });
  if (observed.source_A !== sourceA || observed.proof_B_observed_main_sha !== proofB ||
    ![200, 404].includes(observed.exact_proof_http_status) ||
    observed.proof_B_accepted !== "NO" || observed.connection !== "DISCONNECTED / HOLD")
    throw new Error("Original public proof observation inconsistent; fail closed.");
  return Object.freeze({
    source_A: sourceA, proof_B: proofB,
    exact_original_public_proof_http: observed.exact_proof_http_status,
    exact_main_push_ci: observed.exact_main_push_ci,
    public_file_status: observed.exact_proof_http_status === 404 ?
      "MISSING" : "PUBLIC_BYTES_PRESENT_UNTRUSTED",
    original_source_signer_signature_and_pin: "NOT_INDEPENDENTLY_ACCEPTED",
    private_human_custody_and_witness: "NOT_VERIFIED",
    original_proof_B_accepted: false, owner_test_authorization: "NOT_GIVEN",
    gateway_gets: "NOT_RUN", connection: "DISCONNECTED / HOLD"
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i+1]; };
  const withValue = ["--public-decision", "--source-A", "--public-decision-sha256", "--proof-B"];
  const flags = [...withValue, "--public-get", "--help"];
  const malformed = args.some((arg, i) => arg.startsWith("--") ?
    (!flags.includes(arg) || (withValue.includes(arg) &&
      (!args[i+1] || args[i+1].startsWith("--")))) :
    (i === 0 || !withValue.includes(args[i-1])));
  const publicGet = args.includes("--public-get");
  if (malformed || (args.includes("--proof-B") && !publicGet) ||
    (publicGet && (!value("--source-A") || !value("--proof-B"))) ||
    (args.includes("--public-decision-sha256") && !args.includes("--public-decision")) ||
    (args.includes("--public-decision") && !value("--source-A"))) {
    process.stderr.write("QL-264 unsupported/incomplete option; private integration remains HELD.\n");
    process.exitCode = 1;
  } else if (args.includes("--help")) process.stdout.write(
    "Offline default. Original sanitized public decision only: --public-decision <json> --source-A <audited SHA> [--public-decision-sha256 <separate digest>]. Opt-in public GitHub proof check: --public-get --source-A <SHA> --proof-B <SHA>. Never use a private receipt, secret, or home address.\n"
  );
  else {
    try {
      const raw = value("--public-decision") ? readFileSync(value("--public-decision"), "utf8") : undefined;
      const custody = reconcileQl264PublicDecision(raw, {
        sourceA: value("--source-A"), expectedRawSha256: value("--public-decision-sha256")
      });
      const result = { custody, dryRun: planQl264ReversibleTestOnly() };
      if (publicGet) {
        auditQl264PublicProofB({ sourceA: value("--source-A"), proofB: value("--proof-B") })
          .then(proof => process.stdout.write(JSON.stringify({ ...result, proof }, null, 2) + "\n"))
          .catch(() => { process.stderr.write("QL-264 public proof B check failed closed.\n"); process.exitCode = 1; });
      } else process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch {
      process.stderr.write("QL-264 source decision missing/invalid; no integration state change.\n");
      process.exitCode = 1;
    }
  }
}
