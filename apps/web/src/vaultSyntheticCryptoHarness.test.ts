// @vitest-environment node
/**
 * Build 126: disposable-data harness ONLY. Test functions are deliberately
 * scoped to this .test.ts file and never imported into the shipped client.
 * The Node test runner's Web Crypto implements the same W3C API; physical
 * browser and Windows security acceptance are separate, unperformed gates.
 */
import { describe, expect, it } from "vitest";

type FixtureContext = { owner: string; item: string; version: number };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const fixture: FixtureContext = { owner: "synthetic-household-a", item: "synthetic-item-a", version: 1 };

function exactBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function authenticatedContext(context: FixtureContext): Uint8Array {
  return encoder.encode(JSON.stringify(["vault-fixture/v1", context.owner, context.item, context.version]));
}

async function ephemeralKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptFixture(key: CryptoKey, message: string, context: FixtureContext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: exactBuffer(iv), additionalData: exactBuffer(authenticatedContext(context)), tagLength: 128 },
    key,
    exactBuffer(encoder.encode(message)),
  ));
  return { iv, ciphertext };
}

async function decryptFixture(key: CryptoKey, envelope: { iv: Uint8Array; ciphertext: Uint8Array }, context: FixtureContext) {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: exactBuffer(envelope.iv), additionalData: exactBuffer(authenticatedContext(context)), tagLength: 128 },
    key,
    exactBuffer(envelope.ciphertext),
  );
  return decoder.decode(plaintext);
}

describe("Build 126 disposable AES-GCM tamper harness", () => {
  it("decrypts only the isolated synthetic text with a fresh non-exportable key", async () => {
    const key = await ephemeralKey();
    expect(key.extractable).toBe(false);
    const envelope = await encryptFixture(key, "SYNTHETIC-NO-REAL-PASSWORD", fixture);
    expect(Array.from(envelope.ciphertext)).not.toEqual(Array.from(encoder.encode("SYNTHETIC-NO-REAL-PASSWORD")));
    expect(await decryptFixture(key, envelope, fixture)).toBe("SYNTHETIC-NO-REAL-PASSWORD");
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });

  it("denies ciphertext flips, authentication-tag changes and truncation", async () => {
    const key = await ephemeralKey();
    const envelope = await encryptFixture(key, "DUMMY-PAYLOAD", fixture);
    const corruptBody = { ...envelope, ciphertext: envelope.ciphertext.slice() };
    corruptBody.ciphertext[0] ^= 1;
    await expect(decryptFixture(key, corruptBody, fixture)).rejects.toThrow();
    const corruptTag = { ...envelope, ciphertext: envelope.ciphertext.slice() };
    corruptTag.ciphertext[corruptTag.ciphertext.length - 1] ^= 1;
    await expect(decryptFixture(key, corruptTag, fixture)).rejects.toThrow();
    await expect(decryptFixture(key, { ...envelope, ciphertext: envelope.ciphertext.slice(0, -1) }, fixture)).rejects.toThrow();
  });

  it("denies modified IV, another owner's context, another item and a changed version", async () => {
    const key = await ephemeralKey();
    const envelope = await encryptFixture(key, "DUMMY-RECORD", fixture);
    const otherIv = { ...envelope, iv: envelope.iv.slice() };
    otherIv.iv[0] ^= 1;
    await expect(decryptFixture(key, otherIv, fixture)).rejects.toThrow();
    await expect(decryptFixture(key, envelope, { ...fixture, owner: "synthetic-household-b" })).rejects.toThrow();
    await expect(decryptFixture(key, envelope, { ...fixture, item: "synthetic-item-b" })).rejects.toThrow();
    await expect(decryptFixture(key, envelope, { ...fixture, version: 2 })).rejects.toThrow();
  });

  it("denies a wrong key and generates fresh 96-bit IVs for independent encryptions", async () => {
    const key = await ephemeralKey();
    const envelope = await encryptFixture(key, "DUMMY", fixture);
    await expect(decryptFixture(await ephemeralKey(), envelope, fixture)).rejects.toThrow();
    const ivs = await Promise.all(Array.from({ length: 32 }, () => encryptFixture(key, "DUMMY", fixture)));
    expect(ivs.every(value => value.iv.length === 12)).toBe(true);
    expect(new Set(ivs.map(value => Array.from(value.iv).join(","))).size).toBe(ivs.length);
  });

  it("documents that exact ciphertext replay still decrypts: AEAD is NOT anti-rollback", async () => {
    const key = await ephemeralKey();
    const envelope = await encryptFixture(key, "REPLAYABLE-SYNTHETIC-FIXTURE", fixture);
    expect(await decryptFixture(key, envelope, fixture)).toBe("REPLAYABLE-SYNTHETIC-FIXTURE");
    expect(await decryptFixture(key, envelope, fixture)).toBe("REPLAYABLE-SYNTHETIC-FIXTURE");
    // A future version ledger must reject stale versions outside cryptography.
  });
});
