/** Build 181/QL-253: public GitHub preflight ONLY; never a trust registry or private runner. */
import { fileURLToPath } from "node:url";
import { checkQl252HubPublic } from "./ql252-hub-public-check.mjs";

export const QL253_HUB_REPO = "RosevearCreations/rosevear-ai-hub";
export const ql253NoNetwork = () => ({
  application_name: "rosevear-ai-hub", repository: QL253_HUB_REPO,
  source_sha_A: "NOT_AVAILABLE", source_ci_run_url: "NOT_AVAILABLE",
  proof_commit_sha_B: "NOT_AVAILABLE", immutable_public_proof_url: "NOT_AVAILABLE",
  exact_proof_bytes_sha256: "NOT_AVAILABLE", public_spki_sha256: "NOT_AVAILABLE",
  out_of_band_registry_snapshot_sha256: "NOT_AVAILABLE",
  out_of_band_registry_receipt_id: "NOT_AVAILABLE",
  out_of_band_custody_receipt_id: "NOT_AVAILABLE",
  distinct_independent_witness_receipt_id: "NOT_AVAILABLE",
  owner_test_decision: "NOT_GIVEN", owner_test_receipt_id: "NOT_AVAILABLE",
  real_health_and_capabilities_get_receipts: "NOT_RUN",
  original_seven_negative_denial_receipts: "NOT_VERIFIED",
  private_runner: "NOT_AUTHORIZED", relay_service: "NOT_INSTALLED_OR_AUTHORIZED",
  connection_state: "DISCONNECTED", status: "HELD",
  reason: "PUBLIC_GET_NOT_REQUESTED_NO_NETWORK",
});

export async function checkQl253HubReadiness({ mainSha, sourceSha, proofSha, get, now } = {}) {
  const publicResult = await checkQl252HubPublic({ mainSha, sourceSha, proofSha, get, now });
  return { ...ql253NoNetwork(), source_sha_A: publicResult.source_sha_A ?? "NOT_AVAILABLE",
    source_ci_run_url: publicResult.source_ci_run_url ?? "NOT_AVAILABLE",
    proof_commit_sha_B: publicResult.proof_commit_sha_B ?? "NOT_AVAILABLE",
    immutable_public_proof_url: publicResult.immutable_public_proof_url ?? "NOT_AVAILABLE",
    exact_proof_bytes_sha256: publicResult.exact_proof_bytes_sha256 ?? "NOT_AVAILABLE",
    public_spki_sha256: publicResult.public_spki_sha256 ?? "NOT_AVAILABLE",
    immutable_proof_http_status: publicResult.immutable_proof_http_status ?? "NOT_AVAILABLE",
    reason: publicResult.reason, public_signature_result: publicResult.public_signature_result ?? "NOT_VERIFIED",
    // A local Ed25519 public signature match is not independently pinned custody.
    out_of_band_registry_snapshot_sha256: "NOT_AVAILABLE",
    out_of_band_registry_receipt_id: "NOT_AVAILABLE",
    out_of_band_custody_receipt_id: "NOT_AVAILABLE",
    distinct_independent_witness_receipt_id: "NOT_AVAILABLE",
    owner_test_decision: "NOT_GIVEN", owner_test_receipt_id: "NOT_AVAILABLE",
    real_health_and_capabilities_get_receipts: "NOT_RUN",
    original_seven_negative_denial_receipts: "NOT_VERIFIED",
    private_runner: "NOT_AUTHORIZED", relay_service: "NOT_INSTALLED_OR_AUTHORIZED",
    connection_state: "DISCONNECTED", status: "HELD" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  if (args.includes("--help")) {
    process.stdout.write("QL-253 Hub: offline by default; --public-get --main <immutable-SHA> or --public-get --source <A> --proof <B>. No gateway/relay access.\n");
  } else if (!args.includes("--public-get")) {
    process.stdout.write(JSON.stringify(ql253NoNetwork(), null, 2) + "\n");
  } else {
    checkQl253HubReadiness({ mainSha: option("--main"), sourceSha: option("--source"),
      proofSha: option("--proof") })
      .then(result => process.stdout.write(JSON.stringify(result, null, 2) + "\n"))
      .catch(error => { process.stderr.write(`QL-253 public-only preflight failed closed: ${error.message}\n`);
        process.exitCode = 1; });
  }
}
