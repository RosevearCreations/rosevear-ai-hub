// @vitest-environment node
/**
 * Build 128: synthetic bytes only, in this test module exclusively.
 * No real File, Blob, browser picker, route, storage or Windows vault access.
 * Node's W3C Web Crypto API is used for source tests, not browser certification.
 */
import { describe, expect, it } from "vitest";

const MAX_DISPOSABLE_BYTES = 4096;
const CHUNK_BYTES = 64;
const encoder = new TextEncoder();

type FixtureIdentity = Readonly<{ owner: string; document: string; revision: number }>;
type SyntheticSource = "INVENTED_BYTES" | "EXTERNAL_DOCUMENT";
type EncryptedChunk = { index: number; iv: Uint8Array; ciphertext: Uint8Array };
type Envelope = { envelopeId: Uint8Array; declaredBytes: number; chunkCount: number; chunks: EncryptedChunk[] };
const identity: FixtureIdentity = { owner: "dummy-person-a", document: "dummy-document-a", revision: 1 };

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function contextBytes(source: FixtureIdentity, envelope: Envelope, chunkIndex: number): ArrayBuffer {
  return exactBuffer(encoder.encode(JSON.stringify([
    "synthetic-document-chunk/v1", source.owner, source.document, source.revision,
    Array.from(envelope.envelopeId), envelope.declaredBytes, envelope.chunkCount, chunkIndex,
  ])));
}

function ensureTestBytes(bytes: Uint8Array, source: SyntheticSource): void {
  if (source !== "INVENTED_BYTES") throw new Error("ONLY_DISPOSABLE_SYNTHETIC_BYTES");
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > MAX_DISPOSABLE_BYTES) {
    throw new Error("INVALID_SYNTHETIC_SIZE");
  }
}

async function temporaryKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptSyntheticDocument(
  key: CryptoKey, bytes: Uint8Array, source: FixtureIdentity, sourceKind: SyntheticSource = "INVENTED_BYTES",
): Promise<Envelope> {
  ensureTestBytes(bytes, sourceKind);
  const envelope: Envelope = {
    envelopeId: crypto.getRandomValues(new Uint8Array(16)),
    declaredBytes: bytes.length,
    chunkCount: Math.ceil(bytes.length / CHUNK_BYTES),
    chunks: [],
  };
  for (let index = 0; index < envelope.chunkCount; index++) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const part = bytes.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: exactBuffer(iv), additionalData: contextBytes(source, envelope, index), tagLength: 128 },
      key, exactBuffer(part),
    ));
    envelope.chunks.push({ index, iv, ciphertext });
  }
  return envelope;
}

async function decryptSyntheticDocument(key: CryptoKey, envelope: Envelope, source: FixtureIdentity): Promise<Uint8Array> {
  if (envelope.envelopeId.length !== 16 || envelope.declaredBytes < 1 || envelope.declaredBytes > MAX_DISPOSABLE_BYTES ||
      envelope.chunkCount !== Math.ceil(envelope.declaredBytes / CHUNK_BYTES) || envelope.chunks.length !== envelope.chunkCount) {
    throw new Error("INVALID_SYNTHETIC_ENVELOPE");
  }
  const output = new Uint8Array(envelope.declaredBytes);
  let offset = 0;
  for (let index = 0; index < envelope.chunkCount; index++) {
    const chunk = envelope.chunks[index];
    if (!chunk || chunk.index !== index || chunk.iv.length !== 12 || chunk.ciphertext.length < 17) {
      throw new Error("INVALID_SYNTHETIC_CHUNK");
    }
    const part = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: exactBuffer(chunk.iv), additionalData: contextBytes(source, envelope, index), tagLength: 128 },
      key, exactBuffer(chunk.ciphertext),
    ));
    const expected = Math.min(CHUNK_BYTES, envelope.declaredBytes - offset);
    if (part.length !== expected) throw new Error("INVALID_SYNTHETIC_LENGTH");
    output.set(part, offset);
    offset += part.length;
  }
  if (offset !== envelope.declaredBytes) throw new Error("INCOMPLETE_SYNTHETIC_ENVELOPE");
  return output;
}

function cloneEnvelope(envelope: Envelope): Envelope {
  return {
    envelopeId: envelope.envelopeId.slice(), declaredBytes: envelope.declaredBytes, chunkCount: envelope.chunkCount,
    chunks: envelope.chunks.map(c => ({ index: c.index, iv: c.iv.slice(), ciphertext: c.ciphertext.slice() })),
  };
}

const inventedBytes = () => encoder.encode("FAKE-DOCUMENT-CONTENT-WITH-NO-PERSONAL-INFORMATION.".repeat(10));

describe("Build 128 disposable encrypted document chunk pipeline", () => {
  it("round-trips invented data with a non-exportable ephemeral key and no plaintext file APIs", async () => {
    const key = await temporaryKey();
    const plaintext = inventedBytes();
    const envelope = await encryptSyntheticDocument(key, plaintext, identity);
    expect(key.extractable).toBe(false);
    expect(envelope.chunkCount).toBeGreaterThan(1);
    expect(Array.from(envelope.chunks[0].ciphertext)).not.toEqual(Array.from(plaintext.slice(0, CHUNK_BYTES)));
    expect(Array.from(await decryptSyntheticDocument(key, envelope, identity))).toEqual(Array.from(plaintext));
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("creates a fresh envelope ID and 96-bit IV for each independently encrypted chunk", async () => {
    const key = await temporaryKey();
    const a = await encryptSyntheticDocument(key, inventedBytes(), identity);
    const b = await encryptSyntheticDocument(key, inventedBytes(), identity);
    expect(Array.from(a.envelopeId)).not.toEqual(Array.from(b.envelopeId));
    const allIvs = [...a.chunks, ...b.chunks].map(c => Array.from(c.iv).join(","));
    expect(allIvs.every((_, i) => [...a.chunks, ...b.chunks][i].iv.length === 12)).toBe(true);
    expect(new Set(allIvs).size).toBe(allIvs.length);
  });

  it("denies tampered ciphertext, authentication tag and IV", async () => {
    const key = await temporaryKey();
    const original = await encryptSyntheticDocument(key, inventedBytes(), identity);
    for (const mutation of ["ciphertext", "tag", "iv"] as const) {
      const altered = cloneEnvelope(original);
      const chunk = altered.chunks[0];
      if (mutation === "ciphertext") chunk.ciphertext[0] ^= 1;
      if (mutation === "tag") chunk.ciphertext[chunk.ciphertext.length - 1] ^= 1;
      if (mutation === "iv") chunk.iv[0] ^= 1;
      await expect(decryptSyntheticDocument(key, altered, identity)).rejects.toThrow();
    }
  });

  it("denies wrong owner/document/revision, wrong key and envelope ID substitution", async () => {
    const key = await temporaryKey();
    const original = await encryptSyntheticDocument(key, inventedBytes(), identity);
    for (const changes of [{ owner: "other-owner" }, { document: "other-document" }, { revision: 2 }]) {
      await expect(decryptSyntheticDocument(key, original, { ...identity, ...changes })).rejects.toThrow();
    }
    await expect(decryptSyntheticDocument(await temporaryKey(), original, identity)).rejects.toThrow();
    const changedEnvelope = cloneEnvelope(original);
    changedEnvelope.envelopeId[0] ^= 1;
    await expect(decryptSyntheticDocument(key, changedEnvelope, identity)).rejects.toThrow();
  });

  it("denies missing, appended, duplicated, reordered or truncated chunks and altered length", async () => {
    const key = await temporaryKey();
    const original = await encryptSyntheticDocument(key, inventedBytes(), identity);
    const mutations = [
      (e: Envelope) => { e.chunks.pop(); },
      (e: Envelope) => { e.chunks.push(e.chunks[0]); },
      (e: Envelope) => { e.chunks[1] = e.chunks[0]; },
      (e: Envelope) => { [e.chunks[0], e.chunks[1]] = [e.chunks[1], e.chunks[0]]; },
      (e: Envelope) => { e.chunks[0].ciphertext = e.chunks[0].ciphertext.slice(0, -1); },
      (e: Envelope) => { e.declaredBytes++; },
      (e: Envelope) => { e.chunkCount--; },
    ];
    for (const mutate of mutations) {
      const altered = cloneEnvelope(original);
      mutate(altered);
      await expect(decryptSyntheticDocument(key, altered, identity)).rejects.toThrow();
    }
  });

  it("denies mixing chunks from different encrypted document envelopes", async () => {
    const key = await temporaryKey();
    const original = await encryptSyntheticDocument(key, inventedBytes(), identity);
    const other = await encryptSyntheticDocument(key, inventedBytes(), identity);
    const mixed = cloneEnvelope(original);
    mixed.chunks[1] = other.chunks[1];
    await expect(decryptSyntheticDocument(key, mixed, identity)).rejects.toThrow();
  });

  it("rejects external documents, empty and oversized invented fixtures before encrypting", async () => {
    const key = await temporaryKey();
    await expect(encryptSyntheticDocument(key, inventedBytes(), identity, "EXTERNAL_DOCUMENT")).rejects.toThrow("ONLY_DISPOSABLE_SYNTHETIC_BYTES");
    await expect(encryptSyntheticDocument(key, new Uint8Array(0), identity)).rejects.toThrow("INVALID_SYNTHETIC_SIZE");
    await expect(encryptSyntheticDocument(key, new Uint8Array(MAX_DISPOSABLE_BYTES + 1), identity)).rejects.toThrow("INVALID_SYNTHETIC_SIZE");
  });

  it("proves an intact previous envelope can be replayed and requires future anti-rollback state", async () => {
    const key = await temporaryKey();
    const old = await encryptSyntheticDocument(key, inventedBytes(), identity);
    const newer = await encryptSyntheticDocument(key, encoder.encode("NEW-SYNTHETIC-REVISION"), identity);
    expect(Array.from(await decryptSyntheticDocument(key, newer, identity))).not.toEqual(Array.from(inventedBytes()));
    expect(Array.from(await decryptSyntheticDocument(key, old, identity))).toEqual(Array.from(inventedBytes()));
    // Authenticated encryption is not a freshness protocol or server-maintained version ledger.
  });
});
