import {useEffect,useState} from "react";
import {parseAuthenticated268,parseOwnerGrant268,reviewFirstGetSafety268,
  type AuthenticatedReadback268,type SeparateOwnerGrant268} from "./commsTrial268";
import type {PriorProof264,PrivateGet265,Shutdown265,CrossDeviceAcceptance265} from "./commsReceipt265";
import type {ReceiverAudit266,NonceClosure266,OwnerTransition266} from "./commsAudit266";
import type {OriginalSourceTruth267,IndependentTrust267,OwnerTrial267} from "./commsTruth267";

type Props={prior:PriorProof264|null;get:PrivateGet265|null;shutdown:Shutdown265|null;
  acceptance:CrossDeviceAcceptance265|null;audit:ReceiverAudit266|null;
  closure:NonceClosure266|null;decision:OwnerTransition266|null;
  source:OriginalSourceTruth267|null;witness:IndependentTrust267|null;trial:OwnerTrial267|null};
type Review=Awaited<ReturnType<typeof reviewFirstGetSafety268>>;
export function CommsTrial268Panel({prior,get,shutdown,acceptance,audit,closure,decision,
  source,witness,trial}:Props) {
  const [authenticated,setAuthenticated]=useState<AuthenticatedReadback268|null>(null);
  const [grant,setGrant]=useState<SeparateOwnerGrant268|null>(null);
  const [error,setError]=useState("");
  const [review,setReview]=useState<{value:Review;token:string}|null>(null);
  const token=JSON.stringify([prior,get,shutdown,acceptance,audit,closure,decision,source,witness,
    trial,authenticated,grant]);
  const valid=Boolean(review&&review.token===token&&grant&&Date.now()<=Date.parse(grant.expires_at));
  useEffect(()=>{
    if(!grant||!review) return;
    const timer=window.setTimeout(()=>setReview(null),Math.min(2147483647,
      Math.max(0,Date.parse(grant.expires_at)-Date.now()+5)));
    return ()=>window.clearTimeout(timer);
  },[grant,review]);
  const ready=Boolean(prior&&get&&shutdown&&acceptance&&audit&&closure&&decision&&source&&witness&&trial
    &&authenticated&&grant);
  async function importFile<T>(file:File|undefined,parser:(raw:string)=>T,setter:(x:T)=>void) {
    setError("");setReview(null);
    if(!file) return;
    if(file.size>14000) {setError("Original private receiver record exceeds 14 KB.");return;}
    try {setter(parser(await file.text()));}
    catch(e) {setError(e instanceof Error?e.message:"Invalid receiver trust evidence.");}
  }
  async function verify() {
    if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!decision||!source||!witness||!trial
      ||!authenticated||!grant) return;
    setError("");setReview(null);
    try {
      const value=await reviewFirstGetSafety268(prior,get,shutdown,acceptance,audit,closure,decision,
        source,witness,trial,authenticated,grant,new Date().toISOString().replace(/\.\d{3}Z$/,"Z"));
      setReview({value,token});
    } catch(e) {setError(e instanceof Error?e.message:"Read-only Comms trial preflight failed.");}
  }
  return <section aria-label="Build 268 authenticated original receiver and first read-only GET gate">
    <h4>Build 268 — Authenticated receiver review and separately approved single GET preflight</h4>
    <p>Before a live connection, the original private Comms operator must independently authenticate
      the original receiver, database enrollment, Tailnet route and installed GET handler. The
      historical QL-339B receiver accepts a signed heartbeat POST only; it is <strong>not</strong>
      proof that an authenticated health GET handler exists.</p>
    <p>Prior signed Build 267 chain: <strong>{prior&&get&&shutdown&&acceptance&&audit&&closure&&decision
      &&source&&witness&&trial?"Supplied for independent signature recheck":"MISSING / HOLD"}</strong></p>
    <label>Private receiver operator and Jack's independently signed authenticated readback (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setAuthenticated(null);
        void importFile(e.target.files?.[0],parseAuthenticated268,setAuthenticated);}} />
    </label>
    <label>Ree and Jack's separately signed, expiring one-GET owner candidate (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setGrant(null);
        void importFile(e.target.files?.[0],parseOwnerGrant268,setGrant);}} />
    </label>
    <button type="button" disabled={!ready} onClick={()=>void verify()}>
      Verify original receiver identity and one-GET safety gate offline
    </button>
    {error&&<p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Original private receiver</span><strong>{valid&&review?.value.authenticatedSourceCandidate
        ? "Signed readback candidate" : "ORIGINAL AUTHENTICATION HOLD"}</strong></div>
      <div><span>Independent owner decision</span><strong>{valid&&review?.value.independentOwnerGrantCandidate
        ? "Signed trial candidate" : "SEPARATE TRIAL GRANT HOLD"}</strong></div>
      <div><span>Deployed private GET handler and nonce ledger</span><strong>EXTERNAL PROOF REQUIRED</strong></div>
      <div><span>Live Comms connection</span><strong>DISCONNECTED / HOLD</strong></div>
    </div>
    {valid&&review&&<div className="hub-update-next-step">
      <p>Signed evidence result: <strong>{review.value.state}</strong></p>
      <p>STOP / HOLD: private receiver authentication, real deployed GET handler, source enrollment,
        unused nonce ledger, and separate original-host owner authorization must still be confirmed
        through independent, authenticated private channels. The client never executes the GET.</p>
    </div>}
    <p><small>Offline only: zero remote requests, no receiver activation, no automatic GET, POST,
      reconnect/replay, DB writes, devices or customer communication. Approval is scoped to a
      single nonproduction GET after a separate original-host operator safety check.</small></p>
  </section>;
}
