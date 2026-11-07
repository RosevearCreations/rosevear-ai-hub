import {useEffect,useState} from "react";
import {parseReceiverAudit266,parseNonceClosure266,parseOwnerTransition266,
  reviewOriginalAudit266,type ReceiverAudit266,type NonceClosure266,type OwnerTransition266} from "./commsAudit266";
import type {PriorProof264,PrivateGet265,Shutdown265,CrossDeviceAcceptance265} from "./commsReceipt265";
import {CommsTruth267Panel} from "./CommsTruth267Panel";

type Review=Awaited<ReturnType<typeof reviewOriginalAudit266>>;
export function CommsAudit266Panel({prior,get,shutdown,acceptance}: {
  prior:PriorProof264|null;get:PrivateGet265|null;shutdown:Shutdown265|null;
  acceptance:CrossDeviceAcceptance265|null;
}) {
  const [audit,setAudit]=useState<ReceiverAudit266|null>(null);
  const [closure,setClosure]=useState<NonceClosure266|null>(null);
  const [owners,setOwners]=useState<OwnerTransition266|null>(null);
  const [error,setError]=useState("");
  const [review,setReview]=useState<{value:Review;token:string}|null>(null);
  // Include *every* changing original key, receipt and pin. An edited trusted pin
  // must immediately hide the earlier successful offline review.
  const token=JSON.stringify([prior?.expectedRelease,prior?.trustedOriginalKey,prior?.signerPins,
    prior?.receiverSignerPin,prior?.receiverTlsPin,prior?.stopPlanPin,prior?.hostPin,
    prior?.before,prior?.fieldObservation,prior?.runtime,prior?.fieldDecision,prior?.testRequest,
    get,shutdown,acceptance,audit,closure,owners]);
  const current=Boolean(review && review.token===token && owners
    && Date.now()<=Date.parse(owners.expires_at));
  // Rerender when acceptance expires even if the operator leaves the panel untouched.
  useEffect(()=>{
    if(!owners||!review) return;
    const delay=Math.max(0,Date.parse(owners.expires_at)-Date.now()+5);
    const timer=window.setTimeout(()=>setReview(null),Math.min(delay,2147483647));
    return ()=>window.clearTimeout(timer);
  },[owners,review]);
  const ready=Boolean(prior&&get&&shutdown&&acceptance&&audit&&closure&&owners);
  async function upload<T>(file:File|undefined,parse:(text:string)=>T,save:(x:T)=>void) {
    setError("");setReview(null);
    if(!file) return;
    if(file.size>10000) {setError("Maximum original-host evidence file size is 10 KB.");return;}
    try {save(parse(await file.text()));}
    catch(e) {setError(e instanceof Error?e.message:"Invalid private receiver evidence.");}
  }
  async function verify() {
    if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!owners) return;
    setError("");setReview(null);
    try {
      const value=await reviewOriginalAudit266(prior,get,shutdown,acceptance,audit,closure,owners,
        new Date().toISOString().replace(/\.\d{3}Z$/,"Z"));
      setReview({value,token});
    } catch(e) {setError(e instanceof Error?e.message:"Original-host readback could not be verified.");}
  }
  return <section aria-label="Build 266 private receiver audit and nonce replay closure">
    <h4>Build 266 — Original receiver audit, consumed nonce and owner-governed review</h4>
    <p>Only after a real Build 265 private TEST, bring independent records from the original
      Comms private host and Jack's separate device. This browser checks signed candidate
      evidence offline; it does not read the Comms database or attempt a second GET.</p>
    <p>Prior Build 265 evidence: <strong>{prior&&get&&shutdown&&acceptance
      ? "Supplied for full cryptographic recheck" : "MISSING / HOLD — supply original 263–265 receipts above"}</strong></p>
    <label>Original private receiver signed audit and source enrollment readback (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setAudit(null);
        void upload(e.target.files?.[0],parseReceiverAudit266,setAudit);}} />
    </label>
    <label>Jack's independent signed consumed-nonce and replay-guard readback (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setClosure(null);
        void upload(e.target.files?.[0],parseNonceClosure266,setClosure);}} />
    </label>
    <label>Ree and Jack's separate, time-bound connection candidate decision (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setOwners(null);
        void upload(e.target.files?.[0],parseOwnerTransition266,setOwners);}} />
    </label>
    <button type="button" disabled={!ready} onClick={()=>void verify()}>
      Verify original Comms audit, nonce closure and owner decision offline
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Original receiver audit</span><strong>{current&&review?.value.auditCandidate
        ? "Signed audit candidate" : "ORIGINAL AUDIT HOLD"}</strong></div>
      <div><span>Independent nonce replay closure</span><strong>{current&&review?.value.nonceReplayClosureCandidate
        ? "Signed closure candidate" : "NONCE REPLAY HOLD"}</strong></div>
      <div><span>Ree and Jack transition review</span><strong>{current&&review?.value.ownerTransitionCandidate
        ? "Signed review candidate" : "OWNER DECISION HOLD"}</strong></div>
      <div><span>Connection state</span><strong>DISCONNECTED / HOLD</strong></div>
    </div>
    {current&&review&&<div className="hub-update-next-step">
      <p>Offline mathematical review: <strong>{review.value.state}</strong></p>
      <p>Independently authenticated original receiver and actual database source enrollment
        still require external trusted readback. Signed JSON alone cannot authorize CONNECTED.</p>
    </div>}
    <p><small>All uploads stay in browser memory. This panel sends zero remote requests,
      performs no replay GET, changes no Windows recovery task, stores no private credentials,
      and never enables app-to-app communication or device/customer actions.
      One GET and a consumed nonce remain the strict bounds.</small></p>
    <CommsTruth267Panel prior={prior} get={get} shutdown={shutdown} acceptance={acceptance}
      audit={audit} closure={closure} decision={owners} />
  </section>;
}
