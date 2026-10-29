import { strict as assert } from "node:assert";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { checkQl256SourceEvidence, fingerprintCandidatePublicSigner,
  inventoryPublicTemplate, QL256_PUBLIC_SOURCE } from "./ql256-hub-source-custody.mjs";

const SHA = "a".repeat(40);
const REPO = "RosevearCreations/rosevear-ai-hub";
const RUN = `https://github.com/${REPO}/actions/runs/111`;
function getFor({ head = SHA, status = 404, green = true } = {}) {
  const requests = [];
  const get = async url => { requests.push(url);
    if (url.includes("actions/runs")) return new Response(JSON.stringify({ workflow_runs: [{
      id: 111, head_sha: head, head_branch: "main", event: "push",
      status: "completed", conclusion: green ? "success" : "failure",
      html_url: RUN, repository: { full_name: REPO },
    }] }), { status: 200 });
    return new Response(status === 404 ? "" : "NOT_A_SIGNED_PROOF", { status });
  };
  return { get, requests };
}
test("QL-256 inventory only reads safe template fields and never prints secret values", () => {
  const content = "APP_ENV=development\nAPP_HOST=127.0.0.1\nSECRET_ENCRYPTION_KEY=super-secret\nHOME_ASSISTANT_TOKEN=\n";
  const result = inventoryPublicTemplate(content);
  assert.equal(result.public_defaults.find(item => item.name === "APP_ENV")?.public_template_default, "development");
  assert.equal(result.secret_placeholders[0].template_status, "NONEMPTY_TEMPLATE_VALUE_SECURITY_REVIEW_REQUIRED");
  assert.equal(JSON.stringify(result).includes("super-secret"), false);
  assert.equal(result.actual_runtime_secret_status, "UNKNOWN_NOT_INSPECTED");
});
test("QL-256 genuine exact main source CI and exact immutable public 404 are reportable", async () => {
  const { get, requests } = getFor();
  const result = await checkQl256SourceEvidence({ sourceSha: SHA, get });
  assert.equal(result.source_ci_head_sha_match, "VERIFIED_EXACT_MAIN_PUSH_CI");
  assert.equal(result.matching_source_green_ci_run_url, RUN);
  assert.equal(result.proof_http_status_at_A, 404);
  assert.equal(result.signer_provisioning_decision, "SIGNER_STATUS_UNKNOWN");
  assert.equal(result.owner_test_decision, "NOT_GIVEN");
  assert.equal(result.relay_installed_or_started, "NO");
  assert.equal(requests.length, 2);
  assert.ok(requests.every(url => /^https:\/\/(?:api\.github\.com|raw\.githubusercontent\.com)\//.test(url)));
});
test("QL-256 mismatched, failed or non-main CI never upgrades original source", async () => {
  const wrong = await checkQl256SourceEvidence({ sourceSha: SHA, get: getFor({ head: "b".repeat(40) }).get });
  assert.equal(wrong.matching_source_green_ci_run_url, "NOT_AVAILABLE");
  const failed = await checkQl256SourceEvidence({ sourceSha: SHA, get: getFor({ green: false }).get });
  assert.equal(failed.source_ci_head_sha_match, "NOT_VERIFIED");
});
test("QL-256 public source existence cannot be called authentic proof B", async () => {
  const result = await checkQl256SourceEvidence({ sourceSha: SHA, get: getFor({ status: 200 }).get });
  assert.equal(result.proof_path_observation, "PUBLIC_FILE_PRESENT_AT_A_UNVERIFIED_NOT_PROOF_B");
  assert.equal(result.proof_commit_sha_B, "NOT_AVAILABLE");
  assert.equal(result.exact_raw_proof_sha256, "NOT_AVAILABLE");
  assert.equal(result.connection_state, "DISCONNECTED");
});
test("QL-256 rejects malformed source SHA and GitHub API errors without private fallback", async () => {
  await assert.rejects(checkQl256SourceEvidence({ sourceSha: "main", get: () => { throw Error("No network"); } }),
    /immutable/);
  await assert.rejects(checkQl256SourceEvidence({ sourceSha: SHA, get: async () => new Response("fail", { status: 403 }) }),
    /HTTP 403/);
});
test("QL-256 unknown private signer and unapproved relay stay explicitly separate", () => {
  assert.equal(QL256_PUBLIC_SOURCE.signer_provisioning_decision, "SIGNER_STATUS_UNKNOWN");
  assert.equal(QL256_PUBLIC_SOURCE.service_account_and_rollback, "PROPOSAL_ONLY");
  assert.equal(QL256_PUBLIC_SOURCE.independent_witness_real_world_identity_verified, "NOT_VERIFIED");
});
test("QL-256 only computes untrusted Ed25519 candidate public SPKI and rejects private PEM", () => {
  const pair = generateKeyPairSync("ed25519"); // synthetic, in-memory unit fixture; NOT source custody evidence
  const pem = pair.publicKey.export({ format: "pem", type: "spki" }).toString();
  const candidate = fingerprintCandidatePublicSigner(pem);
  assert.match(candidate.public_spki_sha256_candidate, /^[a-f0-9]{64}$/);
  assert.equal(candidate.signer_provisioning_decision, "SIGNER_STATUS_UNKNOWN");
  assert.match(candidate.trust, /^UNTRUSTED/);
  assert.throws(() => fingerprintCandidatePublicSigner(pair.privateKey.export({ format: "pem", type: "pkcs8" }).toString()), /public SPKI/);
});
