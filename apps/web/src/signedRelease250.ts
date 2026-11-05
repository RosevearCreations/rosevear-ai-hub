export const SIGNED_250_SCHEMA = "rosevear-windows-installed-release-250/v1";
const sha = /^[0-9a-f]{40}$/;
const hexDigest = /^[0-9a-f]{64}$/;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type SignedInstalledRelease250 = {
  schema: typeof SIGNED_250_SCHEMA;
  release_sha: string;
  artifact_sha256: string;
  observed_at: string;
  signer_public_key_raw_base64: string;
  signature_base64: string;
};

export function parseSignedRelease250(content: string): SignedInstalledRelease250 {
  if (content.length > 8192) throw new Error("Signed receipt exceeds 8 KB.");
  let obj: unknown;
  try { obj = JSON.parse(content); } catch { throw new Error("Signed receipt is invalid JSON."); }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Signed receipt must be an object.");
  const v = obj as Record<string, unknown>;
  if (v.schema !== SIGNED_250_SCHEMA || typeof v.release_sha !== "string" || !sha.test(v.release_sha)
    || typeof v.artifact_sha256 !== "string" || !hexDigest.test(v.artifact_sha256)
    || typeof v.observed_at !== "string" || v.observed_at.length > 40 || !Number.isFinite(Date.parse(v.observed_at))
    || typeof v.signer_public_key_raw_base64 !== "string" || v.signer_public_key_raw_base64.length !== 44 || !base64.test(v.signer_public_key_raw_base64)
    || typeof v.signature_base64 !== "string" || v.signature_base64.length !== 88 || !base64.test(v.signature_base64))
    throw new Error("Signed receipt schema or fields are invalid.");
  return {schema: SIGNED_250_SCHEMA, release_sha: v.release_sha, artifact_sha256: v.artifact_sha256,
    observed_at: v.observed_at, signer_public_key_raw_base64: v.signer_public_key_raw_base64,
    signature_base64: v.signature_base64};
}

export function canonicalSignedRelease250(r: SignedInstalledRelease250) {
  return `${r.schema}\n${r.release_sha}\n${r.artifact_sha256}\n${r.observed_at}\n`;
}

function decode64(value: string) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

/** Public key fingerprint must be authenticated out of band. A signature is not process attestation. */
export async function verifySignedRelease250(receipt: SignedInstalledRelease250, trustedPublicKeySha256: string,
  expectedMainSha: string, now: string): Promise<{signature_valid: boolean; signer_pinned: boolean; source_matches: boolean; fresh: boolean; state: "SIGNED_SOURCE_CANDIDATE_ONLY" | "SIGNATURE_OR_CUSTODY_HOLD"; authorization: false}> {
  const bytes = decode64(receipt.signer_public_key_raw_base64);
  const signature = decode64(receipt.signature_base64);
  let signatureValid = false;
  try {
    const key = await crypto.subtle.importKey("raw", bytes, "Ed25519", false, ["verify"]);
    signatureValid = await crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(canonicalSignedRelease250(receipt)));
  } catch { signatureValid = false; }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const signerPinned = hexDigest.test(trustedPublicKeySha256) && digest === trustedPublicKeySha256;
  const sourceMatches = sha.test(expectedMainSha) && receipt.release_sha === expectedMainSha;
  const age = Date.parse(now) - Date.parse(receipt.observed_at);
  const fresh = Number.isFinite(age) && age >= 0 && age <= 24 * 3600 * 1000;
  return {signature_valid: signatureValid, signer_pinned: signerPinned, source_matches: sourceMatches, fresh,
    state: signatureValid && signerPinned && sourceMatches && fresh ? "SIGNED_SOURCE_CANDIDATE_ONLY" : "SIGNATURE_OR_CUSTODY_HOLD", authorization: false};
}

export function recoveryDecision250(taskAction: string | null, ownerChoice: "hold" | "inspect" | "supervised_recovery_review") {
  const drift = taskAction !== "expected_script_reported";
  return {decision: drift ? "TASK_ACTION_DRIFT_HOLD" : "OWNER_REVIEW_ONLY",
    owner_choice: ownerChoice, task_action_custody_reviewed: !drift,
    restart_allowed: false, rollback_allowed: false, task_modification_allowed: false,
    closure_authorized: false} as const;
}
