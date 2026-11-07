import {describe,expect,it} from "vitest";
import {signedTruthFixture267,testSha268} from "./commsTruth267.fixture";
import {canonicalSignedOriginalSource267,canonicalSignedIndependentTrust267,
  canonicalSignedOwnerTrial267} from "./commsTruth267";
import {AUTHENTICATED_READBACK_268,SEPARATE_OWNER_GRANT_268,
  canonicalAuthenticated268,canonicalSignedAuthenticated268,canonicalOwnerGrant268,
  parseAuthenticated268,parseOwnerGrant268,reviewFirstGetSafety268,
  type AuthenticatedReadback268,type SeparateOwnerGrant268} from "./commsTrial268";

async function evidence() {
  const x=await signedTruthFixture267();
  const auth:AuthenticatedReadback268={schema:AUTHENTICATED_READBACK_268,
    release_sha:x.prior.expectedRelease,
    source_267_sha256:await testSha268(canonicalSignedOriginalSource267(x.source)),
    witness_267_sha256:await testSha268(canonicalSignedIndependentTrust267(x.witness)),
    owner_plan_267_sha256:await testSha268(canonicalSignedOwnerTrial267(x.trial)),
    original_host_binding_sha256:x.prior.hostPin,source_enrollment_sha256:x.source.source_enrollment_sha256,
    source_registry_row_sha256:x.source.source_registry_row_sha256,
    receiver_tls_pin_sha256:x.prior.receiverTlsPin,receiver_signer_pin_sha256:x.prior.receiverSignerPin,
    original_database_row_sha256:"f".repeat(64),private_tls_observation_sha256:"1".repeat(64),
    tailnet_acl_readback_sha256:"2".repeat(64),private_get_handler_contract_sha256:"3".repeat(64),
    readback_method:"AUTHENTICATED_ORIGINAL_HOST_READ_ONLY",proposed_method:"GET",
    proposed_path:"/api/integration/v1/health",receiver_state:"OFF",credential_state:"REVOKED",
    observed_at:"2026-11-07T03:37:00Z",
    receiver_operator:{public_key_raw_base64:x.keys.receiver_operator.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  auth.receiver_operator.signature_base64=await x.sign("receiver_operator",canonicalAuthenticated268(auth,"receiver_operator"));
  auth.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalAuthenticated268(auth,"independent_witness"));
  const grant:SeparateOwnerGrant268={schema:SEPARATE_OWNER_GRANT_268,release_sha:x.prior.expectedRelease,
    authenticated_readback_sha256:await testSha268(canonicalSignedAuthenticated268(auth)),
    owner_plan_267_sha256:auth.owner_plan_267_sha256,
    private_get_handler_contract_sha256:auth.private_get_handler_contract_sha256,
    source_enrollment_sha256:auth.source_enrollment_sha256,challenge_nonce:"e".repeat(32),
    signed_at:"2026-11-07T03:38:00Z",expires_at:"2026-11-07T03:45:00Z",
    decision:"OWNER_APPROVED_ONE_NONPRODUCTION_GET_PENDING_PRIVATE_OPERATOR_GATE",
    method:"GET",path:"/api/integration/v1/health",scope:"HEALTH_READ_ONLY_NONPRODUCTION",
    max_requests:1,nonce_state:"UNUSED",customer_communications_authorized:false,
    device_actions_authorized:false,database_writes_authorized:false,receiver_state:"OFF",
    connection_state:"DISCONNECTED / HOLD",
    owner:{public_key_raw_base64:x.keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:x.keys.independent_witness.publicKey,signature_base64:""}};
  grant.owner.signature_base64=await x.sign("owner",canonicalOwnerGrant268(grant,"owner"));
  grant.independent_witness.signature_base64=await x.sign("independent_witness",
    canonicalOwnerGrant268(grant,"independent_witness"));
  return {...x,auth,grant};
}
type Data=Awaited<ReturnType<typeof evidence>>;
const review=(x:Data,now="2026-11-07T03:40:00Z")=>reviewFirstGetSafety268(x.prior,x.get,
  x.shutdown,x.acceptance,x.audit,x.closure,x.decision,x.source,x.witness,x.trial,x.auth,x.grant,now);

describe("Build 268 first read-only Comms GET safety gate, without automatic network access",()=>{
  it("verifies synthetic signed candidates but cannot authorize or perform GET",async()=>{
    const x=await evidence();
    expect(parseAuthenticated268(JSON.stringify(x.auth)).proposed_method).toBe("GET");
    expect(parseOwnerGrant268(JSON.stringify(x.grant)).max_requests).toBe(1);
    const r=await review(x);
    expect(r.state).toBe("SIGNED_ONE_GET_OWNER_GRANT_CANDIDATE_PRIVATE_RECEIVER_HOLD");
    expect(r.authenticatedSourceCandidate).toBe(true);
    expect(r.independentOwnerGrantCandidate).toBe(true);
    expect(r.authenticated_original_host_externally_verified).toBe(false);
    expect(r.private_get_handler_deployed_verified).toBe(false);
    expect(r.separate_test_authorization_externally_verified).toBe(false);
    expect(r.single_use_nonce_ledger_externally_verified).toBe(false);
    expect(r.first_get_authorized).toBe(false);
    expect(r.first_get_executed).toBe(false);
    expect(r.receiver_activated).toBe(false);
    expect(r.comms_connected).toBe(false);
    expect(r.connection_state).toBe("DISCONNECTED / HOLD");
    expect(r.remote_requests).toBe(0);
  });
  it("rejects changed original host, receiver signer, TLS pin, deployed handler digest or forged witness",async()=>{
    const x=await evidence();
    for(const auth of [{...x.auth,original_host_binding_sha256:"4".repeat(64)},
      {...x.auth,source_registry_row_sha256:"4".repeat(64)},
      {...x.auth,receiver_tls_pin_sha256:"4".repeat(64)},
      {...x.auth,private_get_handler_contract_sha256:"4".repeat(64)},
      {...x.auth,source_267_sha256:"4".repeat(64)},
      {...x.auth,independent_witness:{...x.auth.receiver_operator}}])
      expect((await review({...x,auth})).independentOwnerGrantCandidate).toBe(false);
    expect((await review({...x,prior:{...x.prior,receiverSignerPin:"f".repeat(64)}})).authenticatedSourceCandidate).toBe(false);
  });
  it("rejects consumed nonce replay, expired grant, changed scope and owner identity",async()=>{
    const x=await evidence();
    expect((await review(x,"2026-11-07T03:45:01Z")).independentOwnerGrantCandidate).toBe(false);
    expect((await review({...x,grant:{...x.grant,challenge_nonce:x.prior.testRequest.challenge_nonce}})).independentOwnerGrantCandidate).toBe(false);
    expect((await review({...x,grant:{...x.grant,source_enrollment_sha256:"4".repeat(64)}})).independentOwnerGrantCandidate).toBe(false);
    expect((await review({...x,grant:{...x.grant,owner:{...x.grant.independent_witness}}})).independentOwnerGrantCandidate).toBe(false);
    for(const bad of [{...x.auth,receiver_state:"ON"},{...x.auth,proposed_method:"POST"},
      {...x.auth,private_key:"secret"},{...x.auth,proposed_path:"/private/ql339b/hub/heartbeat"}])
      expect(()=>parseAuthenticated268(JSON.stringify(bad))).toThrow();
    for(const bad of [{...x.grant,max_requests:2},{...x.grant,nonce_state:"CONSUMED"},
      {...x.grant,device_actions_authorized:true},{...x.grant,method:"POST"},
      {...x.grant,connection_state:"CONNECTED"},{...x.grant,secret:"no"}])
      expect(()=>parseOwnerGrant268(JSON.stringify(bad))).toThrow();
    const overbroad={...x.grant,customer_communications_authorized:true as false,
      owner:{...x.grant.owner},independent_witness:{...x.grant.independent_witness}};
    overbroad.owner.signature_base64=await x.sign("owner",canonicalOwnerGrant268(overbroad,"owner"));
    overbroad.independent_witness.signature_base64=await x.sign("independent_witness",
      canonicalOwnerGrant268(overbroad,"independent_witness"));
    expect((await review({...x,grant:overbroad})).independentOwnerGrantCandidate).toBe(false);
  });
  it("rejects missing original receipts even if latest signatures are syntactically valid",async()=>{
    const x=await evidence();
    const r=await reviewFirstGetSafety268(null,x.get,x.shutdown,x.acceptance,x.audit,x.closure,
      x.decision,x.source,x.witness,x.trial,x.auth,x.grant,"2026-11-07T03:40:00Z");
    expect(r.authenticatedSourceCandidate).toBe(false);
  });
});
