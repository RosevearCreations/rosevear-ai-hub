/**
 * QL-252 public GitHub-only provenance preflight. Never a gateway/owner/pin verifier.
 * `--public-get` is explicit opt-in; no application URL, token or private runner accepted.
 */
import { createHash, createPublicKey, verify } from "node:crypto";
import { fileURLToPath } from "node:url";
import { canonicalQl246Payload, NEGATIVE_FIELDS } from "./ql246-source-proof-contract.mjs";

const REPO = "RosevearCreations/rosevear-ai-hub";
const COMMIT = /^[0-9a-f]{40}$/;
const BASE = "https://api.github.com/repos/RosevearCreations/rosevear-ai-hub";
const PROOF_PATH = "docs/integration/ql246-source-proof.json";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hold = (reason, fields = {}) => ({
  application_name: "rosevear-ai-hub", repository: REPO,
  connection_state: "DISCONNECTED", owner_test_decision: "NOT_GIVEN",
  actual_gateway_test: "NOT_RUN", private_runner: "NOT_AUTHORIZED",
  out_of_band_custody_receipt_id: "NOT_AVAILABLE",
  distinct_witness_receipt_id: "NOT_AVAILABLE", owner_test_receipt_id: "NOT_AVAILABLE",
  status: "HELD", reason, ...fields,
});
const apiHeaders = { "Accept": "application/vnd.github+json", "User-Agent": "rosevear-hub-public-source-preflight" };

async function readPublic(url, get) {
  const result = await get(url, { headers: apiHeaders, redirect: "error" });
  if (result.status === 404) return { missing: true };
  if (!result.ok) throw new Error(`Public GitHub returned HTTP ${result.status}; no proof accepted.`);
  return { bytes: Buffer.from(await result.arrayBuffer()) };
}
async function readJson(url, get) {
  const result = await readPublic(url, get);
  if (result.missing) throw new Error("Required public GitHub CI/ancestry metadata returned 404.");
  if (result.bytes.length > 1_000_000) throw new Error("Public GitHub metadata exceeds the safe byte limit.");
  return JSON.parse(result.bytes.toString("utf8"));
}

/** A local signature match remains UNTRUSTED without independent, external original evidence. */
export function inspectPublicEnvelope(bytes, sourceSha, sourceCiUrl, now = Date.now()) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 128_000)
    throw new Error("QL-246 proof bytes missing or too large.");
  const envelope = JSON.parse(bytes.toString("utf8"));
  if (!envelope || Object.keys(envelope).join(",") !== "publicKeyPem,payload,signature")
    throw new Error("QL-246 public proof envelope does not match exact schema.");
  const p = envelope.payload;
  const canonical = canonicalQl246Payload(p);
  if (p.schema_version !== "rosevear.integration.v1" || p.source_system !== "rosevear-ai-hub" ||
    p.repository !== REPO || p.business_id !== "rosevear-ai-hub" || p.tenant_id !== null ||
    p.source_revision !== sourceSha || p.ci_run_url !== sourceCiUrl ||
    p.environment !== "nonproduction" || JSON.stringify(p.allowed_methods) !== '["GET"]' ||
    JSON.stringify(p.allowed_paths) !== '["/api/integration/v1/health","/api/integration/v1/capabilities"]' ||
    p.owner_authorization !== "NOT_GIVEN" || p.connection_state !== "DISCONNECTED" ||
    p.external_gateway_get_verified !== false || p.durable_audit_verified !== false ||
    p.owner_identity_verified !== false ||
    !p.negative_tests || Object.keys(p.negative_tests).join(",") !== NEGATIVE_FIELDS.join(",") ||
    NEGATIVE_FIELDS.some(k => p.negative_tests[k] !== true) ||
    typeof p.challenge_id !== "string" || !/^np-[\w-]+$/.test(p.challenge_id) ||
    !/^[0-9a-f]{64}$/.test(p.challenge_sha256) ||
    !Number.isSafeInteger(p.issued_at) || !Number.isSafeInteger(p.expires_at) ||
    p.issued_at > now || p.expires_at <= now || p.expires_at <= p.issued_at ||
    p.expires_at - p.issued_at > 3_600_000)
    throw new Error("QL-246 proof fields, claim flags, challenge window or HOLD scope invalid.");
  for (const key of ["gateway_audit_receipt_id", "health_receipt_id", "capabilities_receipt_id", "registered_key_id"]) {
    if (p[key] !== null && (typeof p[key] !== "string" || !/^np-[\w-]+$/.test(p[key])))
      throw new Error("QL-246 receipt ID format invalid.");
  }
  if (typeof envelope.signature !== "string" || !/^[\w-]{86}$/.test(envelope.signature))
    throw new Error("QL-246 detached signature format invalid.");
  const signature = Buffer.from(envelope.signature, "base64url");
  if (signature.length !== 64 || signature.toString("base64url") !== envelope.signature)
    throw new Error("QL-246 detached signature is not canonical base64url.");
  let pub;
  try { pub = createPublicKey(envelope.publicKeyPem); }
  catch { throw new Error("QL-246 public Ed25519 key invalid."); }
  if (pub.asymmetricKeyType !== "ed25519" || !verify(null, canonical, pub, signature))
    throw new Error("QL-246 public Ed25519 detached signature does not match payload.");
  const spki = pub.export({ format: "der", type: "spki" });
  return { exact_proof_bytes_sha256: sha(bytes), public_spki_sha256: sha(spki),
    public_signature_result: "LOCAL_MATCH_UNTRUSTED_NOT_WITNESSED" };
}

/**
 * Optional public-only GitHub preflight. Never reads the LAN, private IPs or secrets.
 * When B is not known, only the immutable main proof path is checked and marked HOLD.
 */
export async function checkQl252HubPublic({ mainSha, sourceSha, proofSha, get = fetch, now = Date.now() }) {
  if (mainSha && !COMMIT.test(mainSha) || sourceSha && !COMMIT.test(sourceSha) ||
    proofSha && !COMMIT.test(proofSha))
    throw new Error("Only complete lowercase immutable Git commit SHAs are accepted.");
  const target = proofSha ?? mainSha;
  if (!target) return hold("NO_IMMUTABLE_PROOF_COMMIT_SUPPLIED");
  const publicUrl = `https://raw.githubusercontent.com/${REPO}/${target}/${PROOF_PATH}`;
  const proof = await readPublic(publicUrl, get);
  const common = { proof_commit_sha_B: proofSha ?? "NOT_AVAILABLE",
    immutable_public_proof_url: publicUrl,
    source_sha_A: sourceSha ?? "NOT_AVAILABLE" };
  if (proof.missing) return hold("HTTP_404_NO_PUBLIC_SIGNED_PROOF", { ...common,
    immutable_proof_http_status: 404 });
  if (!sourceSha || !proofSha) return hold("SOURCE_A_AND_PROOF_B_SEPARATE_PROVENANCE_MISSING", {
    ...common, exact_proof_bytes_sha256: sha(proof.bytes), immutable_proof_http_status: 200 });
  if (sourceSha === proofSha)
    return hold("SOURCE_A_CANNOT_BE_ITS_OWN_PROOF_B", common);
  const compare = await readJson(`${BASE}/compare/${sourceSha}...${proofSha}`, get);
  if (compare.status !== "ahead" || !Number.isInteger(compare.ahead_by) || compare.ahead_by < 1 ||
    compare.behind_by !== 0)
    return hold("SOURCE_A_NOT_PROVEN_ANCESTOR_OF_B", common);
  const runs = await readJson(`${BASE}/actions/runs?head_sha=${sourceSha}&per_page=100`, get);
  const sameSha = Array.isArray(runs.workflow_runs) ? runs.workflow_runs.filter(run =>
    run.head_sha === sourceSha && run.status === "completed" && run.conclusion === "success" &&
    run.repository?.full_name === REPO && run.html_url ===
      `https://github.com/${REPO}/actions/runs/${run.id}`) : [];
  if (!sameSha.length) return hold("SOURCE_A_SAME_SHA_GREEN_CI_MISSING", common);
  const envelope = JSON.parse(proof.bytes.toString("utf8"));
  const matchingCi = sameSha.find(run => run.html_url === envelope?.payload?.ci_run_url);
  if (!matchingCi) return hold("PROOF_CI_CLAIM_NOT_GREEN_FOR_SOURCE_A", common);
  try {
    const local = inspectPublicEnvelope(proof.bytes, sourceSha, matchingCi.html_url, now);
    return hold("LOCAL_PUBLIC_PROVENANCE_ONLY_INDEPENDENT_WITNESS_AND_OWNER_MISSING", {
      ...common, source_ci_run_url: matchingCi.html_url,
      immutable_proof_http_status: 200, source_ancestor_of_proof: true,
      ...local, out_of_band_pin_trust: "UNVERIFIED", seven_real_denials: "UNVERIFIED" });
  } catch (error) {
    return hold("PUBLIC_PROOF_FORMAT_OR_SIGNATURE_INVALID", {
      ...common, immutable_proof_http_status: 200,
      reason_detail: error instanceof Error ? error.message : "Invalid public proof" });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    process.stdout.write("Read-only QL-252 Hub preflight: --public-get --main <40-hex SHA> OR --public-get --source <A> --proof <B>\n");
  } else if (!args.includes("--public-get")) {
    process.stdout.write(JSON.stringify(hold("PUBLIC_GET_NOT_REQUESTED_NO_NETWORK"), null, 2) + "\n");
  } else {
    const option = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
    checkQl252HubPublic({ mainSha: option("--main"), sourceSha: option("--source"),
      proofSha: option("--proof") })
      .then(result => process.stdout.write(JSON.stringify(result, null, 2) + "\n"))
      .catch(error => { process.stderr.write(`QL-252 public-only preflight failed closed: ${error.message}\n`);
        process.exitCode = 1; });
  }
}
