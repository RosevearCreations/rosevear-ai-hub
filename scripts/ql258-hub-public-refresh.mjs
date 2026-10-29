/** Build 186: opt-in PUBLIC GitHub source check. Never contacts gateway, Windows host, or secret store. */
import { fileURLToPath } from "node:url";
import { checkQl256SourceEvidence } from "./ql256-hub-source-custody.mjs";

const REPO = "RosevearCreations/rosevear-ai-hub";
const HEAD = `https://api.github.com/repos/${REPO}/branches/main`;
const SHA = /^[0-9a-f]{40}$/;
const HEADERS = Object.freeze({ "Accept": "application/vnd.github+json",
  "User-Agent": "rosevear-ai-hub-ql258-public-proof-refresh" });

async function getMainHead(get) {
  const r = await get(HEAD, { headers: HEADERS, redirect: "error" });
  if (!r || r.status !== 200) throw new Error("Current public main head unavailable.");
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > 128_000) throw new Error("Public main response oversized.");
  let obj;
  try { obj = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Public main response malformed."); }
  if (obj.name !== "main" || !SHA.test(obj.commit?.sha ?? ""))
    throw new Error("Public main response does not identify a valid SHA.");
  return obj.commit.sha;
}

export async function refreshQl258PublicProof({ sourceSha, get = fetch } = {}) {
  if (!SHA.test(sourceSha ?? "")) throw new Error("An immutable 40-character public source SHA is required.");
  const actualHead = await getMainHead(get);
  if (actualHead !== sourceSha) throw new Error("Requested source is not the current public main head; refresh SHA first.");
  const evidence = await checkQl256SourceEvidence({ sourceSha, get });
  if (evidence.source_ci_head_sha_match !== "VERIFIED_EXACT_MAIN_PUSH_CI")
    throw new Error("No completed GREEN exact main-push CI for this source.");
  if (await getMainHead(get) !== sourceSha)
    throw new Error("Main moved during public proof refresh; restart from new main SHA.");
  return { kind: "rosevear_ql258_public_proof_refresh", repository: REPO,
    observed_main_sha: sourceSha, source_ci: evidence.matching_source_green_ci_run_url,
    exact_immutable_path: `docs/integration/ql246-source-proof.json`,
    proof_http_status: evidence.proof_http_status_at_A,
    proof_observation: evidence.proof_http_status_at_A === 404 ?
      "ORIGINAL_PUBLIC_PROOF_MISSING_AT_CURRENT_MAIN" : "PUBLIC_FILE_PRESENT_BUT_UNTRUSTED_REVIEW_REQUIRED",
    raw_public_file_sha256: evidence.public_file_bytes_sha256_at_A,
    independent_pin_and_custody: "NOT_VERIFIED", genuine_signed_proof_B: "NOT_ACCEPTED",
    owner_test_authorization: "NOT_GIVEN", authenticated_gateway_GETs: "NOT_RUN",
    original_seven_denials: "NOT_VERIFIED", live_pilot_holds: 12,
    relay_installed_or_started: "NO", connection: "DISCONNECTED / HOLD" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--source");
  if (args.includes("--help")) process.stdout.write(
    "QL-258 public-only check: --public-get --source <current-40-character-main-SHA>. Offline default; no credential or private gateway access.\n");
  else if (!args.includes("--public-get")) process.stdout.write(JSON.stringify({
    public_source_check: "NOT_RUN_OFFLINE_DEFAULT", owner_ql258_handoff: "UNVERIFIED_SELF_REPORT_ONLY",
    original_proof_B: "NOT_ACCEPTED", owner_test_authorization: "NOT_GIVEN",
    relay_installed_or_started: "NO", connection: "DISCONNECTED / HOLD" }, null, 2) + "\n");
  else refreshQl258PublicProof({ sourceSha: i >= 0 ? args[i + 1] : undefined })
    .then(result => process.stdout.write(JSON.stringify(result, null, 2) + "\n"))
    .catch(error => { process.stderr.write(`QL-258 public source refresh unavailable: ${error.message}\n`);
      process.exitCode = 1; });
}
