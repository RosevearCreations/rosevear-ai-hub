export const ARTIFACT_251_SCHEMA = "rosevear-windows-artifact-251/v1";
export type Artifact251 = {schema: typeof ARTIFACT_251_SCHEMA; observed_at: string; asset: "web_index_html"; exists: boolean; sha256: string | null; signer_authenticated: false; release_verified: false};
const hex64 = /^[0-9a-f]{64}$/;

export function importArtifact251(json: string): Artifact251 {
  if (json.length > 4096) throw new Error("Artifact evidence exceeds 4 KB.");
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Artifact evidence is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Artifact evidence must be an object.");
  const x = raw as Record<string, unknown>;
  if (x.schema !== ARTIFACT_251_SCHEMA || x.asset !== "web_index_html" || typeof x.exists !== "boolean"
    || x.signer_authenticated !== false || x.release_verified !== false || typeof x.observed_at !== "string"
    || x.observed_at.length > 40 || !Number.isFinite(Date.parse(x.observed_at))
    || (x.exists && (typeof x.sha256 !== "string" || !hex64.test(x.sha256)))
    || (!x.exists && x.sha256 !== null)) throw new Error("Artifact evidence schema is invalid.");
  return {schema: ARTIFACT_251_SCHEMA, observed_at: x.observed_at, asset: "web_index_html", exists: x.exists,
    sha256: x.sha256 as string | null, signer_authenticated: false, release_verified: false};
}

export function mapArtifact251(releaseSha: string, signedArtifactSha256: string | null,
  observed: Artifact251 | null, now: string, signerCandidateVerified: boolean, custodianAuthenticated: boolean) {
  const age = observed ? Date.parse(now) - Date.parse(observed.observed_at) : Infinity;
  const fresh = age >= 0 && age <= 24 * 3600 * 1000;
  const artifactMatches = Boolean(observed?.exists && signedArtifactSha256 && hex64.test(signedArtifactSha256)
    && observed.sha256 === signedArtifactSha256);
  const findings: string[] = [];
  if (!observed) findings.push("Import the local Windows artifact digest.");
  if (observed && !fresh) findings.push("The artifact digest is stale or future-dated.");
  if (!artifactMatches) findings.push("The installed web index digest has not matched the signed artifact digest.");
  if (!signerCandidateVerified) findings.push("The detached release signature has not been independently checked this session.");
  if (!custodianAuthenticated) findings.push("No separately authenticated signer custodian has enrolled this key.");
  findings.push("Matching index.html does not prove the backend process, all web assets, task action or device health.");
  return {schema: "rosevear-windows-artifact-custody-review-251/v1", release_sha: /^[a-f0-9]{40}$/.test(releaseSha) ? releaseSha : null,
    artifact_sha256: signedArtifactSha256 && hex64.test(signedArtifactSha256) ? signedArtifactSha256 : null,
    observed_at: observed?.observed_at ?? null, artifact_matches: artifactMatches, fresh,
    signer_candidate_verified: signerCandidateVerified, custodian_authenticated: custodianAuthenticated,
    disposition: "RECOVERY_RECEIPT_CUSTODY_HOLD", findings, enrollment_authorized: false,
    recovery_authorized: false, installation_verified: false} as const;
}
