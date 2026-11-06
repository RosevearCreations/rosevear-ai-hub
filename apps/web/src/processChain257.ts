export const CHAIN_257_SCHEMA = "rosevear-windows-process-chain-257/v1";
export const ISSUER_257_SCHEMA = "rosevear-windows-original-issuer-process-257/v1";
export const RECEIVER_OFF_257_SCHEMA = "rosevear-windows-receiver-off-257/v1";

const hex40 = /^[a-f0-9]{40}$/;
const hex64 = /^[a-f0-9]{64}$/;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
const kinds = ["generic_interpreter", "other_executable", "unverified"] as const;
const hints = ["checkout_path_in_listener_command", "checkout_path_in_ancestor_command",
  "no_checkout_reference_observed", "unverified"] as const;
const listeners = ["observed", "unverified"] as const;
const actions = ["expected_script_reported", "drift_or_unknown", "unverified"] as const;
const taskStates = ["enabled", "disabled", "missing"] as const;
type Kind = typeof kinds[number];
type Hint = typeof hints[number];
type Listener = typeof listeners[number];
type Action = typeof actions[number];
type TaskState = typeof taskStates[number];

export type ChainProcess257 = {
  listener: Listener; executable_kind: Kind; executable_sha256: string | null;
  source_hint: Hint; parent_hops_inspected: number; listener_stable: boolean;
  checkout_source_sha256: string | null;
};

export type WindowsChain257 = {
  schema: typeof CHAIN_257_SCHEMA; source: "on_device_read_only"; observed_at: string;
  checkout_sha_candidate: string | null; web: ChainProcess257; backend: ChainProcess257;
  recovery_action: Action; recovery_task_state: TaskState;
  original_issuer_signature_verified: false; receiver_off_signature_verified: false;
  process_attested: false; receiver_activated: false; comms_connected: false;
  changed_anything: false; remote_requests: 0;
};

export type IssuerProcessReceipt257 = {
  schema: typeof ISSUER_257_SCHEMA; release_sha: string; observed_at: string;
  canonical_observation_sha256: string; issuer_public_key_raw_base64: string; signature_base64: string;
};

export type ReceiverOffReceipt257 = {
  schema: typeof RECEIVER_OFF_257_SCHEMA; release_sha: string; observed_at: string;
  canonical_observation_sha256: string; receiver_port_listening: false;
  receiver_activated: false; owner_decision: "HOLD"; network_requests: 0;
  independent_public_key_raw_base64: string; signature_base64: string;
};

function object(text: string): Record<string, unknown> {
  if (text.length > 8192) throw new Error("Build 257 evidence exceeds 8 KB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid Build 257 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Build 257 evidence must be an object.");
  return value as Record<string, unknown>;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace("Z", ".000Z");
}

function enumValue<T extends readonly string[]>(possible: T, actual: unknown): actual is T[number] {
  return typeof actual === "string" && possible.includes(actual);
}

function process(x: unknown): ChainProcess257 {
  if (!x || typeof x !== "object" || Array.isArray(x)) throw new Error("Missing process chain.");
  const y = x as Record<string, unknown>;
  if (!enumValue(listeners, y.listener) || !enumValue(kinds, y.executable_kind)
    || !enumValue(hints, y.source_hint) || !Number.isInteger(y.parent_hops_inspected)
    || (y.parent_hops_inspected as number) < 0 || (y.parent_hops_inspected as number) > 4
    || typeof y.listener_stable !== "boolean"
    || (y.executable_sha256 !== null && !hex64.test(String(y.executable_sha256)))
    || (y.checkout_source_sha256 !== null && !hex64.test(String(y.checkout_source_sha256)))
    || (y.listener_stable && (y.listener !== "observed" || !y.executable_sha256 || y.executable_kind === "unverified"))
    || (!y.listener_stable && (y.executable_sha256 !== null || y.listener !== "unverified"
      || y.executable_kind !== "unverified" || y.source_hint !== "unverified")))
    throw new Error("Windows process-chain classification is invalid or contradictory.");
  return {listener: y.listener, executable_kind: y.executable_kind,
    executable_sha256: y.executable_sha256 as string | null, source_hint: y.source_hint,
    parent_hops_inspected: y.parent_hops_inspected as number, listener_stable: y.listener_stable,
    checkout_source_sha256: y.checkout_source_sha256 as string | null};
}

export function parseChain257(text: string): WindowsChain257 {
  const x = object(text);
  if (x.schema !== CHAIN_257_SCHEMA || x.source !== "on_device_read_only" || !validTime(x.observed_at)
    || (x.checkout_sha_candidate !== null && !hex40.test(String(x.checkout_sha_candidate)))
    || !enumValue(actions, x.recovery_action) || !enumValue(taskStates, x.recovery_task_state)
    || x.original_issuer_signature_verified !== false || x.receiver_off_signature_verified !== false
    || x.process_attested !== false || x.receiver_activated !== false || x.comms_connected !== false
    || x.changed_anything !== false || x.remote_requests !== 0)
    throw new Error("On-device observation schema or immutable HOLD flags are invalid.");
  return {schema: CHAIN_257_SCHEMA, source: "on_device_read_only", observed_at: x.observed_at,
    checkout_sha_candidate: x.checkout_sha_candidate as string | null, web: process(x.web), backend: process(x.backend),
    recovery_action: x.recovery_action, recovery_task_state: x.recovery_task_state,
    original_issuer_signature_verified: false, receiver_off_signature_verified: false,
    process_attested: false, receiver_activated: false, comms_connected: false,
    changed_anything: false, remote_requests: 0};
}

function signatureFields(x: Record<string, unknown>, key: string): boolean {
  return typeof x[key] === "string" && (x[key] as string).length === 44 && base64.test(x[key] as string)
    && typeof x.signature_base64 === "string" && x.signature_base64.length === 88 && base64.test(x.signature_base64);
}

export function parseIssuer257(text: string): IssuerProcessReceipt257 {
  const x = object(text);
  if (x.schema !== ISSUER_257_SCHEMA || !hex40.test(String(x.release_sha))
    || !validTime(x.observed_at) || !hex64.test(String(x.canonical_observation_sha256))
    || !signatureFields(x, "issuer_public_key_raw_base64")) throw new Error("Invalid original-issuer process receipt.");
  return {schema: ISSUER_257_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, canonical_observation_sha256: x.canonical_observation_sha256 as string,
    issuer_public_key_raw_base64: x.issuer_public_key_raw_base64 as string, signature_base64: x.signature_base64 as string};
}

export function parseReceiverOff257(text: string): ReceiverOffReceipt257 {
  const x = object(text);
  if (x.schema !== RECEIVER_OFF_257_SCHEMA || !hex40.test(String(x.release_sha))
    || !validTime(x.observed_at) || !hex64.test(String(x.canonical_observation_sha256))
    || x.receiver_port_listening !== false || x.receiver_activated !== false || x.owner_decision !== "HOLD"
    || x.network_requests !== 0 || !signatureFields(x, "independent_public_key_raw_base64"))
    throw new Error("Invalid independent receiver-OFF statement.");
  return {schema: RECEIVER_OFF_257_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, canonical_observation_sha256: x.canonical_observation_sha256 as string,
    receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: x.independent_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

// Canonical newline-terminated UTF-8, independent of JSON key order and locale.
export function canonicalChain257(x: WindowsChain257): string {
  const item = (p: ChainProcess257) => [p.listener, p.executable_kind, p.executable_sha256 ?? "",
    p.source_hint, String(p.parent_hops_inspected), String(p.listener_stable), p.checkout_source_sha256 ?? ""];
  return [x.schema, x.source, x.observed_at, x.checkout_sha_candidate ?? "", ...item(x.web), ...item(x.backend),
    x.recovery_action, x.recovery_task_state, "false", "false", "false", "false", "false", "false", "0", ""].join("\n");
}

export function canonicalIssuer257(x: IssuerProcessReceipt257): string {
  return [x.schema, x.release_sha, x.observed_at, x.canonical_observation_sha256, ""].join("\n");
}

export function canonicalReceiverOff257(x: ReceiverOffReceipt257): string {
  return [x.schema, x.release_sha, x.observed_at, x.canonical_observation_sha256,
    "false", "false", "HOLD", "0", ""].join("\n");
}

export async function digestChain257(chain: WindowsChain257): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalChain257(chain))));
  return Array.from(digest).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifySig(keyText: string, signatureText: string, message: string, fingerprint: string): Promise<boolean> {
  try {
    const keyBytes = Uint8Array.from(atob(keyText), char => char.charCodeAt(0));
    const signatureBytes = Uint8Array.from(atob(signatureText), char => char.charCodeAt(0));
    if (keyBytes.length !== 32 || signatureBytes.length !== 64) return false;
    const pin = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", keyBytes)))
      .map(byte => byte.toString(16).padStart(2, "0")).join("");
    if (!hex64.test(fingerprint) || fingerprint !== pin) return false;
    const key = await crypto.subtle.importKey("raw", keyBytes, "Ed25519", false, ["verify"]);
    return crypto.subtle.verify("Ed25519", key, signatureBytes, new TextEncoder().encode(message));
  } catch { return false; }
}

const fresh = (stamp: string, now: string) => {
  const age = Date.parse(now) - Date.parse(stamp);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 3600 * 1000;
};

export async function reviewChain257(chain: WindowsChain257 | null, issuer: IssuerProcessReceipt257 | null,
  receiver: ReceiverOffReceipt257 | null, trustedIssuerPublicKey: string | null, receiverPin: string,
  expectedSha: string, now: string) {
  const observationDigest = chain ? await digestChain257(chain) : null;
  const exactRelease = Boolean(chain && issuer && receiver && hex40.test(expectedSha)
    && chain.checkout_sha_candidate === expectedSha && issuer.release_sha === expectedSha && receiver.release_sha === expectedSha);
  const exactObservation = Boolean(chain && issuer && receiver && observationDigest
    && issuer.canonical_observation_sha256 === observationDigest
    && receiver.canonical_observation_sha256 === observationDigest && issuer.observed_at === chain.observed_at);
  const freshness = Boolean(chain && issuer && receiver && fresh(chain.observed_at, now)
    && fresh(issuer.observed_at, now) && fresh(receiver.observed_at, now));
  const sourceHints = Boolean(chain && chain.web.listener_stable && chain.backend.listener_stable
    && chain.web.checkout_source_sha256 && chain.backend.checkout_source_sha256
    && chain.web.source_hint.startsWith("checkout_path_in_") && chain.backend.source_hint.startsWith("checkout_path_in_")
    && chain.recovery_action === "expected_script_reported" && chain.recovery_task_state === "enabled");
  const issuerKeyMatched = Boolean(issuer && trustedIssuerPublicKey
    && issuer.issuer_public_key_raw_base64 === trustedIssuerPublicKey);
  const receiverSeparate = Boolean(receiver && trustedIssuerPublicKey
    && receiver.independent_public_key_raw_base64 !== trustedIssuerPublicKey);
  let issuerPin = "";
  if (issuerKeyMatched && trustedIssuerPublicKey) try {
    const bytes = Uint8Array.from(atob(trustedIssuerPublicKey), ch => ch.charCodeAt(0));
    issuerPin = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  } catch { /* Malformed custody key is never trusted. */ }
  const issuerSignature = Boolean(issuer && issuerKeyMatched && await verifySig(
    issuer.issuer_public_key_raw_base64, issuer.signature_base64, canonicalIssuer257(issuer), issuerPin));
  const receiverSignature = Boolean(receiver && receiverSeparate && await verifySig(
    receiver.independent_public_key_raw_base64, receiver.signature_base64,
    canonicalReceiverOff257(receiver), receiverPin));
  const signedCandidate = exactRelease && exactObservation && freshness && sourceHints && issuerSignature && receiverSignature;
  return {state: signedCandidate ? "DUAL_SIGNED_WINDOWS_CHAIN_CANDIDATE_ONLY" as const : "WINDOWS_CHAIN_EVIDENCE_HOLD" as const,
    exactRelease, exactObservation, freshness, sourceHints, issuerSignature, receiverSignature, receiverSeparate,
    observationDigest, process_attested: false as const, installed_release_attested: false as const,
    receiver_activated: false as const, comms_connected: false as const, remote_requests: 0 as const,
    decision: "INDEPENDENT_RECEIVER_OFF_OWNER_HOLD" as const,
    findings: ["Source-path mentions and file digests are candidates; they do not prove which code an interpreter loaded.",
      "Independent original-issuer signing and receiver-OFF witness must come from separately authenticated custodians.",
      "Owner decisions, private peer enrollment and a bounded TEST authorization remain separate and unapproved."]};
}
