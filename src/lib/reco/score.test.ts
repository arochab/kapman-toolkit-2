import { describe, it, expect } from 'vitest';
import { scoreMix, verdictForScore, SCORE_ALMOST_MIN } from './score.js';
import { computeDiagnostics } from './diagnostics.js';
import { GENRES, type GenreId } from './genres.js';
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
  it('a hair-negative phase (-0.05) reads ALMOST — not condemned to NOT YET, but never SHIP', () => {
    // diagnostics shows a HIGH "mono cancellation" card at phase < 0, so the verdict must NOT
    // ship over it; -0.05 is too small to hard-fault, so the honest landing is ALMOST.
    const m = scoreMix(mk({ phaseCorrelation: -0.05, phaseCorrelationMin: -0.05, truePeakEstimate: -1, lufsEstimate: -7 }), 'techno');
    expect(m.verdict).toBe('almost');
    const top = computeDiagnostics(mk({ phaseCorrelation: -0.05, phaseCorrelationMin: -0.05 }), 'techno').actionQueue[0];
    expect(top.type).toBe('phase');
    expect(top.severity).toBe('high');   // card and verdict now agree: a real fault, not SHIP
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

// BRUTE-FORCE the no-bluff invariant — a SHIP verdict must NEVER coexist with a medium/high
// diagnostics card. The sweep varies EVERY axis a card keys off (lowGap, highGap, tilt, phase,
// section-cancel, true peak) so the safety net has no hole — this is the guarantor test.
describe('no-bluff invariant — swept across all genres + every card axis', () => {
  const PHASES = [0.95, 0.5, 0.1, 0, -0.05, -0.1, -0.4];          // incl. the [-0.1,0) bluff band
  const PMINS = [0.9, -0.07, -0.3, -0.8];                          // incl. section-cancel band
  const TILTS = [-2, -4, -7];                                      // incl. the dull (<-6) range
  const TPS = [-1.5, 0.5, 1.5];                                    // safe / over-0 / clipping
  for (const g of GENRES.map((x) => x.id) as GenreId[]) {
    it(`${g}: no SHIP ever coexists with a medium/high fix card (all axes swept)`, () => {
      const gt = GENRES.find((x) => x.id === g)!;
      const mid = -50;
      for (let lowGap = gt.lowGap[0] - 6; lowGap <= gt.lowGap[1] + 6; lowGap += 3)
      for (let highGap = gt.highGap[0] - 6; highGap <= gt.highGap[1] + 6; highGap += 4)
      for (const phase of PHASES) for (const pmin of PMINS) for (const tilt of TILTS) for (const tp of TPS) {
        const a = mk({ lufsEstimate: (gt.lufs[0] + gt.lufs[1]) / 2, truePeakEstimate: tp,
          phaseCorrelation: phase, phaseCorrelationMin: Math.min(phase, pmin),
          midEnergy: mid, lowEnergy: mid + lowGap, highEnergy: mid + highGap, spectralTiltDbPerOct: tilt });
        if (scoreMix(a, g).verdict === 'ship') {
          const top = computeDiagnostics(a, g).actionQueue[0];
          const sev = top ? top.severity : 'low';
          expect(sev, `SHIP over a ${sev} ${top?.type} card @ low=${lowGap} high=${highGap} ph=${phase} pmin=${pmin} tilt=${tilt} tp=${tp}`).toBe('low');
        }
      }
    });
  }
});

describe('score is clamped into its verdict band (saved history can never disagree)', () => {
  const hardFaults: Array<[string, Partial<AudioAnalysis>]> = [
    ['phase -0.2', { phaseCorrelation: -0.2, phaseCorrelationMin: -0.2 }],
    ['phase -1',   { phaseCorrelation: -1, phaseCorrelationMin: -1 }],
    ['+3 dBTP',    { truePeakEstimate: 3 }],
    ['section cancel', { phaseCorrelation: 0.4, phaseCorrelationMin: -0.8 }],
  ];
  it.each(hardFaults)('hard fault %s: verdict=work AND score < %i AND verdictForScore agrees', (_label, patch) => {
    const m = scoreMix(mk(patch), 'techno');
    expect(m.verdict).toBe('work');
    expect(m.score).toBeLessThan(SCORE_ALMOST_MIN);          // not a green number under NOT YET
    expect(verdictForScore(m.score)).toBe('work');           // history re-derivation agrees
  });
  it('for ANY verdict, the persisted score re-derives to the SAME verdict', () => {
    const cases: Partial<AudioAnalysis>[] = [
      { truePeakEstimate: -1.5, lufsEstimate: -8, lowEnergy: -30, midEnergy: -52, highEnergy: -67 }, // ship
      { truePeakEstimate: 0.5 },                                                                      // almost (over 0)
      { phaseCorrelation: -1, phaseCorrelationMin: -1 },                                              // work
      { lowEnergy: -52, midEnergy: -50, highEnergy: -64 },                                            // almost (thin)
    ];
    for (const c of cases) {
      const m = scoreMix(mk(c), 'techno');
      expect(verdictForScore(m.score), `score ${m.score} vs verdict ${m.verdict}`).toBe(m.verdict);
    }
  });
});
