import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { canonicalQl263ReviewerPayload, inspectQl263ReviewerEnvelope,
  recheckQl263PublicProofB } from "./ql263-hub-reviewer-proof-gate.mjs";

const A = "a".repeat(40), B = "b".repeat(40);
const sha256 = x => createHash("sha256").update(x).digest("hex");
const REPO = "RosevearCreations/rosevear-ai-hub";
const originalRun=40988867033;

function publicReviewer(now) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicPem=publicKey.export({format:"pem",type:"spki"}).toString();
  const pin=sha256(publicKey.export({format:"der",type:"spki"}));
  const payload={schema_version:"rosevear.ql263.reviewer.v1",repository:REPO,source_system:"rosevear-ai-hub",
    source_sha_A:A,proof_commit_sha_B:B,
    source_ci_run_url:`https://github.com/${REPO}/actions/runs/${originalRun}`,
    reviewer_receipt_id:"np-reviewer9876",custodian_receipt_id:"np-custodian5678",
    witness_receipt_id:"np-witness12345",witness_spki_sha256:"a".repeat(64),
    source_signer_spki_sha256:"b".repeat(64),registry_snapshot_sha256:"c".repeat(64),
    challenge_sha256:"d".repeat(64),reviewer_decision:"HELD_PENDING_INDEPENDENT_TRUST",
    owner_test_authorization:"NOT_GIVEN",connection_state:"DISCONNECTED",
    issued_at:now-1000,expires_at:now+60_000};
  const signature=sign(null,canonicalQl263ReviewerPayload(payload),privateKey).toString("base64url");
  return {env:{payload,reviewerPublicKeyPem:publicPem,reviewerSignatureBase64url:signature},pin};
}

function response(content,status=200) {return new Response(status===404?"":JSON.stringify(content),{status});}
function fakePublic(getHead = () => B, proofStatus=404, proofOverride) {
  const requests=[];
  const metadata={workflow_runs:[{id:originalRun,head_sha:B,head_branch:"main",event:"push",status:"completed",conclusion:"success",repository:{full_name:REPO},html_url:`https://github.com/${REPO}/actions/runs/${originalRun}`}]};
  const comparison={status:"ahead",base_commit:{sha:A},merge_base_commit:{sha:A},ahead_by:1,behind_by:0,commits:[{sha:B}]};
  const raw=proofOverride??{publicKeyPem:"UNTRUSTED PUBLIC ONLY",signature:"NO_SIG_TRUST",
    payload:{source_revision:A,source_system:"rosevear-ai-hub",repository:REPO,connection_state:"DISCONNECTED",owner_authorization:"NOT_GIVEN"}};
  const get=async url=>{
    requests.push(url);
    if(url.includes("/branches/main"))return response({name:"main",commit:{sha:getHead(requests.length)}});
    if(url.includes("/actions/runs?"))return response(metadata);
    if(url.includes("/compare/"))return response(comparison);
    if(url.includes("raw.githubusercontent.com"))return response(raw,proofStatus);
    throw new Error("Unexpected public resource, private network prohibited");
  };
  return {get,requests};
}

test("missing real reviewer receipt never invents signer custody or source proof",()=>{
  assert.throws(()=>inspectQl263ReviewerEnvelope("{}",{auditedSourceA:A}),/short/);
});

test("ephemeral public reviewer signature math is valid but has no authenticated human or TEST consent",()=>{
  const now=Date.now(), {env,pin}=publicReviewer(now);
  const result=inspectQl263ReviewerEnvelope(JSON.stringify(env),{auditedSourceA:A,nowMs:now,expectedReviewerSpkiSha256:pin});
  assert.equal(result.signature_math,"LOCAL_ED25519_MATCH_ONLY");
  assert.equal(result.real_reviewer_authentication,"NOT_VERIFIED_OUT_OF_BAND");
  assert.equal(result.real_custodian_and_witness,"NOT_VERIFIED_OUT_OF_BAND");
  assert.equal(result.original_proof_B_accepted,"NO");
  assert.equal(result.connection,"DISCONNECTED / HOLD");
  assert.equal(result.private_relay,"NOT_INSTALLED_OFF");
});

test("reviewer receipt cannot self-approve, collide roles, embed private fields or reuse stale challenge",()=>{
  const now=Date.now(), {env,pin}=publicReviewer(now);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify(env),{auditedSourceA:B,nowMs:now}),/source/);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify(env),{auditedSourceA:A,nowMs:now+120_000}),/freshness/);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify(env),{auditedSourceA:A,nowMs:now,expectedReviewerSpkiSha256:"0".repeat(64)}),/pin/);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify({...env,homeAddress:"private"}),{auditedSourceA:A,nowMs:now}),/forbidden/);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify({...env,payload:{...env.payload,owner_test_authorization:"GIVEN"}}),{auditedSourceA:A,nowMs:now}),/HOLD/);
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify({...env,payload:{...env.payload,witness_receipt_id:env.payload.custodian_receipt_id}}),{auditedSourceA:A,nowMs:now}),/role/);
  const corrupt={...env,reviewerSignatureBase64url:"0".repeat(86)};
  assert.throws(()=>inspectQl263ReviewerEnvelope(JSON.stringify(corrupt),{auditedSourceA:A,nowMs:now}),/signature/);
  assert.equal(pin.length,64);
});

test("fresh immutable public main CI with absent original proof B remains HOLD",async()=>{
  const mock=fakePublic();
  const result=await recheckQl263PublicProofB({sourceA:A,proofB:B,get:mock.get});
  assert.equal(result.proof_presence,"MISSING_AT_CURRENT_MAIN");
  assert.equal(result.exact_proof_http_status,404);
  assert.equal(result.proof_B_accepted,"NO");
  assert.equal(result.connection,"DISCONNECTED / HOLD");
  assert.equal(result.exact_main_push_ci,`https://github.com/${REPO}/actions/runs/${originalRun}`);
  assert.equal(mock.requests.filter(x=>x.includes("/branches/main")).length,3);
  assert.equal(mock.requests.filter(x=>x.includes("raw.githubusercontent.com")).length,2);
  assert.ok(mock.requests.every(x=>x.startsWith("https://api.github.com/")||x.startsWith("https://raw.githubusercontent.com/")));
});

test("public 200 is only bytes, wrong source A/B, and moved main fail closed",async()=>{
  const present=fakePublic(()=>B,200);
  const x=await recheckQl263PublicProofB({sourceA:A,proofB:B,get:present.get});
  assert.equal(x.proof_presence,"PUBLIC_BYTES_ONLY_UNTRUSTED");
  assert.match(x.original_proof_raw_sha256,/^[a-f0-9]{64}$/);
  assert.equal(x.proof_B_accepted,"NO");
  await assert.rejects(recheckQl263PublicProofB({sourceA:A,proofB:A,get:async()=>{throw Error("should not call");}}),/Distinct/);
  const drift=fakePublic(num=>num>=6?"c".repeat(40):B,404);
  await assert.rejects(recheckQl263PublicProofB({sourceA:A,proofB:B,get:drift.get}),/Main moved/);
});
