import { useState } from "react";
import {
  assessSupervisedProcessReview253, parseArtifactKindManifest253, parseIndependentWitness253,
  parseWindowsMappingObservation253, verifyArtifactKindManifest253, verifyIndependentWitness253,
  type ArtifactKindManifest253, type IndependentWitness253, type WindowsMappingObservation253,
} from "./artifactWitness253";

type ManifestResult = Awaited<ReturnType<typeof verifyArtifactKindManifest253>>;
type WitnessResult = Awaited<ReturnType<typeof verifyIndependentWitness253>>;

export function MappingWitness253Panel({expectedSha, signedReceiptArtifactSha256, signedReceiptSignerKey,
  signedReceiptObservedAt, signedReceiptVerified, signerPin}: {
  expectedSha: string;
  signedReceiptArtifactSha256: string | null;
  signedReceiptSignerKey: string | null;
  signedReceiptObservedAt: string | null;
  signedReceiptVerified: boolean;
  signerPin: string;
}) {
  const [manifest, setManifest] = useState<ArtifactKindManifest253 | null>(null);
  const [observed, setObserved] = useState<WindowsMappingObservation253 | null>(null);
  const [witness, setWitness] = useState<IndependentWitness253 | null>(null);
  const [independentPin, setIndependentPin] = useState("");
  const [error, setError] = useState("");
  const [manifestVerification, setManifestVerification] = useState<{
    signature: string; keyPin: string; expectedSha: string; digest: string | null;
    signerKey: string | null; receiptObservedAt: string | null; receiptVerified: boolean; result: ManifestResult;
  } | null>(null);
  const [witnessVerification, setWitnessVerification] = useState<{
    signature: string; keyPin: string; manifestSignerKey: string | null; result: WitnessResult;
  } | null>(null);
  const [choice, setChoice] = useState<"hold" | "inspect" | "prepare_supervised_review">("hold");
  const cleanSignerPin = signerPin.trim().toLowerCase();
  const cleanWitnessPin = independentPin.trim().toLowerCase();
  const manifestVerified = Boolean(manifest && manifestVerification
    && manifestVerification.signature === manifest.signature_base64
    && manifestVerification.keyPin === cleanSignerPin
    && manifestVerification.expectedSha === expectedSha
    && manifestVerification.digest === signedReceiptArtifactSha256
    && manifestVerification.signerKey === signedReceiptSignerKey
    && manifestVerification.receiptObservedAt === signedReceiptObservedAt
    && manifestVerification.receiptVerified === signedReceiptVerified
    && manifestVerification.result.state === "SIGNED_ARTIFACT_KIND_CANDIDATE_ONLY");
  const witnessVerified = Boolean(manifestVerified && witness && witnessVerification && manifest
    && witnessVerification.signature === witness.signature_base64
    && witnessVerification.keyPin === cleanWitnessPin
    && witnessVerification.manifestSignerKey === manifest.signer_public_key_raw_base64
    && witnessVerification.result.state === "INDEPENDENT_SIGNATURE_CANDIDATE_ONLY");
  const result = assessSupervisedProcessReview253(expectedSha, signedReceiptArtifactSha256,
    observed, manifest, manifestVerified, witness, witnessVerified, new Date().toISOString(), choice);

  async function importFile<T>(file: File | undefined, parse: (text: string) => T, apply: (value: T) => void) {
    setError("");
    if (!file) return;
    if (file.size > 8192) { setError("Build 253 evidence exceeds 8 KB."); return; }
    try { apply(parse(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Build 253 evidence."); }
  }

  async function verifyManifest() {
    if (!manifest || !signedReceiptVerified) return;
    const result = await verifyArtifactKindManifest253(manifest, cleanSignerPin, expectedSha,
      signedReceiptArtifactSha256, signedReceiptSignerKey, signedReceiptObservedAt,
      signedReceiptVerified, new Date().toISOString());
    setManifestVerification({signature: manifest.signature_base64, keyPin: cleanSignerPin,
      expectedSha, digest: signedReceiptArtifactSha256, signerKey: signedReceiptSignerKey,
      receiptObservedAt: signedReceiptObservedAt,
      receiptVerified: signedReceiptVerified, result});
  }

  async function verifyWitness() {
    if (!witness || !manifest || !manifestVerified) return;
    const result = await verifyIndependentWitness253(witness, cleanWitnessPin,
      manifest.signer_public_key_raw_base64, new Date().toISOString());
    setWitnessVerification({signature: witness.signature_base64, keyPin: cleanWitnessPin,
      manifestSignerKey: manifest.signer_public_key_raw_base64, result});
  }

  return <section aria-label="Build 253 signed artifact-kind and independent mapping witness">
    <h4>Build 253 — Signed artifact-kind and independent Windows mapping witness</h4>
    <p>First verify the Build 250 receipt above. Import an <em>externally signed</em> manifest that binds its release and SHA-256 to the exact <code>web_index_html</code> artifact at <code>apps/web/dist/index.html</code>. Its signer must match the independently pinned receipt signer. This is an artifact mapping candidate, not an installed-process signature.</p>
    <label>Signed artifact-kind manifest JSON (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => {
        setManifest(null); setManifestVerification(null); setWitnessVerification(null);
        void importFile(event.target.files?.[0], parseArtifactKindManifest253, setManifest);
      }} />
    </label>
    <button type="button" disabled={!manifest || !signedReceiptVerified} onClick={() => void verifyManifest()}>
      Verify artifact-kind signature locally
    </button>
    <p><strong>Artifact-kind signature:</strong> {manifestVerified ? "SIGNED CANDIDATE ONLY" : "HOLD — not independently verified against receipt"}</p>
    <p>Next run <code>powershell.exe -NoProfile -File .\scripts\inspect-hub-mapping-253.ps1</code> on the actual Windows Hub. The inspector is read-only and redacts paths, command arguments, PIDs and secrets. A separately authenticated witness must sign its exact classified observation outside this application.</p>
    <label>Read-only Windows mapping observation JSON (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => {
        setObserved(null); void importFile(event.target.files?.[0], parseWindowsMappingObservation253, setObserved);
      }} />
    </label>
    <label>Independent witness signed receipt JSON (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => {
        setWitness(null); setWitnessVerification(null);
        void importFile(event.target.files?.[0], parseIndependentWitness253, setWitness);
      }} />
    </label>
    <label>Witness public-key SHA-256 fingerprint (authenticated separately from signer and receipt)
      <input aria-label="Independent witness fingerprint" maxLength={64} spellCheck={false}
        value={independentPin} placeholder="64 lowercase hexadecimal characters"
        onChange={event => { setIndependentPin(event.target.value); setWitnessVerification(null); }} />
    </label>
    <button type="button" disabled={!witness || !manifestVerified || cleanWitnessPin.length !== 64} onClick={() => void verifyWitness()}>
      Verify independent witness signature locally
    </button>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Manifest</span><strong>{manifestVerified ? "Signed candidate" : "HOLD"}</strong></div>
      <div><span>Independent witness</span><strong>{witnessVerified ? "Signature candidate" : "HOLD"}</strong></div>
      <div><span>Observed artifact</span><strong>{result.digest_matches ? "Matched hash" : "Not matched"}</strong></div>
      <div><span>Process attestation</span><strong>HOLD</strong></div>
    </div>
    <p><strong>Witness-to-observation comparison:</strong> {result.independent_witness_matches ? "Candidate match only" : "Unverified or mismatched"}</p>
    <p><strong>Supervised owner decision:</strong> {result.disposition.replaceAll("_", " ")}</p>
    <label>Next owner review step (never executes Windows actions)
      <select value={choice} onChange={event => setChoice(event.target.value as typeof choice)}>
        <option value="hold">Keep HOLD</option>
        <option value="inspect">Inspect original Windows process and task evidence</option>
        <option value="prepare_supervised_review">Prepare witnessed process-attestation review</option>
      </select>
    </label>
    <ul>{result.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    <p><small>All imported material is reviewed locally in this browser. Even a complete signature candidate cannot enroll a signer, attest a running binary, authorize recovery, edit tasks, restart services or close production installation acceptance. A witness must be a different independently authenticated key custodian.</small></p>
  </section>;
}
