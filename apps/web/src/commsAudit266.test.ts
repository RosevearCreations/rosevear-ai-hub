import {describe,expect,it} from "vitest";
import {signedCommsFixture265} from "./commsReceipt265.fixture";
import {canonicalSignedRequest265,canonicalSignedGet265,canonicalSignedShutdown265,
  canonicalSignedAcceptance265} from "./commsReceipt265";
import {RECEIVER_AUDIT_266,NONCE_CLOSURE_266,OWNER_TRANSITION_266,
  canonicalReceiverAudit266,canonicalSignedReceiverAudit266,canonicalNonceClosure266,
  canonicalSignedNonceClosure266,canonicalOwnerTransition266,
  parseReceiverAudit266,parseNonceClosure266,parseOwnerTransition266,reviewOriginalAudit266,
  type ReceiverAudit266,type NonceClosure266,type OwnerTransition266} from "./commsAudit266";

const sha=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function data() {
  const x=await signedCommsFixture265();
  const signedRequest=await sha(canonicalSignedRequest265(x.prior.testRequest));
  const getHash=await sha(canonicalSignedGet265(x.get));
  const shutdownHash=await sha(canonicalSignedShutdown265(x.shutdown));
  const acceptanceHash=await sha(canonicalSignedAcceptance265(x.acceptance));
  const audit:ReceiverAudit266={schema:RECEIVER_AUDIT_266,release_sha:x.prior.expectedRelease,
    signed_request_sha256:signedRequest,get_receipt_sha256:getHash,
    shutdown_receipt_sha256:shutdownHash,acceptance_receipt_sha256:acceptanceHash,
    audit_record_sha256:x.get.audit_record_sha256,nonce_ledger_sha256:x.get.nonce_ledger_sha256,
    receiver_signer_pin_sha256:x.prior.receiverSignerPin,receiver_tls_pin_sha256:x.prior.receiverTlsPin,
    source_enrollment_sha256:"7".repeat(64),audit_snapshot_sha256:"8".repeat(64),
    revocation_ledger_sha256:"9".repeat(64),nonce_tombstone_sha256:"a".repeat(64),
    accepted_get_count:1,accepted_nonce_count:1,receiver_state:"OFF",credential_state:"REVOKED",
    nonce_state:"CONSUMED",observed_at:"2026-11-07T03:26:00Z",
    receiver_operator:{public_key_raw_base64:x.keys.receiver_operator.publicKey,signature_base64:""}};
  audit.receiver_operator.signature_base64=await x.sign("receiver_operator",canonicalReceiverAudit266(audit));
  const closure:NonceClosure266={schema:NONCE_CLOSURE_266,
    audit_readback_sha256:await sha(canonicalSignedReceiverAudit266(audit)),
    signed_request_sha256:signedRequest,challenge_nonce:x.prior.testRequest.challenge_nonce,
    source_enrollment_sha256:audit.source_enrollment_sha256,audit_snapshot_sha256:audit.audit_snapshot_sha256,
    revocation_ledger_sha256:audit.revocation_ledger_sha256,
    nonce_tombstone_sha256:audit.nonce_tombstone_sha256,accepted_get_count:1,
    accepted_nonce_count:1,duplicate_get_count:0,replay_guard:"CONSUMED_NONCE_DENY_REUSE",
    no_replay_get_sent:true,receiver_state:"OFF",credential_state:"REVOKED",
    independently_observed_at:"2026-11-07T03:27:00Z",
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  closure.independent_witness.signature_base64=await x.sign("independent_witness",canonicalNonceClosure266(closure));
  const decision:OwnerTransition266={schema:OWNER_TRANSITION_266,release_sha:x.prior.expectedRelease,
    audit_readback_sha256:closure.audit_readback_sha256,
    nonce_closure_sha256:await sha(canonicalSignedNonceClosure266(closure)),
    original_acceptance_sha256:acceptanceHash,nonce_tombstone_sha256:audit.nonce_tombstone_sha256,
    source_enrollment_sha256:audit.source_enrollment_sha256,signed_at:"2026-11-07T03:29:00Z",
    expires_at:"2026-11-08T03:00:00Z",decision:"REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY",
    connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:x.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  decision.owner.signature_base64=await x.sign("owner",canonicalOwnerTransition266(decision,"owner"));
  decision.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalOwnerTransition266(decision,"independent_witness"));
  return {...x,audit,closure,decision};
}
const review=(x:Awaited<ReturnType<typeof data>>,now="2026-11-07T03:30:00Z")=>
  reviewOriginalAudit266(x.prior,x.get,x.shutdown,x.acceptance,x.audit,x.closure,x.decision,now);

describe("Build 266 independent receiver audit, nonce replay closure and owner HOLD",()=>{
  it("validates synthetic historical original signed chain, but never claims the private connection",async()=>{
    const x=await data();
    expect(parseReceiverAudit266(JSON.stringify(x.audit)).accepted_get_count).toBe(1);
    expect(parseNonceClosure266(JSON.stringify(x.closure)).duplicate_get_count).toBe(0);
    expect(parseOwnerTransition266(JSON.stringify(x.decision)).connection_state).toBe("DISCONNECTED / HOLD");
    const r=await review(x);
    expect(r.state).toBe("SIGNED_AUDIT_NONCE_CLOSURE_AND_OWNER_CANDIDATE_EXTERNAL_HOLD");
    expect(r.auditCandidate).toBe(true);
    expect(r.independentReadbackCandidate).toBe(true);
    expect(r.nonceReplayClosureCandidate).toBe(true);
    expect(r.ownerTransitionCandidate).toBe(true);
    expect(r.original_receiver_audit_independently_verified).toBe(false);
    expect(r.source_enrollment_independently_verified).toBe(false);
    expect(r.nonce_ledger_independently_verified).toBe(false);
    expect(r.owner_external_authorization_verified).toBe(false);
    expect(r.connection_candidate_authorized).toBe(false);
    expect(r.receiver_activated).toBe(false);
    expect(r.comms_connected).toBe(false);
    expect(r.connection_state).toBe("DISCONNECTED / HOLD");
    expect(r.remote_requests).toBe(0);
  });
  it("refuses tampered audit anchors, forged signature, different host, and changed shutdown",async()=>{
    const x=await data();
    expect((await review({...x,audit:{...x.audit,audit_record_sha256:"f".repeat(64)}})).auditCandidate).toBe(false);
    expect((await review({...x,audit:{...x.audit,source_enrollment_sha256:"f".repeat(64)}})).auditCandidate).toBe(false);
    expect((await review({...x,audit:{...x.audit,receiver_tls_pin_sha256:"f".repeat(64)}})).auditCandidate).toBe(false);
    expect((await review({...x,audit:{...x.audit,receiver_operator:{...x.audit.receiver_operator,
      signature_base64:x.decision.owner.signature_base64}}})).auditCandidate).toBe(false);
    expect((await review({...x,shutdown:{...x.shutdown,nonce_ledger_sha256:"f".repeat(64)}})).auditCandidate).toBe(false);
    expect((await review({...x,prior:{...x.prior,hostPin:"f".repeat(64)}})).auditCandidate).toBe(false);
  });
  it("rejects replay count drift, missing tombstone, wrong witness and delayed readback",async()=>{
    const x=await data();
    expect((await review({...x,closure:{...x.closure,duplicate_get_count:1 as 0}})).nonceReplayClosureCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,no_replay_get_sent:false as true}})).nonceReplayClosureCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,nonce_tombstone_sha256:"f".repeat(64)}})).nonceReplayClosureCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,challenge_nonce:"b".repeat(32)}})).nonceReplayClosureCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,independent_witness:{...x.audit.receiver_operator}}})).nonceReplayClosureCandidate).toBe(false);
    expect((await review({...x,closure:{...x.closure,independently_observed_at:"2026-11-07T04:00:00Z"}})).nonceReplayClosureCandidate).toBe(false);
  });
  it("rejects tampered decisions, expired authority and attempts to authorize CONNECTED",async()=>{
    const x=await data();
    expect((await review({...x,decision:{...x.decision,nonce_closure_sha256:"f".repeat(64)}})).ownerTransitionCandidate).toBe(false);
    expect((await review({...x,decision:{...x.decision,owner:{...x.decision.independent_witness}}})).ownerTransitionCandidate).toBe(false);
    expect((await review(x,"2026-11-09T03:30:00Z")).ownerTransitionCandidate).toBe(false);
    expect((await review({...x,decision:{...x.decision,signed_at:"2026-11-08T04:00:00Z"}})).ownerTransitionCandidate).toBe(false);
    // Even a correctly signed owner document must be rejected if its *scope*
    // requests real connectivity rather than offline candidate review.
    const overbroad={...x.decision,decision:"ENABLE_COMMS" as OwnerTransition266["decision"],
      connection_state:"CONNECTED" as OwnerTransition266["connection_state"],
      owner:{...x.decision.owner},independent_witness:{...x.decision.independent_witness}};
    overbroad.owner.signature_base64=await x.sign("owner",canonicalOwnerTransition266(overbroad,"owner"));
    overbroad.independent_witness.signature_base64=await x.sign("independent_witness",
      canonicalOwnerTransition266(overbroad,"independent_witness"));
    expect((await review({...x,decision:overbroad})).ownerTransitionCandidate).toBe(false);
    for(const invalid of [{...x.audit,accepted_get_count:2},{...x.audit,receiver_state:"ON"},
      {...x.audit,credential_state:"ACTIVE"},{...x.audit,private_key:"must-not-import"}])
      expect(()=>parseReceiverAudit266(JSON.stringify(invalid))).toThrow();
    for(const invalid of [{...x.closure,duplicate_get_count:1},{...x.closure,no_replay_get_sent:false},
      {...x.closure,replay_guard:"TRY_REPLAY"},{...x.closure,receiver_state:"ON"}])
      expect(()=>parseNonceClosure266(JSON.stringify(invalid))).toThrow();
    for(const invalid of [{...x.decision,decision:"ENABLE_COMMS"},
      {...x.decision,connection_state:"CONNECTED"},{...x.decision,remote_requests:1}])
      expect(()=>parseOwnerTransition266(JSON.stringify(invalid))).toThrow();
    const missing=await reviewOriginalAudit266(null,x.get,x.shutdown,x.acceptance,
      x.audit,x.closure,x.decision,"2026-11-07T03:30:00Z");
    expect(missing.ownerTransitionCandidate).toBe(false);
  });
});
