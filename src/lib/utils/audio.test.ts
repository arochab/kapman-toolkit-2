import { describe, it, expect } from 'vitest';
import { __dsp } from './audio.js';

const { computeIntegratedLufs, computeTruePeak, computeSpectrum } = __dsp;
const FS = 44100;

// ---- synthetic signal generators (deterministic, seeded noise) ----
function sine(freq: number, amp: number, n: number): Float32Array {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = amp * Math.sin((2 * Math.PI * freq * i) / FS);
  return a;
}
function dc(value: number, n: number): Float32Array {
  return new Float32Array(n).fill(value);
}
function square(freq: number, n: number): Float32Array {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = Math.sign(Math.sin((2 * Math.PI * freq * i) / FS)) || 1;
  return a;
}
// mulberry32 seeded PRNG so the noise tests are deterministic.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function radix2(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, ang = (-2 * Math.PI) / size, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let st = 0; st < n; st += size) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = st + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
// noise with a target spectral slope (dB/oct) via FFT shaping — gives an exact tilt.
function shapedNoise(slopeDbOct: number, n: number, seed = 1): Float32Array {
  const re = new Float64Array(n), im = new Float64Array(n);
  const r = rng(seed);
  for (let i = 0; i < n; i++) re[i] = r() * 2 - 1;
  radix2(re, im);
  const exp = slopeDbOct / (20 * Math.log10(2));
  for (let k = 1; k < n / 2; k++) {
    const f = (k * FS) / n, g = Math.pow(f / 1000, exp);
    re[k] *= g; im[k] *= g; re[n - k] *= g; im[n - k] *= g;
  }
  for (let i = 0; i < n; i++) im[i] = -im[i];
  radix2(re, im);
  let mx = 1e-9; const out = new Float32Array(n);
  for (let i = 0; i < n; i++) { re[i] /= n; if (Math.abs(re[i]) > mx) mx = Math.abs(re[i]); }
  for (let i = 0; i < n; i++) out[i] = (re[i] / mx) * 0.5;
  return out;
}
// whole-file + worst-window phase correlation (mirrors analyzeAudio)
function phase(c0: Float32Array, c1: Float32Array) {
  const len = c0.length;
  let lr = 0, l2 = 0, r2 = 0;
  for (let i = 0; i < len; i++) { lr += c0[i] * c1[i]; l2 += c0[i] * c0[i]; r2 += c1[i] * c1[i]; }
  const whole = l2 * r2 > 0 ? lr / Math.sqrt(l2 * r2) : 1;
  const wl = Math.round(0.4 * FS), wh = Math.round(0.1 * FS);
  let min = whole;
  for (let s = 0; s + wl <= len; s += wh) {
    let a = 0, b = 0, c = 0;
    for (let i = s; i < s + wl; i++) { a += c0[i] * c1[i]; b += c0[i] * c0[i]; c += c1[i] * c1[i]; }
    const d = Math.sqrt(b * c); if (d < 1e-7) continue;
    const v = a / d; if (v < min) min = v;
  }
  return { whole, min };
}

describe('true peak (4x oversampled, BS.1770-4 style)', () => {
  it('reads ~0 dBTP for a full-scale 1 kHz sine', () => {
    const s = sine(1000, 1.0, FS);
    expect(computeTruePeak(s, s, s.length)).toBeCloseTo(0, 0);
  });
  it('reads ~-6 dBTP for a half-scale sine', () => {
    const s = sine(1000, 0.5, FS);
    expect(computeTruePeak(s, s, s.length)).toBeCloseTo(-6, 0);
  });
  it('does NOT false-clip a constant DC=1.0 buffer (boundary fix)', () => {
    const s = dc(1.0, FS);
    // before the edge fix this read ~+1.08 dBTP; a flat DC line has no inter-sample peak
    expect(computeTruePeak(s, s, s.length)).toBeLessThan(0.2);
  });
  it('flags a hard-edged fs/8 square as genuinely over the +2 dBTP hard-fault line', () => {
    const s = square(FS / 8, FS);
    expect(computeTruePeak(s, s, s.length)).toBeGreaterThan(2.0);
  });
});

describe('LUFS (ITU-R BS.1770-4)', () => {
  it('is finite and in a sane range for a -6 dBFS sine', () => {
    const s = sine(1000, 0.5, FS * 2);
    const lufs = computeIntegratedLufs(s, s, FS, 2);
    expect(Number.isFinite(lufs)).toBe(true);
    expect(lufs).toBeGreaterThan(-20);
    expect(lufs).toBeLessThan(0);
  });
  it('a -6 dBFS sine is ~6 LU quieter than a 0 dBFS sine', () => {
    const loud = computeIntegratedLufs(sine(1000, 1.0, FS * 2), sine(1000, 1.0, FS * 2), FS, 2);
    const quiet = computeIntegratedLufs(sine(1000, 0.5, FS * 2), sine(1000, 0.5, FS * 2), FS, 2);
    expect(loud - quiet).toBeCloseTo(6, 0);
  });
});

describe('phase correlation', () => {
  it('reads +1 for identical channels (mono)', () => {
    const s = shapedNoise(-3, 1 << 16);
    expect(phase(s, s).whole).toBeCloseTo(1, 1);
  });
  it('reads -1 for inverted channels (full mono cancellation)', () => {
    const s = shapedNoise(-3, 1 << 16);
    const inv = s.map((x) => -x) as Float32Array;
    expect(phase(s, inv).whole).toBeCloseTo(-1, 1);
  });
  it('worst-window MIN catches a section that flips polarity even if whole-file reads safe', () => {
    const n = FS * 4;
    const L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < n; i++) { const w = Math.sin((2 * Math.PI * 220 * i) / FS) * 0.5; L[i] = w; R[i] = i > n * 0.5 ? -w : w; }
    const p = phase(L, R);
    expect(p.whole).toBeGreaterThan(-0.1);   // whole-file looks roughly centered
    expect(p.min).toBeLessThan(-0.25);        // but a window genuinely cancels
  });
});

describe('spectrum (bandwidth-normalized) tilt', () => {
  it('white noise reads tilt ~0 dB/oct', () => {
    const s = shapedNoise(0, 1 << 17);
    expect(computeSpectrum(s, s, s.length, FS).spectralTiltDbPerOct).toBeCloseTo(0, 0);
  });
  it('pink noise reads tilt ~-3 dB/oct', () => {
    const s = shapedNoise(-3, 1 << 17);
    expect(computeSpectrum(s, s, s.length, FS).spectralTiltDbPerOct).toBeCloseTo(-3, 0);
  });
  it('a -4.5 dB/oct master reads tilt ~-4.5 (the balanced anchor)', () => {
    const s = shapedNoise(-4.5, 1 << 17);
    expect(computeSpectrum(s, s, s.length, FS).spectralTiltDbPerOct).toBeCloseTo(-4.5, 0);
  });
});
