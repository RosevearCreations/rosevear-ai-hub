/** QL-256: evidence from real PUBLIC source CI, never a private key/custody assertion. */
import { createHash, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "RosevearCreations/rosevear-ai-hub";
const ROOT = "https://api.github.com/repos/RosevearCreations/rosevear-ai-hub";
const PROOF = "docs/integration/ql246-source-proof.json";
const SHA = /^[a-f0-9]{40}$/;
const HEADERS = Object.freeze({ Accept: "application/vnd.github+json",
  "User-Agent": "rosevear-ai-hub-ql256-public-source-audit" });
const SECRET_MARKER = /(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|USERNAME|API_KEY|ANON_KEY|PRIVATE_KEY|AUTH_KEY)/;
const SAFE_DEFAULT_NAMES = ["APP_NAME", "APP_ENV", "APP_HOST", "APP_PORT",
  "AUTH_COOKIE_SECURE", "AUTH_SESSION_HOURS", "MQTT_TLS", "MQTT_PORT",
  "GO2RTC_TIMEOUT_SECONDS", "OLLAMA_TIMEOUT_SECONDS"];

export const QL256_PUBLIC_SOURCE = Object.freeze({
  application_name: "Rosevear AI Hub", repository: REPO,
  source_sha_A: "NOT_AVAILABLE", matching_source_green_ci_run_url: "NOT_AVAILABLE",
  source_ci_head_sha_match: "NOT_VERIFIED", proof_commit_sha_B: "NOT_AVAILABLE",
  exact_raw_proof_sha256: "NOT_AVAILABLE", public_signer_spki_sha256: "NOT_AVAILABLE",
  signer_provisioning_decision: "SIGNER_STATUS_UNKNOWN",
  private_registry_snapshot_sha256: "NOT_AVAILABLE",
  independent_registry_custody_receipt_id: "NOT_AVAILABLE",
  separate_witness_receipt_id: "NOT_AVAILABLE",
  independent_witness_real_world_identity_verified: "NOT_VERIFIED",
  owner_test_decision: "NOT_GIVEN", owner_test_receipt_id: "NOT_AVAILABLE",
  genuine_gateway_get_receipts: "NOT_RUN", original_seven_denials: "NOT_VERIFIED",
  service_account_and_rollback: "PROPOSAL_ONLY", relay_installed_or_started: "NO",
  connection_state: "DISCONNECTED", integration_status: "HOLD",
});

/** Read ONLY the checked-in example. Never read .env, process.env or a private store. */
export function inventoryPublicTemplate(contents) {
  if (typeof contents !== "string" || contents.length > 30_000)
    throw new Error("Missing or oversized public .env.example template.");
  const variables = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (variables.has(key)) throw new Error("Duplicated key in public environment example.");
    variables.set(key, value);
  }
  const secret_placeholders = [...variables].filter(([name]) => SECRET_MARKER.test(name))
    .map(([name, value]) => ({ name, template_status: value === "" ? "BLANK_TEMPLATE_PLACEHOLDER" :
      "NONEMPTY_TEMPLATE_VALUE_SECURITY_REVIEW_REQUIRED" }));
  const public_defaults = SAFE_DEFAULT_NAMES.filter(name => variables.has(name))
    .map(name => ({ name, public_template_default: variables.get(name) }));
  return { template_source: ".env.example ONLY; not actual Windows configuration",
    public_defaults, secret_placeholders, actual_runtime_secret_status: "UNKNOWN_NOT_INSPECTED",
    source_ed25519_signer_key: "SIGNER_NOT_DETERMINABLE_FROM_PUBLIC_TEMPLATE",
    ql256_registry_and_witness_bindings: "PROPOSED_ONLY_NOT_CONFIGURED" };
}

/** Candidate public-key fingerprint only. Never signs, opens a private key, or asserts custody. */
export function fingerprintCandidatePublicSigner(contents) {
  if (typeof contents !== "string" || contents.length > 8192 ||
    !contents.includes("-----BEGIN PUBLIC KEY-----") || contents.includes("PRIVATE KEY"))
    throw new Error("Only a short PEM-encoded public SPKI is accepted (no private key).");
  let key;
  try { key = createPublicKey(contents); }
  catch { throw new Error("Invalid public signer key."); }
  if (key.asymmetricKeyType !== "ed25519") throw new Error("QL-256 requires Ed25519 public SPKI.");
  return { public_spki_sha256_candidate: createHash("sha256")
    .update(key.export({ format: "der", type: "spki" })).digest("hex"),
    key_type: "Ed25519", trust: "UNTRUSTED_CANDIDATE_PENDING_SEPARATELY_AUTHENTICATED_CUSTODIAN",
    signer_provisioning_decision: "SIGNER_STATUS_UNKNOWN",
    independent_witness_real_world_identity_verified: "NOT_VERIFIED" };
}

function metadataUrl(source) { return `${ROOT}/actions/runs?head_sha=${source}&per_page=100`; }
function proofUrl(source) { return `https://raw.githubusercontent.com/${REPO}/${source}/${PROOF}`; }
async function publicResponse(url, get) {
  const response = await get(url, { headers: HEADERS, redirect: "error" });
  if (!response || typeof response.status !== "number")
    throw new Error("Unusable public GitHub response.");
  if (response.status !== 200 && response.status !== 404)
    throw new Error(`Public GitHub HTTP ${response.status}; no evidence accepted.`);
  return response;
}

/** Authenticate nothing private; source CI is a public, exact-commit evidence check. */
export async function checkQl256SourceEvidence({ sourceSha, get = fetch } = {}) {
  if (!SHA.test(sourceSha ?? "")) throw new Error("Complete immutable 40-character source SHA A is required.");
  const ciResponse = await publicResponse(metadataUrl(sourceSha), get);
  if (ciResponse.status !== 200) throw new Error("Exact source CI metadata missing at public GitHub.");
  const raw = Buffer.from(await ciResponse.arrayBuffer());
  if (raw.byteLength > 1_000_000) throw new Error("Public CI metadata too large.");
  const metadata = JSON.parse(raw.toString("utf8"));
  const run = Array.isArray(metadata.workflow_runs) ? metadata.workflow_runs.find(item =>
    item.head_sha === sourceSha && item.head_branch === "main" && item.event === "push" &&
    item.status === "completed" && item.conclusion === "success" &&
    item.repository?.full_name === REPO && Number.isSafeInteger(item.id) && item.id > 0 &&
    item.html_url === `https://github.com/${REPO}/actions/runs/${item.id}`) : null;
  const proof = await publicResponse(proofUrl(sourceSha), get);
  const status = proof.status === 404 ? "HTTP_404_AT_EXACT_SOURCE_A" :
    "PUBLIC_FILE_PRESENT_AT_A_UNVERIFIED_NOT_PROOF_B";
  const digest = proof.status === 200 ? createHash("sha256")
    .update(Buffer.from(await proof.arrayBuffer())).digest("hex") : "NOT_AVAILABLE";
  return { ...QL256_PUBLIC_SOURCE, source_sha_A: sourceSha,
    matching_source_green_ci_run_url: run?.html_url ?? "NOT_AVAILABLE",
    source_ci_head_sha_match: run ? "VERIFIED_EXACT_MAIN_PUSH_CI" : "NOT_VERIFIED",
    observed_public_path_at_A: proofUrl(sourceSha), proof_http_status_at_A: proof.status,
    proof_path_observation: status, public_file_bytes_sha256_at_A: digest,
    next_concrete_blocker: run ? "PRIVATE_SIGNER_PROVISIONING_AND_INDEPENDENT_CUSTODIAN_ASSIGNMENT" :
      "OBTAIN_EXACT_MAIN_SOURCE_GREEN_CI_BEFORE_PRIVATE_SIGNER_REVIEW",
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  if (args.includes("--help")) {
    process.stdout.write("QL-256: offline redacted config inventory by default. --public-get --source <40-sha> checks only GitHub source CI and immutable proof path. --public-key-file <operator-approved PUBLIC PEM> prints an UNTRUSTED candidate SPKI fingerprint. No private signer, service or gateway inspection.\n");
  } else {
    const inventory = inventoryPublicTemplate(readFileSync(new URL("../.env.example", import.meta.url), "utf8"));
    if (args.includes("--public-key-file")) {
      try { process.stdout.write(JSON.stringify(fingerprintCandidatePublicSigner(
        readFileSync(option("--public-key-file"), "utf8")), null, 2) + "\n"); }
      catch (error) { process.stderr.write(`QL-256 public-only key inspection failed: ${error.message}\n`);
        process.exitCode = 1; }
    } else if (!args.includes("--public-get")) process.stdout.write(JSON.stringify({
      ...QL256_PUBLIC_SOURCE, public_config_inventory: inventory,
      source_check: "NOT_RUN_NO_NETWORK", next_concrete_blocker:
        "APPROVED_PRIVATE_SIGNER_CUSTODIAN_AND_INDEPENDENT_WITNESS_REQUIRED",
    }, null, 2) + "\n");
    else checkQl256SourceEvidence({ sourceSha: option("--source") })
      .then(result => process.stdout.write(JSON.stringify({ ...result, public_config_inventory: inventory }, null, 2) + "\n"))
      .catch(error => { process.stderr.write(`QL-256 exact public source check failed: ${error.message}\n`);
        process.exitCode = 1; });
  }
}
