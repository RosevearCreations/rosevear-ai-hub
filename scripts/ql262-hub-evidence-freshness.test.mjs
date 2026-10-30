import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { reviewQl262EvidenceFreshness, reviewQl262ProofBAcceptance } from "./ql262-hub-evidence-freshness.mjs";
import { canonicalQl246Payload, NEGATIVE_FIELDS } from "./ql246-source-proof-contract.mjs";
import { canonicalQl256WitnessPayload } from "./ql256-hub-witness-envelope.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const hash = data => createHash("sha256").update(data).digest("hex");
const sourceCI = "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40988867033";
const owner = () => ({
  release:"ql258-six-app-owner-custody-checklist-public-source-recheck-held-v1",
  system:"rosevear-ai-hub", repository:"rosevear-ai-hub",
  publicGitHubSnapshot:{observed:"29 October 2026",mainSha:"99d64047c49678733af762ff906f288ec3ee0bb8",requiredPath:"docs/integration/ql246-source-proof.json",httpStatusAtObservedSha:404},
  ownerReportedUnverifiedProgress:{privateCustodian:"OWNER_REPORTS_DONE_NOT_VERIFIED",independentWitness:"OWNER_REPORTS_DONE_NOT_VERIFIED",independentReviewer:"NOT_REPORTED",privateHost:"NOT_REPORTED",signerPresence:"NOT_REPORTED",outOfBandPin:"NOT_REPORTED",tenantIsolation:"NOT_APPLICABLE"},
  independentCustodyAuthenticated:false,sourceProofAccepted:false,ownerTestAuthorization:"NOT_GIVEN",authenticatedGatewayGets:0,connection:"DISCONNECTED",livePilotHolds:12,disposition:"OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD",
});
function witness(now) {
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const pem=publicKey.export({format:"pem",type:"spki"}).toString("utf8");
  const pin=hash(publicKey.export({format:"der",type:"spki"}));
  const payload={schema_version:"rosevear.ql256.witness.v1",repository:"RosevearCreations/rosevear-ai-hub",source_sha_A:A,source_ci_run_url:sourceCI,proof_commit_sha_B:B,business_id:"rosevear-ai-hub",tenant_id:null,signer_key_id:"np-keytest001",signer_spki_sha256:"a".repeat(64),registry_snapshot_sha256:"b".repeat(64),custody_receipt_id:"np-custody001",witness_receipt_id:"np-witness001",challenge_sha256:"c".repeat(64),issued_at:now-1000,expires_at:now+60_000};
  const signature=sign(null,canonicalQl256WitnessPayload(payload),privateKey).toString("base64url");
  return {raw:JSON.stringify({payload,witnessPublicKeyPem:pem,witnessSignatureBase64url:signature}),pin};
}
function syntheticQl246(now) {
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const pem=publicKey.export({format:"pem",type:"spki"}).toString("utf8");
  const pin=hash(publicKey.export({format:"der",type:"spki"}));
  const negatives=Object.fromEntries(NEGATIVE_FIELDS.map(k=>[k,true]));
  const payload={schema_version:"rosevear.integration.v1",source_system:"rosevear-ai-hub",repository:"RosevearCreations/rosevear-ai-hub",source_revision:A,challenge_id:"np-testchallenge",challenge_sha256:"f".repeat(64),business_id:"rosevear-ai-hub",tenant_id:null,environment:"nonproduction",ci_run_url:sourceCI,allowed_methods:["GET"],allowed_paths:["/api/integration/v1/health","/api/integration/v1/capabilities"],negative_tests:negatives,gateway_audit_receipt_id:null,health_receipt_id:null,capabilities_receipt_id:null,registered_key_id:null,owner_authorization:"NOT_GIVEN",connection_state:"DISCONNECTED",external_gateway_get_verified:false,durable_audit_verified:false,owner_identity_verified:false,issued_at:now-1000,expires_at:now+60_000};
  const signature=sign(null,canonicalQl246Payload(payload),privateKey).toString("base64url");
  const raw=Buffer.from(JSON.stringify({publicKeyPem:pem,payload,signature}));
  const digest=hash(raw);
  const obs={source_sha_A:A,proposed_proof_sha_B:B,independent_public_ancestry:"VERIFIED_DESCENDANT_ONLY",exact_proof_path:"docs/integration/ql246-source-proof.json",proof_http_status_at_B:200,raw_public_proof_sha256:digest,proof_bytes_disposition:"PUBLIC_BYTES_PRESENT_UNVERIFIED_SIGNATURE_PIN_AND_REVIEW",owner_test_authorization:"NOT_GIVEN",integration:"DISCONNECTED / HOLD"};
  const trusted={rawBytesSha256:digest,sourceRevision:A,proofPublicationRevision:B,challengeId:payload.challenge_id,challengeSha256:payload.challenge_sha256,ciRunUrl:sourceCI,independentlyWitnessedNegativeTests:NEGATIVE_FIELDS,nowMs:now,challengeIssuedAtMs:now-2000,outOfBandSpkiFingerprintSha256:pin};
  return {raw,obs,trusted};
}

test("no authentic owner/witness originals: no fresh receipt or custody decision",()=>{
  const x=reviewQl262EvidenceFreshness();
  assert.equal(x.owner_original_receipt,"NOT_PROVIDED");
  assert.equal(x.original_public_witness,"NOT_PROVIDED");
  assert.equal(x.owner_snapshot_freshness,"HISTORICAL_QL258_NOT_CURRENT_AUTHENTICATION");
  assert.equal(x.owner_test_authorization,"NOT_GIVEN");
  assert.equal(x.connection,"DISCONNECTED / HOLD");
});
test("owner packet is only a historical self-report, authentic digest mismatch fails",()=>{
  const raw=JSON.stringify(owner());
  const x=reviewQl262EvidenceFreshness({ownerPacketRaw:raw,expectedOwnerPacketSha256:hash(raw)});
  assert.equal(x.owner_original_receipt,"RECEIVED_SCHEMA_VALID_SELF_REPORT_ONLY");
  assert.equal(x.owner_digest_comparison,"BYTES_MATCH_SEPARATE_CLAIM_NOT_AUTHENTICATED");
  assert.equal(x.authenticated_custodian,"NOT_VERIFIED");
  assert.throws(()=>reviewQl262EvidenceFreshness({ownerPacketRaw:raw,expectedOwnerPacketSha256:"0".repeat(64)}),/digest comparison/);
  assert.throws(()=>reviewQl262EvidenceFreshness({expectedOwnerPacketSha256:hash(raw)}),/digest comparison/);
  const changed=owner();changed.ownerTestAuthorization="GIVEN";
  assert.throws(()=>reviewQl262EvidenceFreshness({ownerPacketRaw:JSON.stringify(changed)}));
});
test("synthetic live witness signature passes mathematics but not real role authentication",()=>{
  const now=Date.now(),w=witness(now);
  const x=reviewQl262EvidenceFreshness({witnessEnvelopeRaw:w.raw,auditedSourceA:A,nowMs:now,expectedWitnessSpkiSha256:w.pin});
  assert.equal(x.witness_time_window,"CURRENT_UP_TO_5_MINUTES_MATH_ONLY");
  assert.equal(x.witness_signature_math,"LOCAL_ED25519_MATCH_ONLY");
  assert.equal(x.authenticated_custodian,"NOT_VERIFIED");
  assert.equal(x.separate_nonce_witness_origin,"NOT_VERIFIED");
  assert.equal(x.proof_b_accepted,"NO");
  assert.throws(()=>reviewQl262EvidenceFreshness({witnessEnvelopeRaw:w.raw,auditedSourceA:B,nowMs:now}),/differs/);
  assert.throws(()=>reviewQl262EvidenceFreshness({witnessEnvelopeRaw:w.raw,auditedSourceA:A,nowMs:now+100_000}),/expiry|expired|freshness|invalid/i);
  assert.throws(()=>reviewQl262EvidenceFreshness({witnessEnvelopeRaw:w.raw,auditedSourceA:A,nowMs:now,expectedWitnessSpkiSha256:"0".repeat(64)}),/pin/);
});
test("404 never accepts bytes, public 200 without reviewer context remains untrusted",()=>{
  const none=reviewQl262ProofBAcceptance();assert.equal(none.proof_b_accepted,"NO");
  const p=syntheticQl246(Date.now());
  const missing={...p.obs,proof_http_status_at_B:404};
  assert.equal(reviewQl262ProofBAcceptance({publicObservation:missing}).public_proof,"HTTP_404_AT_IMMUTABLE_B");
  assert.throws(()=>reviewQl262ProofBAcceptance({publicObservation:missing,rawProofBytes:p.raw}));
  const unsigned=reviewQl262ProofBAcceptance({publicObservation:p.obs,rawProofBytes:p.raw});
  assert.equal(unsigned.cryptographic_result,"NOT_RUN_INDEPENDENT_REVIEW_MISSING");
  assert.equal(unsigned.proof_b_accepted,"NO");
  assert.throws(()=>reviewQl262ProofBAcceptance({publicObservation:p.obs,rawProofBytes:Buffer.from("altered")}));
});
test("even synthetic complete Ed25519 original proof math is metadata-only and HELD",()=>{
  const p=syntheticQl246(Date.now());
  const x=reviewQl262ProofBAcceptance({publicObservation:p.obs,rawProofBytes:p.raw,trustedReviewerContext:p.trusted});
  assert.equal(x.cryptographic_result,"OFFLINE_SIGNATURE_MATH_MATCH_METADATA_ONLY");
  assert.equal(x.proof_b_accepted,"NO");
  assert.equal(x.connection,"DISCONNECTED / HOLD");
  assert.equal(x.owner_test_authorization,"NOT_GIVEN");
  assert.throws(()=>reviewQl262ProofBAcceptance({publicObservation:p.obs,rawProofBytes:p.raw,trustedReviewerContext:{...p.trusted,outOfBandSpkiFingerprintSha256:"0".repeat(64)}}),/fingerprint/);
  assert.throws(()=>reviewQl262ProofBAcceptance({publicObservation:p.obs,rawProofBytes:p.raw,trustedReviewerContext:{...p.trusted,proofPublicationRevision:A}}),/do not match/);
});
