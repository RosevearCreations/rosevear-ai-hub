/** QL-254: public GitHub-only source preflight + entirely in-memory reversible relay fixture. */
import { fileURLToPath } from "node:url";
import { checkQl253HubReadiness, ql253NoNetwork } from "./ql253-hub-provenance-readiness.mjs";

const STILL_HELD = Object.freeze({
  independent_witness_real_world_identity_verified: "NOT_VERIFIED",
  private_registry_snapshot_sha256: "NOT_AVAILABLE",
  independent_registry_custody_receipt_id: "NOT_AVAILABLE",
  separate_witness_receipt_id: "NOT_AVAILABLE",
  owner_test_decision: "NOT_GIVEN", original_seven_negative_denial_receipts: "NOT_VERIFIED",
  actual_nonproduction_gateway_gets: "NOT_RUN", actual_windows_service: "NOT_INSTALLED",
  private_relay: "NOT_AUTHORIZED", connection_state: "DISCONNECTED", status: "HELD",
});
export const ql254Offline = () => ({ ...ql253NoNetwork(), ...STILL_HELD,
  reason: "PUBLIC_GET_NOT_REQUESTED_NO_NETWORK" });

export async function checkQl254HubReadiness(options = {}) {
  const publicResult = await checkQl253HubReadiness(options);
  return { ...publicResult, ...STILL_HELD };
}

/**
 * A pure trace of proposed future relay behavior. No sockets, service account, secrets,
 * Windows task, timers, filesystem writes or network are ever accessed.
 */
export function simulateQl254RelayRollback({ healthCheckSeconds = 60,
  injectFailureAt = 2, maxChecks = 3 } = {}) {
  if (!Number.isInteger(healthCheckSeconds) || healthCheckSeconds < 30 ||
    healthCheckSeconds > 300 || !Number.isInteger(maxChecks) || maxChecks < 1 ||
    maxChecks > 10 || !Number.isInteger(injectFailureAt) || injectFailureAt < 1 ||
    injectFailureAt > maxChecks)
    throw new Error("QL-254 synthetic check interval 30–300 seconds, bounded count and injected failure required.");
  const states = ["SIMULATED_BASELINE_STOPPED", "SIMULATED_EPHEMERAL_START_NO_SERVICE"];
  for (let check = 1; check <= maxChecks; check++) {
    states.push(check === injectFailureAt ? "SIMULATED_HEALTH_FAILURE" : "SIMULATED_HEALTH_OK");
    if (check === injectFailureAt) break;
  }
  states.push("SIMULATED_KILL_SWITCH", "SIMULATED_KEY_REVOCATION", "SIMULATED_RESTORE_BASELINE",
    "SIMULATED_FINAL_STOPPED");
  return { simulation_only: true, no_network_or_windows_service: true,
    health_check_interval_seconds: healthCheckSeconds, trace: states,
    rollback_state: "SIMULATED_FINAL_STOPPED", owner_test_decision: "NOT_GIVEN",
    original_proof_trust: "NOT_VERIFIED", connection_state: "DISCONNECTED" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  if (args.includes("--help")) {
    process.stdout.write("QL-254: offline by default; --simulate-rollback (pure memory); --public-get --main <immutable-sha> or --source <A> --proof <B> (public GitHub only).\n");
  } else if (args.includes("--simulate-rollback")) {
    process.stdout.write(JSON.stringify(simulateQl254RelayRollback(), null, 2) + "\n");
  } else if (!args.includes("--public-get")) {
    process.stdout.write(JSON.stringify(ql254Offline(), null, 2) + "\n");
  } else {
    checkQl254HubReadiness({ mainSha: option("--main"), sourceSha: option("--source"),
      proofSha: option("--proof") })
      .then(result => process.stdout.write(JSON.stringify(result, null, 2) + "\n"))
      .catch(error => { process.stderr.write(`QL-254 public-only check failed closed: ${error.message}\n`);
        process.exitCode = 1; });
  }
}
