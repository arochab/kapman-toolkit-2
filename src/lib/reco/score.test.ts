import { describe, it, expect } from 'vitest';
import { scoreMix } from './score.js';
import { computeDiagnostics } from './diagnostics.js';
import type { AudioAnalysis } from '../utils/audio.js';

// A minimal AudioAnalysis with only the fields scoreMix reads; the rest are filler.
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

describe('verdict — a clean loud master ships', () => {
  it('a balanced -0.8 dBTP master reads SHIP', () => {
    const m = scoreMix(mk({ truePeakEstimate: -0.8, lufsEstimate: -7, lowEnergy: -30, midEnergy: -52, highEnergy: -67 }), 'techno');
    expect(m.verdict).toBe('ship');
  });
  it('the real reference master reads SHIP, never the worst tier', () => {
    for (const g of ['techno', 'other', 'deep-house', 'electro'] as const) {
      const m = scoreMix(BAGATELLE, g);
      expect(m.verdict, `genre ${g}`).not.toBe('work');
    }
    expect(scoreMix(BAGATELLE, 'other').verdict).toBe('ship');
  });
});

describe('verdict — real defects still fail (no false pass)', () => {
  it('gross clipping (true peak > +2 dBTP) is an instant NOT YET', () => {
    expect(scoreMix(mk({ truePeakEstimate: 3 }), 'techno').verdict).toBe('work');
  });
  it('real mono cancellation (phase -1) is an instant NOT YET', () => {
    expect(scoreMix(mk({ phaseCorrelation: -1, phaseCorrelationMin: -1 }), 'techno').verdict).toBe('work');
  });
  it('a hair-negative phase (-0.05) does NOT auto-condemn a wide master', () => {
    const m = scoreMix(mk({ phaseCorrelation: -0.05, phaseCorrelationMin: -0.05, truePeakEstimate: -1, lufsEstimate: -7 }), 'techno');
    expect(m.verdict).not.toBe('work');
  });
});

describe('verdict — score is bounded and monotonic', () => {
  it('score stays within 1..100 even for a worst-case master', () => {
    const m = scoreMix(mk({ truePeakEstimate: 5, lufsEstimate: 0, lowEnergy: -10, midEnergy: -60, highEnergy: -10, phaseCorrelation: -1 }), 'techno');
    expect(m.score).toBeGreaterThanOrEqual(1);
    expect(m.score).toBeLessThanOrEqual(100);
  });
  it('a clean master scores strictly higher than a clipping + mono-cancelling one', () => {
    const clean = scoreMix(mk({ truePeakEstimate: -1.5, lufsEstimate: -8, phaseCorrelation: 0.8, phaseCorrelationMin: 0.7, lowEnergy: -30, midEnergy: -52, highEnergy: -67 }), 'techno');
    const broken = scoreMix(mk({ truePeakEstimate: 3, lufsEstimate: 0, phaseCorrelation: -0.6, phaseCorrelationMin: -0.8 }), 'techno');
    expect(clean.score).toBeGreaterThan(broken.score);
  });
});

// CROSS-LAYER invariant: the verdict (score.ts) and the top fix card (diagnostics.ts) must
// never disagree on the worst-window phase path. A whole-file-safe master with ONE section
// that collapses in mono raises a HIGH-severity card, so the verdict must NOT read SHIP.
describe('no-bluff cross-layer — section-cancel never reads SHIP', () => {
  it('{phase 0.4, phaseMin -0.8}: verdict is NOT ship AND the top card is high-severity (they agree)', () => {
    const a = mk({ truePeakEstimate: -0.8, lufsEstimate: -8, phaseCorrelation: 0.4, phaseCorrelationMin: -0.8, lowEnergy: -30, midEnergy: -52, highEnergy: -67 });
    const verdict = scoreMix(a, 'techno').verdict;
    expect(verdict).not.toBe('ship');                       // score.ts reacts to the section cancel
    const top = computeDiagnostics(a, 'techno').actionQueue[0];
    expect(top.type).toBe('phase');                          // diagnostics' top fix is the cancel
    expect(top.severity).toBe('high');                      // ...and it's high-severity
  });
  it('a genuinely wide-but-safe master (phase 0.4, phaseMin 0.3) still ships', () => {
    const a = mk({ truePeakEstimate: -1.5, lufsEstimate: -8, phaseCorrelation: 0.4, phaseCorrelationMin: 0.3, lowEnergy: -30, midEnergy: -52, highEnergy: -67 });
    expect(scoreMix(a, 'techno').verdict).toBe('ship');     // a wide image alone does NOT condemn
  });
});
