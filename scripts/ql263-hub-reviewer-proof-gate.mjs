/** Build 190 / QL-263. Public reviewer envelope math and fresh public proof recheck ONLY.
 * Neither a local signature match nor public GitHub CI authenticates humans or authorizes TEST. */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { refreshQl258PublicProof } from "./ql258-hub-public-refresh.mjs";
import { inspectQl261SourceProofLineage } from "./ql261-hub-build188-reconcile.mjs";

const REPO = "RosevearCreations/rosevear-ai-hub";
const SOURCE = "rosevear-ai-hub";
const HEX = /^[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{40}$/;
const OPAQUE = /^np-[A-Za-z0-9_-]{8,80}$/;
const KEYS = ["schema_version", "repository", "source_system", "source_sha_A", "proof_commit_sha_B",
  "source_ci_run_url", "reviewer_receipt_id", "custodian_receipt_id", "witness_receipt_id",
  "witness_spki_sha256", "source_signer_spki_sha256", "registry_snapshot_sha256",
  "challenge_sha256", "reviewer_decision", "owner_test_authorization", "connection_state",
  "issued_at", "expires_at"];

const hash = data => createHash("sha256").update(data).digest("hex");
const exact = (obj, keys) => !!obj && typeof obj === "object" && !Array.isArray(obj) &&
  Object.keys(obj).length === keys.length && Object.keys(obj).every((key, i) => key === keys[i]);

export function canonicalQl263ReviewerPayload(p) {
  if (!exact(p, KEYS)) throw new Error("Reviewer metadata fields missing, extra, or reordered.");
  return Buffer.from(JSON.stringify(Object.fromEntries(KEYS.map(k => [k, p[k]]))), "utf8");
}

/** Public nonsecret envelope: signature mathematics only. Never import private IDs, passwords or keys. */
export function inspectQl263ReviewerEnvelope(raw, { auditedSourceA, nowMs = Date.now(),
  expectedReviewerSpkiSha256 } = {}) {
  if (typeof raw !== "string" || raw.length < 200 || raw.length > 16_384 ||
    !SHA.test(auditedSourceA ?? "") || !Number.isSafeInteger(nowMs) || nowMs < 1)
    throw new Error("Original short public reviewer JSON and separate audited source A required.");
  if (expectedReviewerSpkiSha256 !== undefined && !HEX.test(expectedReviewerSpkiSha256))
    throw new Error("Only a separately supplied public reviewer SPKI SHA-256 is accepted.");
  let env;
  try { env = JSON.parse(raw); } catch { throw new Error("Original public reviewer JSON invalid."); }
  if (!exact(env, ["payload", "reviewerPublicKeyPem", "reviewerSignatureBase64url"]))
    throw new Error("Original public reviewer envelope contains forbidden fields.");
  const p = env.payload;
  const bytes = canonicalQl263ReviewerPayload(p);
  if (p.schema_version !== "rosevear.ql263.reviewer.v1" || p.repository !== REPO ||
    p.source_system !== SOURCE || p.source_sha_A !== auditedSourceA ||
    (p.proof_commit_sha_B !== null && (!SHA.test(p.proof_commit_sha_B) || p.proof_commit_sha_B === auditedSourceA)) ||
    typeof p.source_ci_run_url !== "string" ||
    !/^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]*$/.test(p.source_ci_run_url) ||
    [p.reviewer_receipt_id,p.custodian_receipt_id,p.witness_receipt_id].some(x => !OPAQUE.test(x)) ||
    new Set([p.reviewer_receipt_id,p.custodian_receipt_id,p.witness_receipt_id]).size !== 3 ||
    !HEX.test(p.witness_spki_sha256) || !HEX.test(p.source_signer_spki_sha256) ||
    !HEX.test(p.registry_snapshot_sha256) || !HEX.test(p.challenge_sha256) ||
    p.reviewer_decision !== "HELD_PENDING_INDEPENDENT_TRUST" ||
    p.owner_test_authorization !== "NOT_GIVEN" || p.connection_state !== "DISCONNECTED" ||
    !Number.isSafeInteger(p.issued_at) || !Number.isSafeInteger(p.expires_at) ||
    p.issued_at > nowMs || p.expires_at <= nowMs || p.expires_at <= p.issued_at ||
    p.expires_at - p.issued_at > 300_000)
    throw new Error("Original reviewer source, role separation, HOLD or freshness invalid.");
  if (typeof env.reviewerPublicKeyPem !== "string" || env.reviewerPublicKeyPem.length > 1024 ||
    env.reviewerPublicKeyPem.includes("PRIVATE KEY") ||
    !env.reviewerPublicKeyPem.includes("-----BEGIN PUBLIC KEY-----"))
    throw new Error("Only a short PUBLIC reviewer Ed25519 SPKI is accepted.");
  let publicKey;
  try { publicKey = createPublicKey(env.reviewerPublicKeyPem); }
  catch { throw new Error("Public reviewer Ed25519 SPKI malformed."); }
  if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("Reviewer signature requires Ed25519.");
  const fingerprint = hash(publicKey.export({ type: "spki", format: "der" }));
  if (fingerprint === p.witness_spki_sha256 || fingerprint === p.source_signer_spki_sha256 ||
    (expectedReviewerSpkiSha256 !== undefined && fingerprint !== expectedReviewerSpkiSha256))
    throw new Error("Public reviewer identity or independently supplied pin collides/mismatches.");
  if (typeof env.reviewerSignatureBase64url !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(env.reviewerSignatureBase64url))
    throw new Error("Canonical Ed25519 detached reviewer signature required.");
  const signature = Buffer.from(env.reviewerSignatureBase64url, "base64url");
  if (signature.length !== 64 || signature.toString("base64url") !== env.reviewerSignatureBase64url ||
    !verify(null, bytes, publicKey, signature))
    throw new Error("Original reviewer detached signature mathematics invalid.");
  return Object.freeze({
    kind: "rosevear_ql263_public_reviewer_receipt_math_v1",
    original_public_reviewer_bytes_sha256: hash(Buffer.from(raw, "utf8")),
    canonical_public_payload_sha256: hash(bytes),
    audited_source_A_claim: auditedSourceA,
    public_proof_B_claim: p.proof_commit_sha_B ?? "NOT_AVAILABLE",
    reviewer_spki_sha256_candidate: fingerprint,
    signature_math: "LOCAL_ED25519_MATCH_ONLY",
    recent_nonce_window: "VALID_MATH_UP_TO_FIVE_MINUTES",
    role_receipt_distinctness: "OPAQUE_VALUES_DIFFER_NOT_AUTHENTICATED",
    real_reviewer_authentication: "NOT_VERIFIED_OUT_OF_BAND",
    real_custodian_and_witness: "NOT_VERIFIED_OUT_OF_BAND",
    original_proof_B_accepted: "NO",
    owner_test_authorization: "NOT_GIVEN",
    gateway_gets: "NOT_RUN",
    private_relay: "NOT_INSTALLED_OFF",
    connection: "DISCONNECTED / HOLD",
  });
}

/** Optional PUBLIC GitHub-only immutable recheck; never contacts source Windows or Comms gateway. */
export async function recheckQl263PublicProofB({ sourceA, proofB, get = fetch } = {}) {
  if (!SHA.test(sourceA ?? "") || !SHA.test(proofB ?? "") || sourceA === proofB)
    throw new Error("Distinct audited source A and actual published proof B SHA required.");
  const source = await refreshQl258PublicProof({ sourceSha: proofB, get });
  const proof = await inspectQl261SourceProofLineage({ sourceA, proofB, get });
  if (source.observed_main_sha !== proofB || source.proof_http_status !== proof.proof_http_status_at_B ||
    (source.proof_http_status === 200 && source.raw_public_file_sha256 !== proof.raw_public_proof_sha256))
    throw new Error("Public main and immutable proof observations differ; recheck under new SHA.");
  const head = await get(`https://api.github.com/repos/${REPO}/branches/main`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "rosevear-ai-hub-ql263-source-recheck" },
    redirect: "error" });
  if (head?.status !== 200) throw new Error("Final current public main head unavailable.");
  const body = Buffer.from(await head.arrayBuffer());
  if (body.length > 128_000) throw new Error("Public GitHub head response oversized.");
  let current;
  try { current = JSON.parse(body.toString("utf8")); }
  catch { throw new Error("Current main head response malformed."); }
  if (current.name !== "main" || current.commit?.sha !== proofB)
    throw new Error("Main moved during proof B public review; restart at immutable newer head.");
  return Object.freeze({
    source_A: sourceA, proof_B_observed_main_sha: proofB,
    exact_proof_http_status: proof.proof_http_status_at_B,
    original_proof_raw_sha256: proof.raw_public_proof_sha256,
    public_ancestry: "VERIFIED_STRICT_DESCENDANT",
    proof_presence: proof.proof_http_status_at_B === 404 ?
      "MISSING_AT_CURRENT_MAIN" : "PUBLIC_BYTES_ONLY_UNTRUSTED",
    exact_main_push_ci: source.source_ci,
    source_signature_and_private_custody: "NOT_INDEPENDENTLY_VERIFIED",
    reviewer_witness_identity: "NOT_INDEPENDENTLY_VERIFIED",
    proof_B_accepted: "NO", owner_test_authorization: "NOT_GIVEN",
    gateway_gets: "NOT_RUN", private_relay: "NOT_INSTALLED_OFF",
    connection: "DISCONNECTED / HOLD",
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const flags = ["--reviewer-envelope", "--source-A", "--reviewer-public-pin", "--public-get", "--proof-B", "--help"];
  const bad = args.some(arg => arg.startsWith("--") && !flags.includes(arg)) ||
    ["--reviewer-envelope", "--source-A", "--reviewer-public-pin", "--proof-B"].some(name =>
      args.includes(name) && (!option(name) || option(name).startsWith("--")));
  if (bad) { process.stderr.write("QL-263 unsupported/incomplete option; held.\n"); process.exitCode = 1; }
  else if (args.includes("--help")) process.stdout.write(
    "Offline original PUBLIC reviewer math: --reviewer-envelope <public-json> --source-A <sha> [--reviewer-public-pin <public-sha256>]. Optional public GitHub only: --public-get --source-A <sha> --proof-B <sha>. Never provide private keys or home network addresses.\n");
  else if (args.includes("--public-get")) recheckQl263PublicProofB({ sourceA: option("--source-A"), proofB: option("--proof-B") })
    .then(x => process.stdout.write(JSON.stringify(x, null, 2) + "\n"))
    .catch(() => { process.stderr.write("Original public proof B recheck failed closed.\n"); process.exitCode = 1; });
  else if (args.includes("--reviewer-envelope")) {
    try { process.stdout.write(JSON.stringify(inspectQl263ReviewerEnvelope(
      readFileSync(option("--reviewer-envelope"), "utf8"), {
        auditedSourceA: option("--source-A"), expectedReviewerSpkiSha256: option("--reviewer-public-pin")
      }), null, 2) + "\n"); }
    catch { process.stderr.write("Original reviewer candidate invalid/expired; private custody NOT verified.\n"); process.exitCode = 1; }
  } else process.stdout.write(JSON.stringify({
    original_reviewer_receipt: "NOT_PROVIDED", original_proof_B: "NOT_AVAILABLE",
    private_reviewer_and_signer_custody: "NOT_VERIFIED",
    public_source_check: "NOT_RUN_OFFLINE_DEFAULT", owner_test_authorization: "NOT_GIVEN",
    connection: "DISCONNECTED / HOLD", private_relay: "NOT_INSTALLED_OFF"
  }, null, 2) + "\n");
}
