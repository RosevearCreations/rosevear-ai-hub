import { strict as assert } from "node:assert";
import { test } from "node:test";
import { refreshQl258PublicProof } from "./ql258-hub-public-refresh.mjs";

const SHA = "a".repeat(40);
const REPO = "RosevearCreations/rosevear-ai-hub";
const response = (status, value = "") => ({ status,
  async arrayBuffer() { return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)); } });

function fakeGet({ current = SHA, ciGreen = true, proofStatus = 404, drift = false } = {}) {
  const requested = [];
  let heads = 0;
  const get = async (url, options) => {
    requested.push(url);
    assert.equal(options.redirect, "error");
    if (url.endsWith("/branches/main")) {
      heads++;
      return response(200, { name: "main", commit: { sha: drift && heads === 2 ? "b".repeat(40) : current } });
    }
    if (url.includes("/actions/runs?head_sha=")) return response(200, { workflow_runs: ciGreen ? [{
      head_sha: SHA, head_branch: "main", event: "push", status: "completed",
      conclusion: "success", repository: { full_name: REPO }, id: 123,
      html_url: `https://github.com/${REPO}/actions/runs/123`,
    }] : [] });
    if (url.startsWith("https://raw.githubusercontent.com/"))
      return response(proofStatus, proofStatus === 200 ? "untrusted-public-file" : "");
    throw new Error(`unexpected URL ${url}`);
  };
  return { get, requested };
}

test("a matching real main-push CI plus missing immutable file still holds integration", async () => {
  const f = fakeGet();
  const result = await refreshQl258PublicProof({ sourceSha: SHA, get: f.get });
  assert.equal(result.proof_http_status, 404);
  assert.equal(result.genuine_signed_proof_B, "NOT_ACCEPTED");
  assert.equal(result.connection, "DISCONNECTED / HOLD");
  assert.equal(result.owner_test_authorization, "NOT_GIVEN");
  assert.equal(result.authenticated_gateway_GETs, "NOT_RUN");
  assert.equal(f.requested.length, 4);
  assert.ok(f.requested.every(url => url.startsWith("https://api.github.com/repos/RosevearCreations/rosevear-ai-hub/") ||
    url.startsWith("https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/")));
});
test("HTTP 200 is only a public file candidate, never authenticated proof B", async () => {
  const result = await refreshQl258PublicProof({ sourceSha: SHA, get: fakeGet({ proofStatus: 200 }).get });
  assert.equal(result.proof_observation, "PUBLIC_FILE_PRESENT_BUT_UNTRUSTED_REVIEW_REQUIRED");
  assert.equal(result.independent_pin_and_custody, "NOT_VERIFIED");
  assert.equal(result.genuine_signed_proof_B, "NOT_ACCEPTED");
});
test("rejects stale source, missing exact CI and source race without private retries", async () => {
  await assert.rejects(refreshQl258PublicProof({ sourceSha: SHA, get: fakeGet({ current: "b".repeat(40) }).get }), /not the current/);
  await assert.rejects(refreshQl258PublicProof({ sourceSha: SHA, get: fakeGet({ ciGreen: false }).get }), /No completed GREEN/);
  await assert.rejects(refreshQl258PublicProof({ sourceSha: SHA, get: fakeGet({ drift: true }).get }), /Main moved/);
  await assert.rejects(refreshQl258PublicProof({ sourceSha: "bad", get: fakeGet().get }), /40-character/);
});
