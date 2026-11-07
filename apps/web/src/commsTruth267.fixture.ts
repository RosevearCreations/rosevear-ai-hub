/** Test-only synthetic prior chain; no actual Comms credentials or trusted database rows. */
import {signedCommsFixture265} from "./commsReceipt265.fixture";
import {canonicalSignedRequest265,canonicalSignedGet265,canonicalSignedShutdown265,
  canonicalSignedAcceptance265} from "./commsReceipt265";
import {RECEIVER_AUDIT_266,NONCE_CLOSURE_266,OWNER_TRANSITION_266,
  canonicalReceiverAudit266,canonicalSignedReceiverAudit266,canonicalNonceClosure266,
  canonicalSignedNonceClosure266,canonicalOwnerTransition266,canonicalSignedOwnerTransition266,
  type ReceiverAudit266,type NonceClosure266,type OwnerTransition266} from "./commsAudit266";
import {ORIGINAL_SOURCE_TRUTH_267,INDEPENDENT_TRUST_267,READ_ONLY_TRIAL_267,
  canonicalOriginalSource267,canonicalSignedOriginalSource267,canonicalIndependentTrust267,
  canonicalSignedIndependentTrust267,canonicalOwnerTrial267,
  type OriginalSourceTruth267,type IndependentTrust267,type OwnerTrial267} from "./commsTruth267";

export const testSha268=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
export async function signedTruthFixture267() {
  const x=await signedCommsFixture265();
  const req=await testSha268(canonicalSignedRequest265(x.prior.testRequest));
  const acceptanceHash=await testSha268(canonicalSignedAcceptance265(x.acceptance));
  const audit:ReceiverAudit266={schema:RECEIVER_AUDIT_266,release_sha:x.prior.expectedRelease,
    signed_request_sha256:req,get_receipt_sha256:await testSha268(canonicalSignedGet265(x.get)),
    shutdown_receipt_sha256:await testSha268(canonicalSignedShutdown265(x.shutdown)),
    acceptance_receipt_sha256:acceptanceHash,audit_record_sha256:x.get.audit_record_sha256,
    nonce_ledger_sha256:x.shutdown.nonce_ledger_sha256,
    receiver_signer_pin_sha256:x.prior.receiverSignerPin,receiver_tls_pin_sha256:x.prior.receiverTlsPin,
    source_enrollment_sha256:"7".repeat(64),audit_snapshot_sha256:"8".repeat(64),
    revocation_ledger_sha256:"9".repeat(64),nonce_tombstone_sha256:"a".repeat(64),
    accepted_get_count:1,accepted_nonce_count:1,receiver_state:"OFF",credential_state:"REVOKED",
    nonce_state:"CONSUMED",observed_at:"2026-11-07T03:26:00Z",
    receiver_operator:{public_key_raw_base64:x.keys.receiver_operator.publicKey,signature_base64:""}};
  audit.receiver_operator.signature_base64=await x.sign("receiver_operator",canonicalReceiverAudit266(audit));
  const auditHash=await testSha268(canonicalSignedReceiverAudit266(audit));
  const closure:NonceClosure266={schema:NONCE_CLOSURE_266,audit_readback_sha256:auditHash,
    signed_request_sha256:req,challenge_nonce:x.prior.testRequest.challenge_nonce,
    source_enrollment_sha256:audit.source_enrollment_sha256,audit_snapshot_sha256:audit.audit_snapshot_sha256,
    revocation_ledger_sha256:audit.revocation_ledger_sha256,nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    accepted_get_count:1,accepted_nonce_count:1,duplicate_get_count:0,
    replay_guard:"CONSUMED_NONCE_DENY_REUSE",no_replay_get_sent:true,
    receiver_state:"OFF",credential_state:"REVOKED",independently_observed_at:"2026-11-07T03:27:00Z",
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  closure.independent_witness.signature_base64=await x.sign("independent_witness",canonicalNonceClosure266(closure));
  const nonceHash=await testSha268(canonicalSignedNonceClosure266(closure));
  const decision:OwnerTransition266={schema:OWNER_TRANSITION_266,release_sha:x.prior.expectedRelease,
    audit_readback_sha256:auditHash,nonce_closure_sha256:nonceHash,
    original_acceptance_sha256:acceptanceHash,nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    source_enrollment_sha256:audit.source_enrollment_sha256,signed_at:"2026-11-07T03:29:00Z",
    expires_at:"2026-11-08T03:00:00Z",decision:"REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY",
    connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:x.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  decision.owner.signature_base64=await x.sign("owner",canonicalOwnerTransition266(decision,"owner"));
  decision.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalOwnerTransition266(decision,"independent_witness"));
  const decisionHash=await testSha268(canonicalSignedOwnerTransition266(decision));
  const source:OriginalSourceTruth267={schema:ORIGINAL_SOURCE_TRUTH_267,release_sha:x.prior.expectedRelease,
    original_host_binding_sha256:x.prior.hostPin,receiver_audit_266_sha256:auditHash,
    nonce_closure_266_sha256:nonceHash,owner_transition_266_sha256:decisionHash,
    source_system:"rosevear-ai-hub",target:"rosevear-comms-hub",
    source_enrollment_sha256:audit.source_enrollment_sha256,source_registry_row_sha256:"b".repeat(64),
    audit_snapshot_sha256:audit.audit_snapshot_sha256,revocation_ledger_sha256:audit.revocation_ledger_sha256,
    nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    receiver_signer_pin_sha256:x.prior.receiverSignerPin,receiver_tls_pin_sha256:x.prior.receiverTlsPin,
    readback_query_sha256:"c".repeat(64),query_mode:"LOCAL_READ_ONLY",accepted_get_count:1,
    duplicate_get_count:0,nonce_state:"CONSUMED",credential_state:"REVOKED",receiver_state:"OFF",
    observed_at:"2026-11-07T03:31:00Z",
    receiver_operator:{public_key_raw_base64:x.keys.receiver_operator.publicKey,signature_base64:""}};
  source.receiver_operator.signature_base64=await x.sign("receiver_operator",canonicalOriginalSource267(source));
  const sourceHash=await testSha268(canonicalSignedOriginalSource267(source));
  const witness:IndependentTrust267={schema:INDEPENDENT_TRUST_267,source_readback_sha256:sourceHash,
    original_host_binding_sha256:source.original_host_binding_sha256,
    source_enrollment_sha256:source.source_enrollment_sha256,
    source_registry_row_sha256:source.source_registry_row_sha256,
    audit_snapshot_sha256:source.audit_snapshot_sha256,revocation_ledger_sha256:source.revocation_ledger_sha256,
    nonce_tombstone_sha256:source.nonce_tombstone_sha256,
    receiver_signer_pin_sha256:source.receiver_signer_pin_sha256,
    receiver_tls_pin_sha256:source.receiver_tls_pin_sha256,
    independent_channel_receipt_sha256:"d".repeat(64),readback_method:"INDEPENDENT_AUTHENTICATED_READ_ONLY",
    source_state:"ENROLLED_READ_ONLY_CANDIDATE",nonce_state:"CONSUMED",duplicate_get_count:0,
    no_replay_get_sent:true,receiver_state:"OFF",observed_at:"2026-11-07T03:33:00Z",
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  witness.independent_witness.signature_base64=await x.sign("independent_witness",canonicalIndependentTrust267(witness));
  const trial:OwnerTrial267={schema:READ_ONLY_TRIAL_267,release_sha:x.prior.expectedRelease,
    source_readback_sha256:sourceHash,
    independent_readback_sha256:await testSha268(canonicalSignedIndependentTrust267(witness)),
    owner_transition_266_sha256:decisionHash,source_enrollment_sha256:source.source_enrollment_sha256,
    nonce_tombstone_sha256:source.nonce_tombstone_sha256,signed_at:"2026-11-07T03:35:00Z",
    expires_at:"2026-11-07T04:00:00Z",
    decision:"ACCEPT_EVIDENCE_FOR_SEPARATE_READ_ONLY_TRIAL_PLANNING_ONLY",
    method:"GET",path:"/api/integration/v1/health",max_requests:1,test_authorized:false,
    receiver_state:"OFF",connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:x.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  trial.owner.signature_base64=await x.sign("owner",canonicalOwnerTrial267(trial,"owner"));
  trial.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalOwnerTrial267(trial,"independent_witness"));
  return {...x,audit,closure,decision,source,witness,trial};
}
