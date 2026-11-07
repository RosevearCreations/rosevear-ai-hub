import {useEffect,useState} from "react";
import {parseOriginalSource267,parseIndependentTrust267,parseOwnerTrial267,reviewOriginalTruth267,
  type OriginalSourceTruth267,type IndependentTrust267,type OwnerTrial267} from "./commsTruth267";
import type {PriorProof264,PrivateGet265,Shutdown265,CrossDeviceAcceptance265} from "./commsReceipt265";
import type {ReceiverAudit266,NonceClosure266,OwnerTransition266} from "./commsAudit266";
import {CommsTrial268Panel} from "./CommsTrial268Panel";

type Review=Awaited<ReturnType<typeof reviewOriginalTruth267>>;
type Props={prior:PriorProof264|null;get:PrivateGet265|null;shutdown:Shutdown265|null;
  acceptance:CrossDeviceAcceptance265|null;audit:ReceiverAudit266|null;
  closure:NonceClosure266|null;decision:OwnerTransition266|null};
export function CommsTruth267Panel({prior,get,shutdown,acceptance,audit,closure,decision}:Props) {
  const [source,setSource]=useState<OriginalSourceTruth267|null>(null);
  const [witness,setWitness]=useState<IndependentTrust267|null>(null);
  const [trial,setTrial]=useState<OwnerTrial267|null>(null);
  const [error,setError]=useState("");
  const [review,setReview]=useState<{value:Review;token:string}|null>(null);
  const token=JSON.stringify([prior,get,shutdown,acceptance,audit,closure,decision,source,witness,trial]);
  const valid=Boolean(review&&review.token===token&&trial&&Date.now()<=Date.parse(trial.expires_at));
  useEffect(()=>{
    if(!trial||!review) return;
    const timer=window.setTimeout(()=>setReview(null),Math.min(2147483647,
      Math.max(0,Date.parse(trial.expires_at)-Date.now()+5)));
    return ()=>window.clearTimeout(timer);
  },[trial,review]);
  const ready=Boolean(prior&&get&&shutdown&&acceptance&&audit&&closure&&decision&&source&&witness&&trial);
  async function importFile<T>(file:File|undefined,parse:(text:string)=>T,save:(v:T)=>void) {
    setError("");setReview(null);
    if(!file) return;
    if(file.size>13000) {setError("Signed evidence exceeds 13 KB.");return;}
    try {save(parse(await file.text()));}
    catch(e) {setError(e instanceof Error?e.message:"Untrusted original private receiver record.");}
  }
  async function verify() {
    if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!decision||!source||!witness||!trial) return;
    setError("");setReview(null);
    try {
      const value=await reviewOriginalTruth267(prior,get,shutdown,acceptance,audit,closure,
        decision,source,witness,trial,new Date().toISOString().replace(/\.\d{3}Z$/,"Z"));
      setReview({value,token});
    } catch(e) {setError(e instanceof Error?e.message:"Independent trust readback could not be checked.");}
  }
  return <section aria-label="Build 267 original receiver source-of-truth and independent owner trust">
    <h4>Build 267 — Original source-of-truth, separate owner trust and read-only trial readiness</h4>
    <p>Use authenticated read-only observations from the original private receiver and Jack's independent
      device, following the genuine 263–266 signed receipt chain. Uploaded JSON is an offline claim:
      no browser upload can authenticate the real database or grant a live trial.</p>
    <p>Prior Build 266 records: <strong>{prior&&get&&shutdown&&acceptance&&audit&&closure&&decision
      ? "Supplied for complete signed-chain recheck" : "MISSING / HOLD — import genuine 263–266 records first"}</strong></p>
    <label>Original Comms private database source-of-truth readback (signed JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setSource(null);
        void importFile(e.target.files?.[0],parseOriginalSource267,setSource);}} />
    </label>
    <label>Jack's independent private readback and trust comparison (signed JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setWitness(null);
        void importFile(e.target.files?.[0],parseIndependentTrust267,setWitness);}} />
    </label>
    <label>Ree and Jack's separate, short-lived owner trial planning decision (signed JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setTrial(null);
        void importFile(e.target.files?.[0],parseOwnerTrial267,setTrial);}} />
    </label>
    <button type="button" disabled={!ready} onClick={()=>void verify()}>
      Verify private source, independent trust and owner trial scope offline
    </button>
    {error&&<p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Original database source</span><strong>{valid&&review?.value.originalSourceCandidate
        ? "Signed source candidate" : "ORIGINAL SOURCE HOLD"}</strong></div>
      <div><span>Jack's separate trust observation</span><strong>{valid&&review?.value.independentTrustCandidate
        ? "Signed witness candidate" : "INDEPENDENT TRUST HOLD"}</strong></div>
      <div><span>Owner-governed trial plan</span><strong>{valid&&review?.value.ownerTrialCandidate
        ? "Signed planning candidate" : "TRIAL AUTHORIZATION HOLD"}</strong></div>
      <div><span>Live Comms connection</span><strong>DISCONNECTED / HOLD</strong></div>
    </div>
    {valid&&review&&<div className="hub-update-next-step">
      <p>Offline signature-chain review: <strong>{review.value.state}</strong></p>
      <p>STOP / HOLD: external source-of-truth and owner trust acceptance require actual independently
        authenticated verification. A fresh separate live TEST authorization is still required.</p>
    </div>}
    <p><small>Zero remote requests. No replay GET, automatic receiver activation, credential handling,
      source writes, customer messages or device actions. Receiver OFF, credentials REVOKED,
      nonce CONSUMED; connection DISCONNECTED / HOLD even after valid mathematical signatures.</small></p>
    <CommsTrial268Panel prior={prior} get={get} shutdown={shutdown} acceptance={acceptance}
      audit={audit} closure={closure} decision={decision} source={source} witness={witness}
      trial={trial} />
  </section>;
}
