import { describe, expect, it } from "vitest";

import { encodeMonoWav } from "./audioCapture";

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe("Build 042 local microphone WAV encoder", () => {
  it("writes a mono 16 kHz, 16-bit RIFF/WAVE header and PCM samples", async () => {
    const blob = encodeMonoWav([new Float32Array([0, 0.5, -0.5, 1])], 16000);
    expect(blob.type).toBe("audio/wav");
    const bytes = new Uint8Array(await readBlob(blob));
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBeGreaterThan(0);
    expect(view.getInt16(48, true)).toBeLessThan(0);
  });

  it("downsamples local 48 kHz recordings without a cloud dependency", async () => {
    const blob = encodeMonoWav([new Float32Array(48000)], 48000);
    const bytes = new Uint8Array(await readBlob(blob));
    expect(bytes.byteLength).toBe(44 + 16000 * 2);
  });

  it("rejects empty or unsupported microphone audio", () => {
    expect(() => encodeMonoWav([], 48000)).toThrow("No microphone audio");
    expect(() => encodeMonoWav([new Float32Array([0])], 8000)).toThrow(
      "Unsupported microphone sample rate",
    );
  });
});
