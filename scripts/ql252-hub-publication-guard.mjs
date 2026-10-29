/** QL-252: fail closed if a supposedly authenticated proof appears without separate review. */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PROOF = "docs/integration/ql246-source-proof.json";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** CI has no authenticated operator witnesses or owner TEST authority. Never accept local fixtures. */
export function checkSourceOnlyPublication(repoRoot = ROOT, fileExists = existsSync) {
  if (fileExists(resolve(repoRoot, PROOF)))
    throw new Error("QL-252 BLOCKED: public signed source proof is present without a separately approved custody/witness publication gate. Do not treat fixtures, local CI or typed claims as real authenticated evidence; request an explicit independently reviewed policy change and original owner authorization first.");
  return Object.freeze({ source_ci_eligible: true, proof_file: "MISSING_OR_NOT_PUBLISHED",
    proof_publication: "BLOCKED_UNTIL_SEPARATE_AUTHORIZATION",
    owner_test_decision: "NOT_GIVEN", actual_gateway_test: "NOT_RUN",
    connection_state: "DISCONNECTED", rollout: "HOLD" });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(checkSourceOnlyPublication(), null, 2) + "\n"); }
  catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "QL-252 publication gate failed"}\n`);
    process.exitCode = 1;
  }
}
