/** Build 189 / QL-262 — offline original evidence freshness and proof-B guard.
 * A cryptographic match is NEVER evidence of authenticated human custody or owner TEST consent.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reconcileQl261HubOwnerPacket } from "./ql261-hub-build188-reconcile.mjs";
import { verifyQl256WitnessEnvelope } from "./ql256-hub-witness-envelope.mjs";
import { validateQl246HubProof } from "./ql246-source-proof-contract.mjs";

const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const HELD = Object.freeze({
  authenticated_custodian: "NOT_VERIFIED",
  separate_nonce_witness_origin: "NOT_VERIFIED",
  independent_reviewer_origin: "NOT_VERIFIED",
  approved_persistent_signing_host: "NOT_VERIFIED",
  independently_pinned_source_spki: "NOT_VERIFIED",
  proof_b_accepted: "NO",
  owner_test_authorization: "NOT_GIVEN",
  authenticated_gateway_GETs: "NOT_RUN",
  original_seven_denials: "NOT_VERIFIED",
  private_windows_relay: "NOT_INSTALLED_OFF",
  connection: "DISCONNECTED / HOLD",
});

const sha256 = value => createHash("sha256").update(value).digest("hex");

/** Reconcile originals, not a generated "done" checklist. Both receipts remain untrusted publicly. */
export function reviewQl262EvidenceFreshness({ ownerPacketRaw, witnessEnvelopeRaw,
  expectedOwnerPacketSha256, auditedSourceA, nowMs = Date.now(), expectedWitnessSpkiSha256 } = {}) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 1)
    throw new Error("Valid current millisecond time required for freshness check.");
  if (expectedOwnerPacketSha256 !== undefined && !DIGEST.test(expectedOwnerPacketSha256))
    throw new Error("Independent owner original digest must be SHA-256 hex.");
  if (auditedSourceA !== undefined && !SHA.test(auditedSourceA))
    throw new Error("Audited source A must be immutable SHA.");
  const owner = reconcileQl261HubOwnerPacket(ownerPacketRaw);
  if (expectedOwnerPacketSha256 !== undefined &&
    (owner.original_owner_packet === "NOT_PROVIDED" ||
      owner.original_owner_packet_sha256 !== expectedOwnerPacketSha256))
    throw new Error("Original owner bytes fail separately supplied digest comparison.");
  const result = {
    schema: "rosevear-hub-ql262-evidence-freshness-v1",
    owner_original_receipt: owner.original_owner_packet,
    owner_original_bytes_sha256: owner.original_owner_packet_sha256,
    owner_snapshot_freshness: "HISTORICAL_QL258_NOT_CURRENT_AUTHENTICATION",
    owner_digest_comparison: expectedOwnerPacketSha256 === undefined ?
      "NOT_PINNED" : "BYTES_MATCH_SEPARATE_CLAIM_NOT_AUTHENTICATED",
    original_public_witness: "NOT_PROVIDED",
    witness_signature_math: "NOT_RUN",
    witness_time_window: "NOT_RUN",
    ...HELD,
    next_specific_blocker: "AUTHENTICATE_ORIGINAL_CUSTODIAN_DISTINCT_WITNESS_AND_REVIEWER_VIA_TRUSTED_PRIVATE_PROCESS",
  };
  if (witnessEnvelopeRaw === undefined) return Object.freeze(result);
  if (!SHA.test(auditedSourceA ?? ""))
    throw new Error("Independent audited source A required for witness correlation.");
  const witness = verifyQl256WitnessEnvelope(witnessEnvelopeRaw,
    { now: nowMs, expectedWitnessSpkiSha256 });
  if (witness.source_sha_A !== auditedSourceA)
    throw new Error("Original witness source A differs from audited source A.");
  const envelope = JSON.parse(witnessEnvelopeRaw);
  const p = envelope.payload;
  if (p.issued_at > nowMs || p.expires_at <= nowMs ||
    p.expires_at - p.issued_at > 300_000)
    throw new Error("Original witness timestamp freshness failed.");
  return Object.freeze({ ...result,
    original_public_witness: "SCHEMA_AND_ED25519_MATCH_CANDIDATE_ONLY",
    witness_original_bytes_sha256: sha256(Buffer.from(witnessEnvelopeRaw, "utf8")),
    witness_source_A_claim: witness.source_sha_A,
    witness_proof_B_claim: witness.proof_commit_sha_B_claim,
    witness_signature_math: "LOCAL_ED25519_MATCH_ONLY",
    witness_time_window: "CURRENT_UP_TO_5_MINUTES_MATH_ONLY",
    witness_custody_claim: "NOT_AUTHENTICATED_OUT_OF_BAND",
    proof_b_accepted: "NO",
    next_specific_blocker: "INDEPENDENTLY_AUTHENTICATE_WITNESS_PUBLIC_PIN_AND_CUSTODIAN_BEFORE_PROOF_B_REVIEW",
  });
}

/** Validate optional PUBLIC proof bytes, exact source and raw digest using an already-audited
 * external reviewer context. The return NEVER upgrades private custody or connection. */
export function reviewQl262ProofBAcceptance({ publicObservation, rawProofBytes, trustedReviewerContext } = {}) {
  if (publicObservation === undefined) return Object.freeze({
    public_proof: "NOT_CHECKED", cryptographic_result: "NOT_RUN", ...HELD,
  });
  const p = publicObservation;
  if (!p || !SHA.test(p.source_sha_A ?? "") || !SHA.test(p.proposed_proof_sha_B ?? "") ||
    p.source_sha_A === p.proposed_proof_sha_B ||
    p.independent_public_ancestry !== "VERIFIED_DESCENDANT_ONLY" ||
    p.exact_proof_path !== "docs/integration/ql246-source-proof.json" ||
    p.integration !== "DISCONNECTED / HOLD" || p.owner_test_authorization !== "NOT_GIVEN")
    throw new Error("Public source A/B observation invalid or not held.");
  if (p.proof_http_status_at_B === 404) {
    if (rawProofBytes !== undefined || trustedReviewerContext !== undefined)
      throw new Error("Public proof HTTP 404 cannot carry authentic proof bytes or reviewer acceptance.");
    return Object.freeze({ public_proof: "HTTP_404_AT_IMMUTABLE_B",
      cryptographic_result: "NOT_RUN", ...HELD });
  }
  if (p.proof_http_status_at_B !== 200 ||
    p.proof_bytes_disposition !== "PUBLIC_BYTES_PRESENT_UNVERIFIED_SIGNATURE_PIN_AND_REVIEW" ||
    !DIGEST.test(p.raw_public_proof_sha256 ?? "") ||
    !Buffer.isBuffer(rawProofBytes) || rawProofBytes.length < 50 || rawProofBytes.length > 32_768 ||
    sha256(rawProofBytes) !== p.raw_public_proof_sha256)
    throw new Error("Immutable original public proof bytes/digest unavailable or mismatched.");
  if (trustedReviewerContext === undefined) return Object.freeze({
    public_proof: "HTTP_200_SOURCE_BYTES_MATCH_ONLY",
    cryptographic_result: "NOT_RUN_INDEPENDENT_REVIEW_MISSING", ...HELD,
  });
  if (!trustedReviewerContext || typeof trustedReviewerContext !== "object" ||
    trustedReviewerContext.sourceRevision !== p.source_sha_A ||
    trustedReviewerContext.proofPublicationRevision !== p.proposed_proof_sha_B ||
    trustedReviewerContext.rawBytesSha256 !== p.raw_public_proof_sha256)
    throw new Error("Independent source A/proof B/raw-byte witness claims do not match public observation.");
  const checked = validateQl246HubProof(rawProofBytes, trustedReviewerContext);
  if (checked.accepted_metadata_only !== true || checked.integration !== "DISCONNECTED")
    throw new Error("QL-246 contract does not permit original proof review acceptance.");
  return Object.freeze({
    public_proof: "HTTP_200_SOURCE_BYTES_MATCH_ONLY",
    cryptographic_result: "OFFLINE_SIGNATURE_MATH_MATCH_METADATA_ONLY",
    trust_boundary: "CALLER_SUPPLIED_REVIEWER_CONTEXT_REQUIRES_OUT_OF_BAND_AUTHENTICATION",
    ...HELD,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const allowed = ["--owner-packet", "--owner-sha256", "--witness-envelope", "--audited-source-A", "--witness-public-pin", "--help"];
  const option = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  if (args.some(arg => arg.startsWith("--") && !allowed.includes(arg)) ||
    allowed.filter(x => x !== "--help").some(x => args.includes(x) &&
      (!option(x) || option(x).startsWith("--")))) {
    process.stderr.write("Invalid or incomplete QL-262 option; no credentials or operations accepted.\n");
    process.exitCode = 1;
  } else if (args.includes("--help")) process.stdout.write(
    "Offline-only original QL-258 packet/witness check: --owner-packet <sanitized-json> [--owner-sha256 <separate-digest>] --witness-envelope <PUBLIC-original> --audited-source-A <40-sha> [--witness-public-pin <separate-public-spki-sha256>]. Never use private keys or runtime credentials.\n");
  else {
    try {
      const result = reviewQl262EvidenceFreshness({
        ownerPacketRaw: option("--owner-packet") && readFileSync(option("--owner-packet"), "utf8"),
        witnessEnvelopeRaw: option("--witness-envelope") && readFileSync(option("--witness-envelope"), "utf8"),
        expectedOwnerPacketSha256: option("--owner-sha256"),
        auditedSourceA: option("--audited-source-A"),
        expectedWitnessSpkiSha256: option("--witness-public-pin"),
      });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch {
      process.stderr.write("QL-262 original evidence missing/expired/unsafe; no trust or connection change.\n");
      process.exitCode = 1;
    }
  }
}
