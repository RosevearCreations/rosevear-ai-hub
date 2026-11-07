import {describe,expect,it} from "vitest";
import {fixture} from "./commsReceipt265.fixture";
import {PRIVATE_GET_265,SHUTDOWN_265,OWNER_ACCEPTANCE_265,canonicalSignedRequest265,
  canonicalPrivateGet265,canonicalSignedGet265,canonicalShutdown265,
  canonicalSignedShutdown265,canonicalAcceptance265,parsePrivateGet265,parseShutdown265,
  parseAcceptance265,reviewCommsReceipt265,type PrivateGet265,type Shutdown265,
  type CrossDeviceAcceptance265} from "./commsReceipt265";

const hex=(x:Uint8Array)=>Array.from(x).map(n=>n.toString(16).padStart(2,"0")).join("");
const b64=(x:Uint8Array)=>btoa(String.fromCharCode(...x));
const digest=async (x:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x))));

async function signedFixture() {
  const prior=await fixture();
  const {testRequest,expectedRelease,receiverSignerPin,receiverTlsPin,stopPlanPin,hostPin}=prior.args;
  const sign=async(role:"issuer"|"owner"|"independent_witness"|"receiver_operator",message:string)=>(
    b64(new Uint8Array(await crypto.subtle.sign("Ed25519",prior.keys[role].pair.privateKey,
      new TextEncoder().encode(message)))));
  const get:PrivateGet265={schema:PRIVATE_GET_265,source_system:"rosevear-ai-hub",
    target:"rosevear-comms-hub",release_sha:expectedRelease,
    signed_request_sha256:await digest(canonicalSignedRequest265(testRequest)),
    challenge_nonce:testRequest.challenge_nonce,method:"GET",path:testRequest.path,
    http_status:200,response_body_sha256:"4".repeat(64),audit_record_sha256:"5".repeat(64),
    nonce_ledger_sha256:"6".repeat(64),receiver_signer_pin_sha256:receiverSignerPin,
    receiver_tls_pin_sha256:receiverTlsPin,received_at:"2026-11-07T03:20:00Z",
    receiver_operator:{public_key_raw_base64:prior.keys.receiver_operator.publicKey,signature_base64:""}};
  get.receiver_operator.signature_base64=await sign("receiver_operator",canonicalPrivateGet265(get));
  const shutdown:Shutdown265={schema:SHUTDOWN_265,
    signed_request_sha256:get.signed_request_sha256,
    get_receipt_sha256:await digest(canonicalSignedGet265(get)),
    nonce_ledger_sha256:get.nonce_ledger_sha256,stop_plan_sha256:stopPlanPin,
    receiver_state_after:"OFF",credentials_state:"REVOKED",nonce_state:"CONSUMED",
    audit_state:"DURABLE",shutdown_at:"2026-11-07T03:21:00Z",
    independent_checked_at:"2026-11-07T03:22:00Z",
    receiver_operator:{public_key_raw_base64:prior.keys.receiver_operator.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:prior.keys.independent_witness.publicKey,signature_base64:""}};
  shutdown.receiver_operator.signature_base64=await sign("receiver_operator",canonicalShutdown265(shutdown,"receiver_operator"));
  shutdown.independent_witness.signature_base64=await sign("independent_witness",canonicalShutdown265(shutdown,"independent_witness"));
  const acceptance:CrossDeviceAcceptance265={schema:OWNER_ACCEPTANCE_265,release_sha:expectedRelease,
    get_receipt_sha256:shutdown.get_receipt_sha256,
    shutdown_receipt_sha256:await digest(canonicalSignedShutdown265(shutdown)),
    original_host_candidate_sha256:hostPin,signed_at:"2026-11-07T03:23:00Z",
    expires_at:"2026-11-08T03:00:00Z",decision:"ACCEPT_SIGNED_TEST_EVIDENCE_FOR_REVIEW_ONLY",
    connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:prior.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:prior.keys.independent_witness.publicKey,signature_base64:""}};
  acceptance.owner.signature_base64=await sign("owner",canonicalAcceptance265(acceptance,"owner"));
  acceptance.independent_witness.signature_base64=await sign("independent_witness",canonicalAcceptance265(acceptance,"independent_witness"));
  return {prior:prior.args,get,shutdown,acceptance};
}

describe("Build 265 private GET and shutdown receipt chain",()=>{
  it("verifies true synthetic Ed25519 signatures end-to-end but never asserts a live connection",async()=>{
    const x=await signedFixture();
    expect(parsePrivateGet265(JSON.stringify(x.get)).http_status).toBe(200);
    expect(parseShutdown265(JSON.stringify(x.shutdown)).nonce_state).toBe("CONSUMED");
    expect(parseAcceptance265(JSON.stringify(x.acceptance)).connection_state).toBe("DISCONNECTED / HOLD");
    const result=await reviewCommsReceipt265(x.prior,x.get,x.shutdown,x.acceptance,"2026-11-07T03:25:00Z");
    expect(result.requestCandidate).toBe(true);
    expect(result.verifiedGetCandidate).toBe(true);
    expect(result.shutdownCandidate).toBe(true);
    expect(result.crossDeviceCandidate).toBe(true);
    expect(result.state).toBe("SIGNED_GET_SHUTDOWN_AND_OWNER_CANDIDATE_EXTERNAL_HOLD");
    expect(result.original_receiver_independently_authenticated).toBe(false);
    expect(result.actual_get_independently_verified).toBe(false);
    expect(result.shutdown_independently_verified).toBe(false);
    expect(result.owner_external_acceptance_verified).toBe(false);
    expect(result.test_authorized).toBe(false);
    expect(result.challenge_executed).toBe(false);
    expect(result.receiver_activated).toBe(false);
    expect(result.comms_connected).toBe(false);
    expect(result.remote_requests).toBe(0);
    // Retrospective signed-receipt review must remain possible after the old
    // ten-minute GET authorization expired; it never authorizes a fresh request.
    const historical=await reviewCommsReceipt265(x.prior,x.get,x.shutdown,x.acceptance,"2026-11-07T05:00:00Z");
    expect(historical.crossDeviceCandidate).toBe(true);
    expect(historical.test_authorized).toBe(false);
  });
  it("rejects tampered response body, mismatched nonce or unproven previous request",async()=>{
    const x=await signedFixture();
    const review=(change:Partial<typeof x>)=>reviewCommsReceipt265(change.prior??x.prior,
      change.get??x.get,change.shutdown??x.shutdown,change.acceptance??x.acceptance,"2026-11-07T03:25:00Z");
    expect((await review({get:{...x.get,response_body_sha256:"f".repeat(64)}})).verifiedGetCandidate).toBe(false);
    expect((await review({get:{...x.get,challenge_nonce:"b".repeat(32)}})).verifiedGetCandidate).toBe(false);
    expect((await review({get:{...x.get,received_at:"2026-11-07T03:30:00Z"}})).verifiedGetCandidate).toBe(false);
    expect((await review({prior:{...x.prior,receiverTlsPin:"f".repeat(64)}})).requestCandidate).toBe(false);
    expect((await review({get:{...x.get,receiver_operator:{...x.get.receiver_operator,
      public_key_raw_base64:x.acceptance.owner.public_key_raw_base64}}})).verifiedGetCandidate).toBe(false);
  });
  it("rejects fake shutdown, delayed independent witness, forged owner and stale acceptance",async()=>{
    const x=await signedFixture();
    const review=(shutdown=x.shutdown,acceptance=x.acceptance,now="2026-11-07T03:25:00Z")=>
      reviewCommsReceipt265(x.prior,x.get,shutdown,acceptance,now);
    expect((await review({...x.shutdown,nonce_ledger_sha256:"1".repeat(64)})).shutdownCandidate).toBe(false);
    expect((await review({...x.shutdown,independent_checked_at:"2026-11-07T03:30:00Z"})).shutdownCandidate).toBe(false);
    expect((await review(x.shutdown,{...x.acceptance,owner:{...x.acceptance.independent_witness}})).crossDeviceCandidate).toBe(false);
    expect((await review(x.shutdown,x.acceptance,"2026-11-09T03:25:00Z")).crossDeviceCandidate).toBe(false);
    expect((await review(x.shutdown,{...x.acceptance,original_host_candidate_sha256:"f".repeat(64)})).crossDeviceCandidate).toBe(false);
  });
  it("rejects claimed activation, missing revocation, expanded method and untrusted extra fields",async()=>{
    const x=await signedFixture();
    for(const changed of [{...x.get,http_status:201},{...x.get,method:"POST"},
      {...x.get,test_authorized:true},{...x.get,private_key:"do-not-import"}])
      expect(()=>parsePrivateGet265(JSON.stringify(changed))).toThrow();
    for(const changed of [{...x.shutdown,receiver_state_after:"ON"},
      {...x.shutdown,credentials_state:"ACTIVE"},{...x.shutdown,nonce_state:"UNUSED"},
      {...x.shutdown,audit_state:"UNKNOWN"},{...x.shutdown,receiver_activated:true}])
      expect(()=>parseShutdown265(JSON.stringify(changed))).toThrow();
    for(const changed of [{...x.acceptance,decision:"ENABLE_PRODUCTION"},
      {...x.acceptance,connection_state:"CONNECTED"},{...x.acceptance,owner_authorized:true}])
      expect(()=>parseAcceptance265(JSON.stringify(changed))).toThrow();
    expect((await reviewCommsReceipt265(null,x.get,x.shutdown,x.acceptance,"2026-11-07T03:25:00Z"))
      .crossDeviceCandidate).toBe(false);
  });
});
