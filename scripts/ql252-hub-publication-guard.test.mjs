import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSourceOnlyPublication } from "./ql252-hub-publication-guard.mjs";

test("no proof is an honest green-source/held-integration result", () => {
  const paths = [];
  const result = checkSourceOnlyPublication("/ignored-test-root", path => {
    paths.push(path); return false;
  });
  assert.equal(result.source_ci_eligible, true);
  assert.equal(result.proof_file, "MISSING_OR_NOT_PUBLISHED");
  assert.equal(result.connection_state, "DISCONNECTED");
  assert.equal(result.owner_test_decision, "NOT_GIVEN");
  assert.deepEqual(paths, ["/ignored-test-root/docs/integration/ql246-source-proof.json"]);
});

test("file presence fails closed even if its purported signature is synthetic or plausible", () => {
  assert.throws(() => checkSourceOnlyPublication("/ignored-test-root", () => true),
    /BLOCKED: public signed source proof is present/);
  assert.throws(() => checkSourceOnlyPublication("/ignored-test-root", () => true),
    /independently reviewed policy change/);
});
