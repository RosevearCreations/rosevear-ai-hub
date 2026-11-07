import {useState} from "react";
import {parseAcceptance265,parsePrivateGet265,parseShutdown265,reviewCommsReceipt265,
  type PriorProof264,type PrivateGet265,type Shutdown265,type CrossDeviceAcceptance265} from "./commsReceipt265";
import {CommsAudit266Panel} from "./CommsAudit266Panel";

type Review=Awaited<ReturnType<typeof reviewCommsReceipt265>>;
export function CommsReceipt265Panel({prior}: {prior:PriorProof264|null}) {
  const [get,setGet]=useState<PrivateGet265|null>(null);
  const [shutdown,setShutdown]=useState<Shutdown265|null>(null);
  const [owners,setOwners]=useState<CrossDeviceAcceptance265|null>(null);
  const [error,setError]=useState("");
  const [result,setResult]=useState<{value:Review;token:string}|null>(null);
  const token=[get?.receiver_operator.signature_base64,shutdown?.independent_witness.signature_base64,
    owners?.owner.signature_base64,prior?.testRequest.receiver_operator.signature_base64,
    prior?.fieldDecision.owner.signature_base64,prior?.hostPin,prior?.receiverTlsPin].join("|");
  const current=Boolean(result && token===result.token && owners
    && Date.now()<=Date.parse(owners.expires_at));

  async function importFile<T>(file:File|undefined,parser:(text:string)=>T,set:(x:T)=>void) {
    setError("");setResult(null);
    if(!file) return;
    if(file.size>8000) {setError("Maximum private receipt size is 8 KB.");return;}
    try {set(parser(await file.text()));}
    catch(e) {setError(e instanceof Error?e.message:"Invalid signed TEST evidence.");}
  }
  async function verify() {
    if(!prior || !get || !shutdown || !owners) return;
    setError("");setResult(null);
    try {
      const value=await reviewCommsReceipt265(prior,get,shutdown,owners,
        new Date().toISOString().replace(/\.\d{3}Z$/,"Z"));
      setResult({value,token});
    } catch(e) {setError(e instanceof Error?e.message:"Cannot verify private TEST chain.");}
  }
  return <section aria-label="Build 265 first genuine Comms TEST receipt and receiver shutdown">
    <h4>Build 265 — First private GET, receiver shutdown and separate owner acceptance</h4>
    <p>After a real, separately authorized Comms private GET, import its original signed server receipt,
      the operator/Jack signed receiver-OFF and nonce-consumption record, and Ree/Jack's
      separate post-test review decision. No fixtures or browser-created receipts count as real evidence.</p>
    <p>Previous Build 264 chain: <strong>{prior?"Evidence supplied — its signatures and historical GET window will be rechecked":
      "HOLD — first supply genuine Build 263/264 evidence and independent fingerprints above"}</strong></p>
    <label>Actual private Comms GET response and signed audit receipt (JSON)
      <input type="file" accept=".json,application/json" onChange={e=>{setGet(null);
        void importFile(e.target.files?.[0],parsePrivateGet265,setGet);}} />
    </label>
    <label>Original receiver shutdown, revocation, consumed nonce and independent witness JSON
      <input type="file" accept=".json,application/json" onChange={e=>{setShutdown(null);
        void importFile(e.target.files?.[0],parseShutdown265,setShutdown);}} />
    </label>
    <label>Independent cross-device owner and Jack acceptance JSON
      <input type="file" accept=".json,application/json" onChange={e=>{setOwners(null);
        void importFile(e.target.files?.[0],parseAcceptance265,setOwners);}} />
    </label>
    <button type="button" disabled={!prior||!get||!shutdown||!owners}
      onClick={()=>void verify()}>Verify signed private GET, shutdown and owners offline</button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Private Comms GET</span><strong>{current&&result?.value.verifiedGetCandidate
        ? "Signed response candidate" : "NOT INDEPENDENTLY VERIFIED"}</strong></div>
      <div><span>Receiver shutdown / nonce</span><strong>{current&&result?.value.shutdownCandidate
        ? "Signed OFF candidate" : "OFF PROOF HOLD"}</strong></div>
      <div><span>Ree and Jack acceptance</span><strong>{current&&result?.value.crossDeviceCandidate
        ? "Signed review candidate" : "INDEPENDENT ACCEPTANCE HOLD"}</strong></div>
      <div><span>Actual Comms connection</span><strong>DISCONNECTED / HOLD</strong></div>
    </div>
    {current&&result&&<div className="hub-update-next-step"><p>
      Cryptographic review: <strong>{result.value.state}</strong></p>
      <p>Actual live receiver identity, database nonce ledger, revocation and owner identities
        still need independent external readback; none are claimed by this browser.</p>
    </div>}
    <p><small>This panel only verifies uploaded bytes locally. It never sends a GET, activates
      the receiver, modifies Windows recovery, stores private keys, or sends customer/device commands.
      Signed candidate files do not by themselves change the real connection state.</small></p>
    <CommsAudit266Panel prior={prior} get={get} shutdown={shutdown} acceptance={owners} />
  </section>;
}
