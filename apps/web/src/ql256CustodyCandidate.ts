/** Build 184 local-only source signer custody candidate intake; never independent trust. */
export type SignerDecision = "SIGNER_STATUS_UNKNOWN" | "SIGNER_NOT_PROVISIONED" |
  "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED";
export const SIGNER_DECISIONS: readonly SignerDecision[] = ["SIGNER_STATUS_UNKNOWN",
  "SIGNER_NOT_PROVISIONED", "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED"];
export interface CustodyCandidateInput {
  signer_decision: SignerDecision;
  signer_key_id: string;
  public_spki_sha256: string;
  registry_snapshot_sha256: string;
  custodian_receipt_id: string;
  witness_receipt_id: string;
  reviewer_receipt_id: string;
}
export interface CustodyCandidate extends CustodyCandidateInput {
  recorded_at: string;
  evidence_class: "PRIVATE_OPERATOR_METADATA_CANDIDATE_ONLY";
  origin_authenticated_out_of_band: false;
  independently_witnessed: false;
  final_signed_proof_B: "NOT_AVAILABLE";
  original_gateway_denials: "NOT_VERIFIED";
  owner_test_decision: "NOT_GIVEN";
  relay_installed_or_started: "NO";
  connection_state: "DISCONNECTED";
}
export interface CustodyCandidateReceipt {
  kind: "rosevear_ql256_private_custody_candidate";
  schema_version: 1;
  source_sha_A: "b992fdf6a30c62ad627f561c3808f39d4bf6f816";
  source_ci_run_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40914482643";
  exported_at: string;
  independent_custody: "NOT_VERIFIED";
  owner_test_decision: "NOT_GIVEN";
  connection_state: "DISCONNECTED";
  candidates: CustodyCandidate[];
}
const digest = /^[0-9a-f]{64}$/;
const id = /^[a-zA-Z0-9_-]{8,80}$/;
const fields: (keyof CustodyCandidateInput)[] = ["signer_decision", "signer_key_id",
  "public_spki_sha256", "registry_snapshot_sha256", "custodian_receipt_id",
  "witness_receipt_id", "reviewer_receipt_id"];
const noteFields = [...fields, "recorded_at", "evidence_class", "origin_authenticated_out_of_band",
  "independently_witnessed", "final_signed_proof_B", "original_gateway_denials",
  "owner_test_decision", "relay_installed_or_started", "connection_state"];
function exactKeys(obj: unknown, keys: readonly string[]): boolean {
  return !!obj && typeof obj === "object" && !Array.isArray(obj) &&
    Object.keys(obj).length === keys.length && Object.keys(obj).every(k => keys.includes(k));
}
const validTime = (s: string) => typeof s === "string" && Number.isFinite(Date.parse(s)) &&
  /^20\d\d-\d\d-\d\dT/.test(s) && Date.parse(s) >= Date.parse("2020-01-01T00:00:00Z") &&
  Date.parse(s) <= Date.now() + 300_000;

export function recordCustodyCandidate(notes: readonly CustodyCandidate[], input: CustodyCandidateInput,
  operatorAcknowledged: boolean, holdAcknowledged: boolean,
  at = new Date().toISOString()): CustodyCandidate[] {
  if (notes.length >= 30 || !operatorAcknowledged || !holdAcknowledged)
    throw new Error("QL-256 requires explicit operator-candidate and separate HOLD acknowledgement.");
  if (!validTime(at)) throw new Error("QL-256 private candidate time invalid.");
  if (!exactKeys(input, fields)) throw new Error("QL-256 candidate metadata has missing or extra fields.");
  if (!SIGNER_DECISIONS.includes(input.signer_decision)) throw new Error("QL-256 signer decision invalid.");
  for (const key of fields.slice(1)) {
    const value = input[key];
    if (typeof value !== "string" || (key.includes("sha256") ? value !== "" && !digest.test(value) :
      value !== "" && !id.test(value)))
      throw new Error("QL-256 accepts only blank, opaque ID or 64-hex public digest metadata.");
  }
  const ids = [input.custodian_receipt_id, input.witness_receipt_id, input.reviewer_receipt_id]
    .filter(Boolean);
  if (new Set(ids).size !== ids.length)
    throw new Error("QL-256 separate custodian, witness and reviewer receipts cannot share IDs.");
  if (input.signer_decision === "SIGNER_NOT_PROVISIONED" &&
    (input.signer_key_id || input.public_spki_sha256))
    throw new Error("Unprovisioned signer cannot have a claimed active signing key ID/pin.");
  if (input.signer_decision === "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED" &&
    (!input.signer_key_id || !input.public_spki_sha256))
    throw new Error("A claimed existing signer requires an opaque key ID and public SPKI candidate.");
  if (notes.length && Date.parse(at) < Date.parse(notes[notes.length - 1].recorded_at))
    throw new Error("QL-256 private candidate chronology cannot go backwards.");
  const note: CustodyCandidate = { ...input, recorded_at: at,
    evidence_class: "PRIVATE_OPERATOR_METADATA_CANDIDATE_ONLY",
    origin_authenticated_out_of_band: false, independently_witnessed: false,
    final_signed_proof_B: "NOT_AVAILABLE", original_gateway_denials: "NOT_VERIFIED",
    owner_test_decision: "NOT_GIVEN", relay_installed_or_started: "NO",
    connection_state: "DISCONNECTED" };
  return [...notes, note];
}

export function createCustodyCandidateReceipt(notes: readonly CustodyCandidate[],
  at = new Date().toISOString()): CustodyCandidateReceipt {
  if (!validTime(at) || notes.length > 30) throw new Error("QL-256 export time/count invalid.");
  let previous = 0;
  const copied = notes.map(note => {
    if (!exactKeys(note, noteFields) || !validTime(note.recorded_at) ||
      Date.parse(note.recorded_at) < previous || Date.parse(note.recorded_at) > Date.parse(at) ||
      note.evidence_class !== "PRIVATE_OPERATOR_METADATA_CANDIDATE_ONLY" ||
      note.origin_authenticated_out_of_band !== false || note.independently_witnessed !== false ||
      note.final_signed_proof_B !== "NOT_AVAILABLE" || note.original_gateway_denials !== "NOT_VERIFIED" ||
      note.owner_test_decision !== "NOT_GIVEN" || note.relay_installed_or_started !== "NO" ||
      note.connection_state !== "DISCONNECTED")
      throw new Error("QL-256 imported claim cannot be promoted or altered.");
    const reconstructed = recordCustodyCandidate([], Object.fromEntries(fields.map(k => [k, note[k]])) as unknown as CustodyCandidateInput,
      true, true, note.recorded_at)[0];
    if (JSON.stringify(reconstructed) !== JSON.stringify(note))
      throw new Error("QL-256 candidate note is not the immutable original safe form.");
    previous = Date.parse(note.recorded_at);
    return { ...note };
  });
  return { kind: "rosevear_ql256_private_custody_candidate", schema_version: 1,
    source_sha_A: "b992fdf6a30c62ad627f561c3808f39d4bf6f816",
    source_ci_run_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40914482643",
    exported_at: at, independent_custody: "NOT_VERIFIED", owner_test_decision: "NOT_GIVEN",
    connection_state: "DISCONNECTED", candidates: copied };
}
