/** Build 188 / QL-261: original owner receipt and public A→B readiness, never a custody certificate. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inspectQl261OwnerPacket } from "./ql261-hub-source-return.mjs";

const REPO = "RosevearCreations/rosevear-ai-hub";
const PATH = "docs/integration/ql246-source-proof.json";
const SHA = /^[0-9a-f]{40}$/;
const HEADERS = Object.freeze({ Accept: "application/vnd.github+json",
  "User-Agent": "rosevear-ai-hub-build188-public-lineage" });
const HELD = Object.freeze({
  signer_existence: "SIGNER_STATUS_UNKNOWN",
  private_custodian: "NOT_INDEPENDENTLY_AUTHENTICATED",
  separate_nonce_witness: "NOT_INDEPENDENTLY_AUTHENTICATED",
  separate_reviewer: "NOT_INDEPENDENTLY_AUTHENTICATED",
  approved_persistent_private_store: "NOT_VERIFIED",
  independent_public_spki_pin: "NOT_VERIFIED_OUT_OF_BAND",
  genuine_source_proof: "NOT_ACCEPTED",
  owner_test_authorization: "NOT_GIVEN",
  authenticated_gateway_gets: "NOT_RUN",
  original_seven_denials: "NOT_VERIFIED",
  windows_mini_server_relay: "NOT_INSTALLED_OFF",
  integration: "DISCONNECTED / HOLD",
});

const digest = bytes => createHash("sha256").update(bytes).digest("hex");

/** The submitted owner original has a digest for byte-level comparison, not an authenticated identity. */
export function reconcileQl261HubOwnerPacket(raw) {
  if (raw === undefined) return {
    original_owner_packet: "NOT_PROVIDED",
    original_owner_packet_sha256: "NOT_AVAILABLE",
    owner_done_self_reports: 0,
    owner_report_trust: "NOT_AUTHENTICATED",
    ...HELD,
    next_specific_blocker: "PROVIDE_EXACT_SANITIZED_QL258_ORIGINAL_PACKET_THEN_PRIVATE_CUSTODY_REVIEW",
  };
  const inspected = inspectQl261OwnerPacket(raw);
  return {
    original_owner_packet: "RECEIVED_SCHEMA_VALID_SELF_REPORT_ONLY",
    original_owner_packet_sha256: digest(Buffer.from(raw, "utf8")),
    owner_done_self_reports: inspected.owner_reported_done_not_verified,
    historical_source_sha: inspected.sanitized_ql258_owner_packet.publicGitHubSnapshot.mainSha,
    owner_report_trust: "NOT_AUTHENTICATED",
    ...HELD,
    next_specific_blocker: "AUTHENTICATE_DISTINCT_PRIVATE_CUSTODIAN_WITNESS_REVIEWER_AND_APPROVED_STORE_OUT_OF_BAND",
  };
}

async function bounded(response, maxBytes, label) {
  if (!response || typeof response.status !== "number") throw new Error(`Missing ${label} HTTP response.`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > maxBytes) throw new Error(`${label} exceeds maximum allowed bytes.`);
  return data;
}

/** Only public GitHub reads. No current-main inference, private home network, or attestation upgrade. */
export async function inspectQl261SourceProofLineage({ sourceA, proofB, get = fetch } = {}) {
  if (!SHA.test(sourceA ?? "") || !SHA.test(proofB ?? "") || sourceA === proofB)
    throw new Error("Distinct immutable 40-character source A and proof B commits required.");
  const compareUrl = `https://api.github.com/repos/${REPO}/compare/${sourceA}...${proofB}`;
  const compareResponse = await get(compareUrl, { headers: HEADERS, redirect: "error" });
  if (compareResponse?.status !== 200) throw new Error("Public GitHub A→B comparison unavailable.");
  let compare;
  try { compare = JSON.parse((await bounded(compareResponse, 600_000, "GitHub comparison")).toString("utf8")); }
  catch { throw new Error("Public GitHub comparison malformed or oversized."); }
  if (compare.status !== "ahead" || compare.base_commit?.sha !== sourceA ||
    compare.merge_base_commit?.sha !== sourceA ||
    compare.ahead_by < 1 || compare.behind_by !== 0 ||
    compare.commits?.at(-1)?.sha !== proofB)
    throw new Error("Proof B is not independently shown as a strict descendant of audited source A.");

  const proofUrl = `https://raw.githubusercontent.com/${REPO}/${proofB}/${PATH}`;
  const proofResponse = await get(proofUrl, { headers: HEADERS, redirect: "error" });
  if (![200, 404].includes(proofResponse?.status)) throw new Error("Immutable original source proof not retrievable.");
  if (proofResponse.status === 404) return {
    source_sha_A: sourceA, proposed_proof_sha_B: proofB,
    independent_public_ancestry: "VERIFIED_DESCENDANT_ONLY",
    exact_proof_path: PATH, proof_http_status_at_B: 404,
    raw_public_proof_sha256: "NOT_AVAILABLE",
    proof_bytes_disposition: "MISSING_AT_IMMUTABLE_B",
    ...HELD,
  };
  const raw = await bounded(proofResponse, 32_768, "Original proof");
  let payload;
  try { payload = JSON.parse(raw.toString("utf8")); }
  catch { throw new Error("Original public proof JSON malformed."); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
    payload.payload?.source_revision !== sourceA ||
    payload.payload?.source_system !== "rosevear-ai-hub" ||
    payload.payload?.repository !== REPO ||
    payload.payload?.connection_state !== "DISCONNECTED" ||
    payload.payload?.owner_authorization !== "NOT_GIVEN" ||
    typeof payload.publicKeyPem !== "string" || typeof payload.signature !== "string")
    throw new Error("Original public proof source identity or HOLD assertions invalid.");
  return {
    source_sha_A: sourceA, proposed_proof_sha_B: proofB,
    independent_public_ancestry: "VERIFIED_DESCENDANT_ONLY",
    exact_proof_path: PATH, proof_http_status_at_B: 200,
    raw_public_proof_sha256: digest(raw),
    proof_bytes_disposition: "PUBLIC_BYTES_PRESENT_UNVERIFIED_SIGNATURE_PIN_AND_REVIEW",
    ...HELD,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const flags = ["--owner-packet", "--public-get", "--source-A", "--proof-B", "--help"];
  const unsafe = args.some(arg => arg.startsWith("--") && !flags.includes(arg)) ||
    ["--owner-packet", "--source-A", "--proof-B"].some(arg => args.includes(arg) &&
      (!option(arg) || option(arg).startsWith("--")));
  if (unsafe) { process.stderr.write("Unsupported or incomplete Build 188 option.\n"); process.exitCode = 1; }
  else if (args.includes("--help")) process.stdout.write(
    "Build 188 offline owner receipt: --owner-packet <actual-sanitized-json>. Opt-in public GitHub A→B only: --public-get --source-A <sha> --proof-B <sha>. Never provide private identity, secrets or home addresses.\n");
  else {
    try {
      const raw = option("--owner-packet") === undefined ? undefined :
        readFileSync(option("--owner-packet"), "utf8");
      const receipt = reconcileQl261HubOwnerPacket(raw);
      if (!args.includes("--public-get")) {
        if (args.includes("--source-A") || args.includes("--proof-B"))
          throw new Error("Public SHA inputs require explicit --public-get opt-in.");
        process.stdout.write(JSON.stringify({ ...receipt, public_source_check: "NOT_RUN_OFFLINE_DEFAULT" }, null, 2) + "\n");
      } else {
        inspectQl261SourceProofLineage({ sourceA: option("--source-A"), proofB: option("--proof-B") })
          .then(publicEvidence => process.stdout.write(JSON.stringify({ receipt, publicEvidence }, null, 2) + "\n"))
          .catch(() => { process.stderr.write("Build 188 public proof ancestry check failed closed.\n"); process.exitCode = 1; });
      }
    } catch { process.stderr.write("Build 188 owner receipt missing/unsafe; no trust or connection change.\n"); process.exitCode = 1; }
  }
}
