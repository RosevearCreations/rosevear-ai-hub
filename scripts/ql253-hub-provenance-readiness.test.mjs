import test from "node:test";
import assert from "node:assert/strict";
import { checkQl253HubReadiness, ql253NoNetwork } from "./ql253-hub-provenance-readiness.mjs";

const MAIN = "f81dc739b8af0bcd6c8ffae00aa5ecc9b9dd197d";
test("offline default is HELD and never claims registry/runner/owner state", () => {
  const x = ql253NoNetwork();
  assert.equal(x.status, "HELD"); assert.equal(x.connection_state, "DISCONNECTED");
  assert.equal(x.out_of_band_registry_snapshot_sha256, "NOT_AVAILABLE");
  assert.equal(x.relay_service, "NOT_INSTALLED_OR_AUTHORIZED");
  assert.equal(x.owner_test_decision, "NOT_GIVEN");
});
test("immutable public proof 404 remains HELD, with no other request", async () => {
  const calls = [];
  const r = await checkQl253HubReadiness({ mainSha: MAIN, get: async url => {
    calls.push(url); return { status: 404, ok: false };
  } });
  assert.deepEqual(calls, [
    `https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/${MAIN}/docs/integration/ql246-source-proof.json`,
  ]);
  assert.equal(r.immutable_proof_http_status, 404);
  assert.equal(r.original_seven_negative_denial_receipts, "NOT_VERIFIED");
  assert.equal(r.owner_test_decision, "NOT_GIVEN");
  assert.equal(r.connection_state, "DISCONNECTED");
});
test("only lowercase immutable SHA allowed; no gateway or private host", async () => {
  let calls = 0;
  await assert.rejects(() => checkQl253HubReadiness({ mainSha: "main", get: async () => { calls++; } }),
    /immutable Git commit SHAs/);
  assert.equal(calls, 0);
});
