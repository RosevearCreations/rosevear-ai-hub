import {describe,expect,it} from "vitest";
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
  parseOriginalSource267,parseIndependentTrust267,parseOwnerTrial267,reviewOriginalTruth267,
  type OriginalSourceTruth267,type IndependentTrust267,type OwnerTrial267} from "./commsTruth267";

const sha=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function synthetic() {
  const x=await signedCommsFixture265();
  const req=await sha(canonicalSignedRequest265(x.prior.testRequest));
  const accept=await sha(canonicalSignedAcceptance265(x.acceptance));
  const audit:ReceiverAudit266={schema:RECEIVER_AUDIT_266,release_sha:x.prior.expectedRelease,
    signed_request_sha256:req,get_receipt_sha256:await sha(canonicalSignedGet265(x.get)),
    shutdown_receipt_sha256:await sha(canonicalSignedShutdown265(x.shutdown)),acceptance_receipt_sha256:accept,
    audit_record_sha256:x.get.audit_record_sha256,nonce_ledger_sha256:x.shutdown.nonce_ledger_sha256,
    receiver_signer_pin_sha256:x.prior.receiverSignerPin,receiver_tls_pin_sha256:x.prior.receiverTlsPin,
    source_enrollment_sha256:"7".repeat(64),audit_snapshot_sha256:"8".repeat(64),
    revocation_ledger_sha256:"9".repeat(64),nonce_tombstone_sha256:"a".repeat(64),
    accepted_get_count:1,accepted_nonce_count:1,receiver_state:"OFF",credential_state:"REVOKED",
    nonce_state:"CONSUMED",observed_at:"2026-11-07T03:26:00Z",
    receiver_operator:{public_key_raw_base64:x.keys.receiver_operator.publicKey,signature_base64:""}};
  audit.receiver_operator.signature_base64=await x.sign("receiver_operator",canonicalReceiverAudit266(audit));
  const auditHash=await sha(canonicalSignedReceiverAudit266(audit));
  const closure:NonceClosure266={schema:NONCE_CLOSURE_266,audit_readback_sha256:auditHash,
    signed_request_sha256:req,challenge_nonce:x.prior.testRequest.challenge_nonce,
    source_enrollment_sha256:audit.source_enrollment_sha256,audit_snapshot_sha256:audit.audit_snapshot_sha256,
    revocation_ledger_sha256:audit.revocation_ledger_sha256,nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    accepted_get_count:1,accepted_nonce_count:1,duplicate_get_count:0,
    replay_guard:"CONSUMED_NONCE_DENY_REUSE",no_replay_get_sent:true,
    receiver_state:"OFF",credential_state:"REVOKED",independently_observed_at:"2026-11-07T03:27:00Z",
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  closure.independent_witness.signature_base64=await x.sign("independent_witness",canonicalNonceClosure266(closure));
  const nonceHash=await sha(canonicalSignedNonceClosure266(closure));
  const decision:OwnerTransition266={schema:OWNER_TRANSITION_266,release_sha:x.prior.expectedRelease,
    audit_readback_sha256:auditHash,nonce_closure_sha256:nonceHash,
    original_acceptance_sha256:accept,nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    source_enrollment_sha256:audit.source_enrollment_sha256,signed_at:"2026-11-07T03:29:00Z",
    expires_at:"2026-11-08T03:00:00Z",decision:"REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY",
    connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:x.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  decision.owner.signature_base64=await x.sign("owner",canonicalOwnerTransition266(decision,"owner"));
  decision.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalOwnerTransition266(decision,"independent_witness"));
  const ownerHash=await sha(canonicalSignedOwnerTransition266(decision));
  const source:OriginalSourceTruth267={schema:ORIGINAL_SOURCE_TRUTH_267,release_sha:x.prior.expectedRelease,
    original_host_binding_sha256:x.prior.hostPin,receiver_audit_266_sha256:auditHash,
    nonce_closure_266_sha256:nonceHash,owner_transition_266_sha256:ownerHash,
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
  const sourceHash=await sha(canonicalSignedOriginalSource267(source));
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
    independent_readback_sha256:await sha(canonicalSignedIndependentTrust267(witness)),
    owner_transition_266_sha256:ownerHash,source_enrollment_sha256:source.source_enrollment_sha256,
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
type Synthetic=Awaited<ReturnType<typeof synthetic>>;
const review=(x:Synthetic,now="2026-11-07T03:36:00Z")=>reviewOriginalTruth267(x.prior,x.get,
  x.shutdown,x.acceptance,x.audit,x.closure,x.decision,x.source,x.witness,x.trial,now);

describe("Build 267 original source-of-truth, independent trust and separately gated read-only planning",()=>{
  it("accepts only synthetic signed offline candidates, leaves actual Comms and TEST disconnected",async()=>{
    const x=await synthetic();
    expect(parseOriginalSource267(JSON.stringify(x.source)).query_mode).toBe("LOCAL_READ_ONLY");
    expect(parseIndependentTrust267(JSON.stringify(x.witness)).no_replay_get_sent).toBe(true);
    expect(parseOwnerTrial267(JSON.stringify(x.trial)).test_authorized).toBe(false);
    const result=await review(x);
    expect(result.state).toBe("SIGNED_ORIGINAL_TRUTH_INDEPENDENT_TRUST_AND_OWNER_TRIAL_CANDIDATE_EXTERNAL_HOLD");
    expect(result.originalSourceCandidate).toBe(true);
    expect(result.independentTrustCandidate).toBe(true);
    expect(result.ownerTrialCandidate).toBe(true);
    expect(result.original_receiver_source_of_truth_externally_verified).toBe(false);
    expect(result.independent_owner_trust_externally_verified).toBe(false);
    expect(result.separate_test_authorization_verified).toBe(false);
    expect(result.trial_authorized).toBe(false);
    expect(result.receiver_activated).toBe(false);
    expect(result.comms_connected).toBe(false);
    expect(result.connection_state).toBe("DISCONNECTED / HOLD");
    expect(result.remote_requests).toBe(0);
  });
  it("refuses tampered original DB, mismatched chain and untrusted host/receiver pins",async()=>{
    const x=await synthetic();
    for(const changed of [{...x.source,source_registry_row_sha256:"f".repeat(64)},
      {...x.source,receiver_tls_pin_sha256:"f".repeat(64)},
      {...x.source,owner_transition_266_sha256:"f".repeat(64)},
      {...x.source,source_enrollment_sha256:"f".repeat(64)},
      {...x.source,receiver_operator:{...x.source.receiver_operator,
        signature_base64:x.decision.owner.signature_base64}}])
      expect((await review({...x,source:changed})).originalSourceCandidate).toBe(false);
    expect((await review({...x,prior:{...x.prior,hostPin:"f".repeat(64)}})).originalSourceCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,duplicate_get_count:1 as 0}})).originalSourceCandidate).toBe(false);
  });
  it("refuses forged witness, different source row, replay, and stale cross-device readback",async()=>{
    const x=await synthetic();
    for(const changed of [{...x.witness,source_registry_row_sha256:"f".repeat(64)},
      {...x.witness,nonce_tombstone_sha256:"f".repeat(64)},
      {...x.witness,duplicate_get_count:1 as 0},
      {...x.witness,no_replay_get_sent:false as true},
      {...x.witness,observed_at:"2026-11-07T04:15:00Z"},
      {...x.witness,independent_witness:{...x.source.receiver_operator}}])
      expect((await review({...x,witness:changed})).independentTrustCandidate).toBe(false);
  });
  it("refuses overbroad signed trial, expired time window and missing original history",async()=>{
    const x=await synthetic();
    expect((await review(x,"2026-11-07T04:00:01Z")).ownerTrialCandidate).toBe(false);
    expect((await review({...x,trial:{...x.trial,source_readback_sha256:"f".repeat(64)}})).ownerTrialCandidate).toBe(false);
    expect((await review({...x,trial:{...x.trial,independent_witness:{...x.trial.owner}}})).ownerTrialCandidate).toBe(false);
    const overbroad={...x.trial,test_authorized:true as false,connection_state:"CONNECTED" as OwnerTrial267["connection_state"],
      owner:{...x.trial.owner},independent_witness:{...x.trial.independent_witness}};
    overbroad.owner.signature_base64=await x.sign("owner",canonicalOwnerTrial267(overbroad,"owner"));
    overbroad.independent_witness.signature_base64=await x.sign("independent_witness",
      canonicalOwnerTrial267(overbroad,"independent_witness"));
    expect((await review({...x,trial:overbroad})).ownerTrialCandidate).toBe(false);
    expect((await reviewOriginalTruth267(null,x.get,x.shutdown,x.acceptance,x.audit,x.closure,
      x.decision,x.source,x.witness,x.trial,"2026-11-07T03:36:00Z")).originalSourceCandidate).toBe(false);
    for(const invalid of [{...x.source,receiver_state:"ON"},{...x.source,accepted_get_count:2},
      {...x.source,private_key:"secret"},{...x.source,query_mode:"WRITE"}])
      expect(()=>parseOriginalSource267(JSON.stringify(invalid))).toThrow();
    for(const invalid of [{...x.witness,no_replay_get_sent:false},{...x.witness,receiver_state:"ON"},
      {...x.witness,duplicate_get_count:1},{...x.witness,secret:"not allowed"}])
      expect(()=>parseIndependentTrust267(JSON.stringify(invalid))).toThrow();
    for(const invalid of [{...x.trial,test_authorized:true},{...x.trial,connection_state:"CONNECTED"},
      {...x.trial,max_requests:2},{...x.trial,method:"POST"},{...x.trial,remote_requests:1}])
      expect(()=>parseOwnerTrial267(JSON.stringify(invalid))).toThrow();
  });
});
