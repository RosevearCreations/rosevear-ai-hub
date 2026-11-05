export const MANIFEST_253_SCHEMA = "rosevear-windows-artifact-kind-manifest-253/v1";
export const OBSERVATION_253_SCHEMA = "rosevear-windows-mapping-observation-253/v1";
export const WITNESS_253_SCHEMA = "rosevear-windows-mapping-witness-253/v1";
export const ARTIFACT_253_KIND = "web_index_html";
export const ARTIFACT_253_PATH = "apps/web/dist/index.html";

const sha40 = /^[0-9a-f]{40}$/;
const sha64 = /^[0-9a-f]{64}$/;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
const listenerValues = ["observed", "missing", "ambiguous", "process_unavailable"] as const;
const sourcePathValues = ["within_checkout", "outside_checkout", "unverified"] as const;
const postBootValues = ["after_boot", "before_boot", "unverified"] as const;
const actionValues = ["expected_script_reported", "drift_or_unknown", "unverified"] as const;

type Listener = typeof listenerValues[number];
type SourcePath = typeof sourcePathValues[number];
type PostBoot = typeof postBootValues[number];
type Action = typeof actionValues[number];
type ProcessObservation = {listener: Listener; source_path: SourcePath; post_boot: PostBoot};

export type ArtifactKindManifest253 = {
  schema: typeof MANIFEST_253_SCHEMA;
  release_sha: string;
  artifact_kind: typeof ARTIFACT_253_KIND;
  relative_path: typeof ARTIFACT_253_PATH;
  artifact_sha256: string;
  observed_at: string;
  signer_public_key_raw_base64: string;
  signature_base64: string;
};

export type WindowsMappingObservation253 = {
  schema: typeof OBSERVATION_253_SCHEMA;
  source: "on_device_read_only";
  observed_at: string;
  artifact_kind: typeof ARTIFACT_253_KIND;
  relative_path: typeof ARTIFACT_253_PATH;
  exists: boolean;
  sha256: string | null;
  web: ProcessObservation;
  backend: ProcessObservation;
  recovery_action: Action;
  witness_verified: false;
  process_attested: false;
  changes_made: false;
};

export type IndependentWitness253 = {
  schema: typeof WITNESS_253_SCHEMA;
  release_sha: string;
  artifact_kind: typeof ARTIFACT_253_KIND;
  relative_path: typeof ARTIFACT_253_PATH;
  artifact_sha256: string;
  observed_at: string;
  web_listener: Listener;
  backend_listener: Listener;
  web_source_path: SourcePath;
  backend_source_path: SourcePath;
  web_post_boot: PostBoot;
  backend_post_boot: PostBoot;
  recovery_action: Action;
  witness_public_key_raw_base64: string;
  signature_base64: string;
};

function objectFromJson(content: string, maxLength: number): Record<string, unknown> {
  if (content.length > maxLength) throw new Error(`Evidence exceeds ${maxLength / 1024} KB.`);
  let raw: unknown;
  try { raw = JSON.parse(content); } catch { throw new Error("Evidence is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Evidence must be a JSON object.");
  return raw as Record<string, unknown>;
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40
    && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value));
}

function keyAndSignature(x: Record<string, unknown>, keyName: string) {
  const key = x[keyName];
  return typeof key === "string" && key.length === 44 && base64.test(key)
    && typeof x.signature_base64 === "string" && x.signature_base64.length === 88
    && base64.test(x.signature_base64);
}

function processObservation(raw: unknown): ProcessObservation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Process observation is missing.");
  const item = raw as Record<string, unknown>;
  if (!listenerValues.includes(item.listener as Listener) || !sourcePathValues.includes(item.source_path as SourcePath)
    || !postBootValues.includes(item.post_boot as PostBoot)) throw new Error("Process observation fields are invalid.");
  return {listener: item.listener as Listener, source_path: item.source_path as SourcePath, post_boot: item.post_boot as PostBoot};
}

export function parseArtifactKindManifest253(content: string): ArtifactKindManifest253 {
  const x = objectFromJson(content, 8192);
  if (x.schema !== MANIFEST_253_SCHEMA || !sha40.test(String(x.release_sha))
    || x.artifact_kind !== ARTIFACT_253_KIND || x.relative_path !== ARTIFACT_253_PATH
    || !sha64.test(String(x.artifact_sha256)) || !timestamp(x.observed_at)
    || !keyAndSignature(x, "signer_public_key_raw_base64"))
    throw new Error("Signed artifact-kind manifest schema or fields are invalid.");
  return {schema: MANIFEST_253_SCHEMA, release_sha: x.release_sha as string, artifact_kind: ARTIFACT_253_KIND,
    relative_path: ARTIFACT_253_PATH, artifact_sha256: x.artifact_sha256 as string, observed_at: x.observed_at,
    signer_public_key_raw_base64: x.signer_public_key_raw_base64 as string, signature_base64: x.signature_base64 as string};
}

export function parseWindowsMappingObservation253(content: string): WindowsMappingObservation253 {
  const x = objectFromJson(content, 8192);
  if (x.schema !== OBSERVATION_253_SCHEMA || x.source !== "on_device_read_only"
    || x.artifact_kind !== ARTIFACT_253_KIND || x.relative_path !== ARTIFACT_253_PATH
    || !timestamp(x.observed_at) || typeof x.exists !== "boolean"
    || (x.exists && !sha64.test(String(x.sha256))) || (!x.exists && x.sha256 !== null)
    || !actionValues.includes(x.recovery_action as Action)
    || x.witness_verified !== false || x.process_attested !== false || x.changes_made !== false)
    throw new Error("Read-only Windows observation schema or verification flags are invalid.");
  return {schema: OBSERVATION_253_SCHEMA, source: "on_device_read_only", observed_at: x.observed_at,
    artifact_kind: ARTIFACT_253_KIND, relative_path: ARTIFACT_253_PATH, exists: x.exists,
    sha256: x.sha256 as string | null, web: processObservation(x.web), backend: processObservation(x.backend),
    recovery_action: x.recovery_action as Action, witness_verified: false, process_attested: false, changes_made: false};
}

export function parseIndependentWitness253(content: string): IndependentWitness253 {
  const x = objectFromJson(content, 8192);
  if (x.schema !== WITNESS_253_SCHEMA || !sha40.test(String(x.release_sha))
    || x.artifact_kind !== ARTIFACT_253_KIND || x.relative_path !== ARTIFACT_253_PATH
    || !sha64.test(String(x.artifact_sha256)) || !timestamp(x.observed_at)
    || !listenerValues.includes(x.web_listener as Listener) || !listenerValues.includes(x.backend_listener as Listener)
    || !sourcePathValues.includes(x.web_source_path as SourcePath) || !sourcePathValues.includes(x.backend_source_path as SourcePath)
    || !postBootValues.includes(x.web_post_boot as PostBoot) || !postBootValues.includes(x.backend_post_boot as PostBoot)
    || !actionValues.includes(x.recovery_action as Action) || !keyAndSignature(x, "witness_public_key_raw_base64"))
    throw new Error("Independent witness signature or mapping fields are invalid.");
  return {schema: WITNESS_253_SCHEMA, release_sha: x.release_sha as string, artifact_kind: ARTIFACT_253_KIND,
    relative_path: ARTIFACT_253_PATH, artifact_sha256: x.artifact_sha256 as string, observed_at: x.observed_at,
    web_listener: x.web_listener as Listener, backend_listener: x.backend_listener as Listener,
    web_source_path: x.web_source_path as SourcePath, backend_source_path: x.backend_source_path as SourcePath,
    web_post_boot: x.web_post_boot as PostBoot, backend_post_boot: x.backend_post_boot as PostBoot,
    recovery_action: x.recovery_action as Action,
    witness_public_key_raw_base64: x.witness_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

// Fixed newline-terminated UTF-8 messages. No JSON stringify or locale-specific field ordering.
export function canonicalManifest253(x: ArtifactKindManifest253): string {
  return [x.schema, x.release_sha, x.artifact_kind, x.relative_path, x.artifact_sha256, x.observed_at, ""].join("\n");
}

export function canonicalWitness253(x: IndependentWitness253): string {
  return [x.schema, x.release_sha, x.artifact_kind, x.relative_path, x.artifact_sha256, x.observed_at,
    x.web_listener, x.backend_listener, x.web_source_path, x.backend_source_path, x.web_post_boot,
    x.backend_post_boot, x.recovery_action, ""].join("\n");
}

function decode64(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Uint8Array.from(atob(value), character => character.charCodeAt(0)));
}

async function signatureCheck(keyText: string, signatureText: string, message: string, pin: string) {
  let signatureValid = false;
  let pinMatches = false;
  try {
    const publicKey = decode64(keyText);
    const signature = decode64(signatureText);
    if (publicKey.length !== 32 || signature.length !== 64) return {signatureValid, pinMatches};
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", publicKey)))
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    pinMatches = sha64.test(pin) && fingerprint === pin;
    const key = await crypto.subtle.importKey("raw", publicKey, "Ed25519", false, ["verify"]);
    signatureValid = await crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(message));
  } catch { /* Invalid public key or detached signature stays HOLD. */ }
  return {signatureValid, pinMatches};
}

function fresh(observedAt: string, now: string): boolean {
  const age = Date.parse(now) - Date.parse(observedAt);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 3600 * 1000;
}

export async function verifyArtifactKindManifest253(x: ArtifactKindManifest253, signerPin: string,
  expectedReleaseSha: string, signedReceiptArtifactSha256: string | null, signedReceiptSignerKey: string | null,
  signedReceiptObservedAt: string | null, signedReceiptVerified: boolean, now: string) {
  const sig = await signatureCheck(x.signer_public_key_raw_base64, x.signature_base64, canonicalManifest253(x), signerPin);
  const receiptFresh = Boolean(signedReceiptObservedAt && fresh(signedReceiptObservedAt, now));
  const receiptContinuous = Boolean(signedReceiptVerified && receiptFresh && signedReceiptSignerKey
    && x.signer_public_key_raw_base64 === signedReceiptSignerKey && signedReceiptArtifactSha256 === x.artifact_sha256);
  const sourceMatches = sha40.test(expectedReleaseSha) && x.release_sha === expectedReleaseSha;
  const isFresh = fresh(x.observed_at, now);
  const candidate = sig.signatureValid && sig.pinMatches && receiptContinuous && sourceMatches && isFresh;
  return {...sig, receiptContinuous, receiptFresh, sourceMatches, fresh: isFresh,
    state: candidate ? "SIGNED_ARTIFACT_KIND_CANDIDATE_ONLY" : "ARTIFACT_KIND_SIGNATURE_HOLD",
    authorized: false as const};
}

export async function verifyIndependentWitness253(x: IndependentWitness253, independentWitnessPin: string,
  manifestSignerPublicKey: string | null, now: string) {
  const sig = await signatureCheck(x.witness_public_key_raw_base64, x.signature_base64, canonicalWitness253(x), independentWitnessPin);
  const separateKey = Boolean(manifestSignerPublicKey && x.witness_public_key_raw_base64 !== manifestSignerPublicKey);
  const isFresh = fresh(x.observed_at, now);
  return {...sig, separateKey, fresh: isFresh,
    state: sig.signatureValid && sig.pinMatches && separateKey && isFresh
      ? "INDEPENDENT_SIGNATURE_CANDIDATE_ONLY" : "INDEPENDENT_WITNESS_HOLD",
    authorized: false as const};
}

export function assessSupervisedProcessReview253(
  expectedReleaseSha: string,
  signedReceiptArtifactSha256: string | null,
  observed: WindowsMappingObservation253 | null,
  manifest: ArtifactKindManifest253 | null,
  manifestVerified: boolean,
  witness: IndependentWitness253 | null,
  witnessVerified: boolean,
  now: string,
  ownerChoice: "hold" | "inspect" | "prepare_supervised_review",
) {
  const observedFresh = Boolean(observed && fresh(observed.observed_at, now));
  const digestMatches = Boolean(observed?.exists && observed.sha256 && manifest
    && observed.sha256 === manifest.artifact_sha256 && observed.sha256 === signedReceiptArtifactSha256);
  const witnessMatches = Boolean(witness && observed && manifest && witnessVerified && manifestVerified
    && witness.release_sha === expectedReleaseSha && manifest.release_sha === expectedReleaseSha
    && witness.artifact_sha256 === observed.sha256 && witness.artifact_sha256 === manifest.artifact_sha256
    && witness.observed_at === observed.observed_at
    && witness.web_listener === observed.web.listener && witness.backend_listener === observed.backend.listener
    && witness.web_source_path === observed.web.source_path && witness.backend_source_path === observed.backend.source_path
    && witness.web_post_boot === observed.web.post_boot && witness.backend_post_boot === observed.backend.post_boot
    && witness.recovery_action === observed.recovery_action);
  const processReadbackComplete = Boolean(observed
    && observed.web.listener === "observed" && observed.backend.listener === "observed"
    && observed.web.source_path === "within_checkout" && observed.backend.source_path === "within_checkout"
    && observed.web.post_boot === "after_boot" && observed.backend.post_boot === "after_boot"
    && observed.recovery_action === "expected_script_reported");
  const findings: string[] = [];
  if (!manifestVerified) findings.push("A signer-pinned artifact-kind manifest has not passed local verification.");
  if (!observed) findings.push("Import the current on-device, read-only Build 253 mapping observation.");
  if (!observedFresh) findings.push("The Windows observation is missing, stale or future-dated.");
  if (!digestMatches) findings.push("The named installed artifact hash is not bound to the signed release receipt.");
  if (!witnessVerified || !witnessMatches) findings.push("The independently signed witness report does not match the exact Windows observation.");
  if (!processReadbackComplete) findings.push("Process listeners, checkout paths, reboot correlation or recovery-task action remain incomplete.");
  findings.push("Even matching signatures and reported process classifications do not attest executable lineage, active release identity or physical device acceptance.");
  return {disposition: "SUPERVISED_PROCESS_ATTESTATION_HOLD" as const,
    owner_choice: ownerChoice, observed_fresh: observedFresh, digest_matches: digestMatches,
    independent_witness_matches: witnessMatches, process_readback_complete: processReadbackComplete,
    evidence_candidate_complete: Boolean(manifestVerified && observedFresh && digestMatches && witnessMatches && processReadbackComplete),
    findings, signer_enrolled: false as const, process_attested: false as const,
    restart_allowed: false as const, task_modification_allowed: false as const,
    rollback_allowed: false as const, recovery_authorized: false as const,
    production_installation_verified: false as const, owner_closure_authorized: false as const};
}
