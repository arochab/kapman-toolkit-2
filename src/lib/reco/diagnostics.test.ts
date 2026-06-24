import { describe, it, expect } from 'vitest';
import { computeDiagnostics } from './diagnostics.js';
import { issueSummary } from './issueText.js';
import { scoreMix } from './score.js';
import type { AudioAnalysis } from '../utils/audio.js';

function mk(p: Partial<AudioAnalysis>): AudioAnalysis {
  return {
    durationSec: 60, sampleRate: 44100, channels: 2,
    peakDb: -1, rmsDb: -12,
    lufsEstimate: -8, truePeakEstimate: -1, phaseCorrelation: 0.9, phaseCorrelationMin: 0.9,
    spectrum: [], spectrumFreqs: [],
    lowEnergy: -30, midEnergy: -50, highEnergy: -66, spectralTiltDbPerOct: -4.5,
    envelope: [],
    ...p,
  };
}
// the real reference master (W.A.R.R.I.O. - Bagatelle), measured by the live DSP
const BAGATELLE = mk({ lufsEstimate: -12.7, truePeakEstimate: 0.1, phaseCorrelation: 0.98, phaseCorrelationMin: -0.07, lowEnergy: -20.4, midEnergy: -41.5, highEnergy: -55.6 });

const types = (a: AudioAnalysis, g: Parameters<typeof computeDiagnostics>[1]) =>
  computeDiagnostics(a, g).issues.map((i) => i.type);

describe('computeDiagnostics — no phantom cards on a good master', () => {
  it('the reference master shows no PHANTOM tonal/phase cards (lowGap 21 is in-zone, -0.07 is not a cancel)', () => {
    for (const g of ['techno', 'other', 'deep-house', 'electro'] as const) {
      const t = types(BAGATELLE, g);
      expect(t, `genre ${g}`).toContain('headroom');           // +0.1 dBTP is worth a note
      expect(t, `genre ${g}`).not.toContain('low-end');        // lowGap 21 is in-zone -> no phantom bass card
      expect(t, `genre ${g}`).not.toContain('top-end');
      expect(t, `genre ${g}`).not.toContain('phase');          // a -0.07 window is normal stereo movement, not a cancel
    }
  });
  it('a loudness card only appears where -12.7 LUFS is genuinely quiet for the style', () => {
    // techno releases at -9..-6, so -12.7 IS legitimately quiet (an honest card, not a phantom);
    // "other" spans -13..-7, so -12.7 is in-zone -> no loudness card.
    expect(types(BAGATELLE, 'techno')).toContain('loudness');
    expect(types(BAGATELLE, 'other')).not.toContain('loudness');
  });
  it('a clean balanced master shows the healthy card only', () => {
    const clean = mk({ truePeakEstimate: -1.5, lufsEstimate: -8, lowEnergy: -30, midEnergy: -52, highEnergy: -67, phaseCorrelation: 0.7, phaseCorrelationMin: 0.6 });
    expect(types(clean, 'techno')).toEqual(['healthy']);
  });
});

describe('computeDiagnostics — real defects still surface', () => {
  it('a genuinely clipping master raises a high-severity headroom card', () => {
    const d = computeDiagnostics(mk({ truePeakEstimate: 1.5 }), 'techno');
    const h = d.issues.find((i) => i.type === 'headroom')!;
    expect(h.severity).toBe('high');
  });
  it('a polarity-flipped section raises a phase card even when whole-file reads safe', () => {
    expect(types(mk({ phaseCorrelation: 0.5, phaseCorrelationMin: -0.6 }), 'techno')).toContain('phase');
  });
  it('genuinely muddy low end raises a low-end card', () => {
    expect(types(mk({ lowEnergy: -10, midEnergy: -55, highEnergy: -70 }), 'techno')).toContain('low-end');
  });
  it('the one thing is severity-ranked (a high beats a low)', () => {
    // hot-but-safe headroom (low) + a clipping... use a real high vs low: muddy low (medium) over loudness (low)
    const d = computeDiagnostics(mk({ truePeakEstimate: 1.5, lowEnergy: -10, midEnergy: -55, highEnergy: -70 }), 'techno');
    expect(d.actionQueue[0].severity).toBe('high');
  });
});

describe('the no-bluff invariant — copy never contradicts the verdict/receipt', () => {
  it('a SHIP master never co-renders hard-clip copy', () => {
    const m = scoreMix(BAGATELLE, 'other');
    expect(m.verdict).toBe('ship');
    const sentence = issueSummary('headroom', BAGATELLE);  // topFix on Bagatelle is headroom
    expect(sentence.toLowerCase()).not.toMatch(/clip|clipper/); // +0.1 is hot-but-safe, not "it will clip"
  });
  it('a genuinely clipping master (NOT YET verdict) DOES say it will clip', () => {
    const clipper = mk({ truePeakEstimate: 3 });          // > 2 dBTP -> hard fault -> verdict work
    expect(scoreMix(clipper, 'techno').verdict).toBe('work');
    const sentence = issueSummary('headroom', clipper, 'work');
    expect(sentence.toLowerCase()).toMatch(/clip|clipper/);
  });
  it('a wide-but-positive master never says "parts cancel"', () => {
    const wide = mk({ phaseCorrelation: 0.15, phaseCorrelationMin: 0.1 });
    const sentence = issueSummary('phase', wide).toLowerCase();
    expect(sentence).not.toMatch(/cancel|s’annulent|s'annulent/);
  });
  it('a real cancellation DOES say parts cancel', () => {
    const sentence = issueSummary('phase', mk({ phaseCorrelation: -0.5, phaseCorrelationMin: -0.8 })).toLowerCase();
    expect(sentence).toMatch(/cancel|s’annulent|s'annulent/);
  });
});
