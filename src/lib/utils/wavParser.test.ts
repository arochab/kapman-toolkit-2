import { describe, it, expect } from 'vitest';
import { parseWav, isWavBuffer, WavParseError } from './wavParser.js';

// Build a WAV in memory at a given bit depth / format, with a known sine, so we can prove the
// parser reads PCM 16/24/32 and IEEE float 32 — including the 32-bit float case that made the
// browser codec hang on real mixbus files.
type Fmt = { bits: number; float: boolean };
function makeWav(fmt: Fmt, sampleRate: number, channels: number, frames: number, gen: (i: number, c: number) => number): ArrayBuffer {
  const bytesPerSample = fmt.bits >> 3;
  const blockAlign = bytesPerSample * channels;
  const dataBytes = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataBytes);
  const dv = new DataView(buf);
  const W = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  W(0, 'RIFF'); dv.setUint32(4, 36 + dataBytes, true); W(8, 'WAVE');
  W(12, 'fmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, fmt.float ? 3 : 1, true);            // audioFormat: 3=float, 1=PCM
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, fmt.bits, true);
  W(36, 'data'); dv.setUint32(40, dataBytes, true);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.max(-1, Math.min(1, gen(i, c)));   // [-1,1]
      if (fmt.float) { dv.setFloat32(o, v, true); o += 4; }
      else if (fmt.bits === 16) { dv.setInt16(o, Math.round(v * 32767), true); o += 2; }
      else if (fmt.bits === 24) { const x = Math.round(v * 8388607); dv.setUint8(o, x & 0xff); dv.setUint8(o + 1, (x >> 8) & 0xff); dv.setUint8(o + 2, (x >> 16) & 0xff); o += 3; }
      else { dv.setInt32(o, Math.round(v * 2147483647), true); o += 4; }
    }
  }
  return buf;
}

const FS = 48000;
const sine = (i: number) => Math.sin((2 * Math.PI * 440 * i) / FS) * 0.5;

describe('wavParser — reads every common DAW export format', () => {
  it('sniffs a WAV by its RIFF/WAVE header, not its name', () => {
    expect(isWavBuffer(makeWav({ bits: 16, float: false }, FS, 2, 10, sine))).toBe(true);
    expect(isWavBuffer(new ArrayBuffer(8))).toBe(false);
  });

  it.each([
    ['PCM 16-bit', { bits: 16, float: false } as Fmt, 0.01],
    ['PCM 24-bit', { bits: 24, float: false } as Fmt, 0.001],
    ['PCM 32-bit', { bits: 32, float: false } as Fmt, 0.001],
    ['IEEE float 32-bit (the mixbus case)', { bits: 32, float: true } as Fmt, 1e-6],
  ])('parses %s at native rate with correct samples', (_label, fmt, tol) => {
    const frames = 2000;
    const buf = makeWav(fmt, FS, 2, frames, sine);
    const w = parseWav(buf);
    expect(w.sampleRate).toBe(FS);              // NATIVE rate preserved (no forced 44100)
    expect(w.numberOfChannels).toBe(2);
    expect(w.length).toBe(frames);
    // spot-check a few samples round-trip within the format's quantization tolerance
    for (const i of [1, 500, 1234, 1999]) {
      expect(Math.abs(w.channelData[0][i] - sine(i))).toBeLessThan(tol);
    }
  });

  it('keeps stereo channels independent', () => {
    const buf = makeWav({ bits: 24, float: false }, FS, 2, 500, (i, c) => (c === 0 ? 0.5 : -0.5));
    const w = parseWav(buf);
    expect(w.channelData[0][100]).toBeCloseTo(0.5, 2);
    expect(w.channelData[1][100]).toBeCloseTo(-0.5, 2);
  });

  it('rejects a non-WAV buffer with a typed error', () => {
    expect(() => parseWav(new ArrayBuffer(8))).toThrow(WavParseError);
  });
});
