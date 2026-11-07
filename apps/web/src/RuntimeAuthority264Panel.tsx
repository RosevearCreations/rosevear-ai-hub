import {useState} from "react";
import {parseLauncherObservation263,parseSignedRuntime263,
  type LauncherObservation263,type SignedRuntime263} from "./launcherAcceptance263";
import {parseFieldDecision264,parseTestRequest264,parseWindowsField264,reviewRuntimeAuthority264,
  type FieldDecision264,type TestRequest264,type WindowsField264} from "./runtimeAuthority264";

type Review = Awaited<ReturnType<typeof reviewRuntimeAuthority264>>;
const isHash = (value: string) => /^[a-f0-9]{64}$/.test(value);

export function RuntimeAuthority264Panel({expectedSha,trustedIssuerKey}: {
  expectedSha: string; trustedIssuerKey: string | null;
}) {
  const [before,setBefore] = useState<LauncherObservation263 | null>(null);
  const [after,setAfter] = useState<WindowsField264 | null>(null);
  const [runtime,setRuntime] = useState<SignedRuntime263 | null>(null);
  const [field,setField] = useState<FieldDecision264 | null>(null);
  const [test,setTest] = useState<TestRequest264 | null>(null);
  const [pins,setPins] = useState({issuer:"",owner:"",independent_witness:"",
    receiver_operator:"",receiver_tls:"",stop_plan:"",host:""});
  const [error,setError] = useState("");
  const [review,setReview] = useState<{result:Review;token:string} | null>(null);
  const token = [before?.observed_at,after?.observed_at,runtime?.issuer.signature_base64,
    field?.owner.signature_base64,test?.receiver_operator.signature_base64,
    ...Object.values(pins),expectedSha,trustedIssuerKey].join("|");
  const current = Boolean(review && review.token === token
    && Date.now() <= Date.parse(test?.expires_at ?? ""));
  const ready = Boolean(before && after && runtime && field && test && trustedIssuerKey
    && Object.values(pins).every(value => isHash(value.trim().toLowerCase())));

  async function load<T>(file: File | undefined, parser:(s:string)=>T, update:(x:T)=>void) {
    setError("");setReview(null);
    if (!file) return;
    if (file.size > 24000) {setError("Evidence file cannot exceed 24 KB.");return;}
    try {update(parser(await file.text()));}
    catch (e) {setError(e instanceof Error ? e.message : "Could not read evidence JSON.");}
  }
  async function verify() {
    if (!before || !after || !runtime || !field || !test || !trustedIssuerKey) return;
    setError("");setReview(null);
    try {
      const result = await reviewRuntimeAuthority264({before,fieldObservation:after,
        runtime,fieldDecision:field,testRequest:test,expectedRelease:expectedSha,
        trustedOriginalKey:trustedIssuerKey,
        signerPins:{issuer:pins.issuer.trim().toLowerCase(),owner:pins.owner.trim().toLowerCase(),
          independent_witness:pins.independent_witness.trim().toLowerCase()},
        receiverSignerPin:pins.receiver_operator.trim().toLowerCase(),
        receiverTlsPin:pins.receiver_tls.trim().toLowerCase(),
        stopPlanPin:pins.stop_plan.trim().toLowerCase(),hostPin:pins.host.trim().toLowerCase(),
        now:new Date().toISOString().replace(/\.\d{3}Z$/, "Z")});
      setReview({result,token});
    } catch (e) {setError(e instanceof Error ? e.message : "Signature review failed.");}
  }
  const pinLabels = [
    ["issuer","Original issuer public-key SHA-256"],
    ["owner","Independent owner public-key SHA-256"],
    ["independent_witness","Jack's witness public-key SHA-256"],
    ["receiver_operator","Comms receiver operator public-key SHA-256"],
    ["receiver_tls","Private receiver TLS identity SHA-256"],
    ["stop_plan","Owner-reviewed TEST stop-plan SHA-256"],
    ["host","Original Windows host candidate SHA-256 (separately confirmed)"],
  ] as const;
  return <section aria-label="Build 264 original Windows authority and separate Comms TEST review">
    <h4>Build 264 — Witnessed restart decisions and separate private TEST request</h4>
    <p>Capture the original server readback with <code>powershell.exe -NoProfile -ExecutionPolicy RemoteSigned
      -File .\scripts\inspect-hub-authority-264.ps1 -Stage before</code>.
      Only collect <code>-Stage after</code> if an actual approved, witnessed restart took place.
      This screen verifies offline evidence; it cannot sign a decision, restart Windows or call Comms.</p>
    <label>Original Build 263 before-stage launcher JSON
      <input type="file" accept=".json,application/json" onChange={e=>{setBefore(null);
        void load(e.target.files?.[0],parseLauncherObservation263,v=>{
          if(v.stage!=="before") throw new Error("Expected a genuine before-stage JSON.");setBefore(v);
        });}} />
    </label>
    <label>Original Windows Build 264 after-stage readback JSON
      <input type="file" accept=".json,application/json" onChange={e=>{setAfter(null);
        void load(e.target.files?.[0],parseWindowsField264,setAfter);}} />
    </label>
    <label>Build 263 signed runtime receipt (issuer, owner, witness)
      <input type="file" accept=".json,application/json" onChange={e=>{setRuntime(null);
        void load(e.target.files?.[0],parseSignedRuntime263,setRuntime);}} />
    </label>
    <label>Build 264 original Windows field acceptance decision
      <input type="file" accept=".json,application/json" onChange={e=>{setField(null);
        void load(e.target.files?.[0],parseFieldDecision264,setField);}} />
    </label>
    <label>Build 264 separately signed, single-GET nonproduction TEST request
      <input type="file" accept=".json,application/json" onChange={e=>{setTest(null);
        void load(e.target.files?.[0],parseTestRequest264,setTest);}} />
    </label>
    {pinLabels.map(([key,label])=><label key={key}>{label}
      <input aria-label={`Build 264 ${key} fingerprint`} maxLength={64} spellCheck={false}
        placeholder="64 lowercase hex characters" value={pins[key]}
        onChange={e=>{setPins(current=>({...current,[key]:e.target.value}));setReview(null);}} />
    </label>)}
    <button type="button" disabled={!ready} onClick={()=>void verify()}>
      Verify original field and separate Comms TEST signatures offline
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats" role="status" aria-live="polite">
      <div><span>Windows runtime evidence</span><strong>{current && review?.result.fieldCandidate
        ? "Signed field candidate" : "ORIGINAL FIELD HOLD"}</strong></div>
      <div><span>Independent TEST request</span><strong>{current && review?.result.testRequestCandidate
        ? "Signed request candidate only" : "NOT ACCEPTED / HOLD"}</strong></div>
      <div><span>Comms receiver</span><strong>OFF / NOT AUTHORIZED</strong></div>
      <div><span>Customer/device actions</span><strong>NONE</strong></div>
    </div>
    {current && review && <div className="hub-update-next-step">
      <p>Mathematical review: <strong>{review.result.state}</strong></p>
      <p>Windows field signatures: {String(Object.values(review.result.fieldSignatures).every(Boolean))};
        separate TEST signatures: {String(Object.values(review.result.testSignatures).every(Boolean))}.</p>
      <ul>{review.result.findings.map(f=><li key={f}>{f}</li>)}</ul>
    </div>}
    <p><small>Uploaded files and independently entered fingerprints stay in this browser.
      Even a signed request does not establish original human identity, prove that the private
      receiver is online, authorize network traffic, or execute a challenge. All operations remain HOLD.</small></p>
  </section>;
}
