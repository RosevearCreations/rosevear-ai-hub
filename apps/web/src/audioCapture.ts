/** Microphone audio stays in memory until explicitly submitted to localhost.
 * Encode mono 16 kHz PCM WAV: no remote transcription, browser speech API or codec dependency.
 */
export function encodeMonoWav(chunks: Float32Array[], sourceRate: number): Blob {
  if (!Number.isFinite(sourceRate) || sourceRate < 16000 || sourceRate > 192000) {
    throw new Error("Unsupported microphone sample rate.");
  }
  const inputLength = chunks.reduce((sum, part) => sum + part.length, 0);
  const input = new Float32Array(inputLength);
  let cursor = 0;
  for (const part of chunks) {
    input.set(part, cursor);
    cursor += part.length;
  }
  const targetRate = 16000;
  const outputLength = Math.floor(inputLength * targetRate / sourceRate);
  if (outputLength === 0) throw new Error("No microphone audio was recorded.");
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  function text(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  }
  text(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, outputLength * 2, true);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * sourceRate / targetRate);
    const end = Math.max(start + 1, Math.floor((i + 1) * sourceRate / targetRate));
    let sum = 0;
    for (let j = start; j < Math.min(end, inputLength); j++) sum += input[j];
    const sample = Math.max(-1, Math.min(1, sum / (end - start)));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export interface MicrophoneSession {
  stop(): Blob;
  cancel(): void;
}

export async function startLocalMicrophone(
  onLimit: () => void,
  maxSeconds = 20,
): Promise<MicrophoneSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access requires localhost or a secure browser context.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true },
  });
  let context: AudioContext | null = null;
  try {
    context = new AudioContext();
    const rate = context.sampleRate;
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    let total = 0;
    let active = true;
    processor.onaudioprocess = (event) => {
      // Never echo microphone input to speakers.
      event.outputBuffer.getChannelData(0).fill(0);
      if (!active) return;
      const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
      chunks.push(chunk);
      total += chunk.length;
      if (total >= rate * maxSeconds) {
        active = false;
        onLimit();
      }
    };
    source.connect(processor);
    processor.connect(context.destination);
    function cleanup() {
      active = false;
      processor.onaudioprocess = null;
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context?.close();
    }
    return {
      stop: () => {
        cleanup();
        return encodeMonoWav(chunks, rate);
      },
      cancel: cleanup,
    };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    if (context) void context.close();
    throw error;
  }
}
