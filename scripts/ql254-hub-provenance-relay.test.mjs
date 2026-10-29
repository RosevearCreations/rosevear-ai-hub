import test from "node:test";
import assert from "node:assert/strict";
import { checkQl254HubReadiness, ql254Offline,
  simulateQl254RelayRollback } from "./ql254-hub-provenance-relay.mjs";

test("offline QL-254 never claims owner or independent witnesses", () => {
  const x = ql254Offline();
  assert.equal(x.status, "HELD"); assert.equal(x.owner_test_decision, "NOT_GIVEN");
  assert.equal(x.actual_windows_service, "NOT_INSTALLED");
  assert.equal(x.private_registry_snapshot_sha256, "NOT_AVAILABLE");
});
test("QL-254 immutable missing proof requires exactly one public GitHub request", async () => {
  const sha = "d2cab6dfa98be39c8dd2775a020fe8c644768ceb", calls = [];
  const result = await checkQl254HubReadiness({ mainSha: sha,
    get: async url => { calls.push(url); return { status: 404, ok: false }; } });
  assert.deepEqual(calls, [`https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/${sha}/docs/integration/ql246-source-proof.json`]);
  assert.equal(result.immutable_proof_http_status, 404);
  assert.equal(result.connection_state, "DISCONNECTED");
  assert.equal(result.independent_witness_real_world_identity_verified, "NOT_VERIFIED");
});
test("synthetic relay kill-switch/revocation/rollback never installs or runs a connector", () => {
  const x = simulateQl254RelayRollback({ healthCheckSeconds: 30,
    injectFailureAt: 3, maxChecks: 5 });
  assert.equal(x.no_network_or_windows_service, true);
  assert.equal(x.rollback_state, "SIMULATED_FINAL_STOPPED");
  assert.deepEqual(x.trace.slice(-4), ["SIMULATED_KILL_SWITCH",
    "SIMULATED_KEY_REVOCATION", "SIMULATED_RESTORE_BASELINE", "SIMULATED_FINAL_STOPPED"]);
  assert.equal(x.connection_state, "DISCONNECTED");
  assert.throws(() => simulateQl254RelayRollback({ healthCheckSeconds: 5 }), /30–300/);
  assert.throws(() => simulateQl254RelayRollback({ injectFailureAt: 0 }), /injected failure/);
});
