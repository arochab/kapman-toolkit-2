// Mix Score + verdict, genre-aware. One place that turns raw DSP into the single
// emotional read the analyzer screen needs: a 0-100 score, a one-word verdict, the
// face mood, and a per-band read against the chosen genre's target zone.
//
// The DSP numbers stay the source of truth - this only INTERPRETS them. Scores are
// deliberately forgiving (a rough demo should not read as a failure).

import type { AudioAnalysis } from '../utils/audio.js';
import { genreById, type GenreId, type GenreTarget } from './genres.js';
import { TP_CLIP_DBTP, PHASE_SECTION_CANCEL,
  topEndExcess, topEndDeficit, lowEndExcess, lowEndDeficit } from './issueTypes.js';

export type Verdict = 'ship' | 'almost' | 'work';
export type FaceMood = 'happy' | 'thinking' | 'worried';

// The score->verdict band thresholds — the SINGLE source of truth. scoreMix clamps the
// returned score into these bands, and Projects history derives its label from the SAME
// function, so the analyzer and the saved timeline can never show different verdicts.
export const SCORE_SHIP_MIN = 80;
export const SCORE_ALMOST_MIN = 55;
export function verdictForScore(score: number): Verdict {
  return score >= SCORE_SHIP_MIN ? 'ship' : score >= SCORE_ALMOST_MIN ? 'almost' : 'work';
}

export interface MixScore {
  score: number;            // 0..100
  verdict: Verdict;
  verdictWord: string;      // "SHIP IT" / "ALMOST" / "NEEDS WORK"
  face: FaceMood;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// Penalty curve: 0 inside the target range, growing as you drift outside it.
function rangePenalty(v: number, [lo, hi]: [number, number], slope: number): number {
  if (v < lo) return (lo - v) * slope;
  if (v > hi) return (v - hi) * slope;
  return 0;
}

export function scoreMix(a: AudioAnalysis, genreId: GenreId | null): MixScore {
  const g: GenreTarget = genreById(genreId);
  const lowGap = a.lowEnergy - a.midEnergy;   // dB
  const highGap = a.highEnergy - a.midEnergy; // dB

  // --- penalties (points off 100) ---
  let off = 0;
  // True peak above -1 dBTP costs points (it's the streaming-headroom recommendation),
  // but gently: a -0.3..-0.8 dBTP master is a normal, intentional club level, not a defect.
  // Slope 10 / cap 20 (was 14/24) so a clean loud master still clears to SHIP.
  if (a.truePeakEstimate > -1) off += clamp((a.truePeakEstimate + 1) * 10, 0, 20);
  // Loudness vs the genre's release zone (gentle - quiet is fine for an unfinished mix).
  off += clamp(rangePenalty(a.lufsEstimate, g.lufs, 2.2), 0, 16);
  // Tonal balance vs genre targets — BOTH sides (a too-dull or too-thin master is a real
  // fault, not just a too-bright/too-boomy one: rangePenalty is symmetric).
  off += clamp(rangePenalty(lowGap, g.lowGap, 3.2), 0, 22);
  off += clamp(rangePenalty(highGap, g.highGap, 3.0), 0, 16);
  // Spectral tilt: the global slope. A balanced electronic master sits around -3..-6 dB/oct;
  // steeper than -6 reads dark/lifeless, gentler than -1.5 reads bright/harsh. This is the
  // signal the deficit "top-end is dull" card uses — read it here too so the verdict can't
  // say SHIP while diagnostics shows a dull card. (Was measured in audio.ts but discarded.)
  if (a.spectralTiltDbPerOct < -6) off += clamp((-6 - a.spectralTiltDbPerOct) * 6, 0, 14);
  else if (a.spectralTiltDbPerOct > -1.5) off += clamp((a.spectralTiltDbPerOct + 1.5) * 6, 0, 12);
  // Phase: penalty scales smoothly with how negative the correlation is — no +8 cliff at
  // exactly 0, so a slightly-wide master (phase -0.05) barely loses points while real
  // cancellation (toward -1) is heavily penalized.
  if (a.phaseCorrelation < 0) off += clamp((-a.phaseCorrelation) * 40, 0, 22);
  // A SECTION that collapses in mono (whole-file reads safe but one window is well negative)
  // must cost points too — otherwise the score stays high while diagnostics raises a
  // high-severity "a section cancels in mono" card. Mirrors diagnostics.ts's sectionCancels.
  const sectionCancels = a.phaseCorrelationMin < PHASE_SECTION_CANCEL && a.phaseCorrelation >= 0;
  if (sectionCancels) off += clamp((-a.phaseCorrelationMin) * 30, 0, 22);

  let score = Math.round(clamp(100 - off, 1, 100));

  // --- verdict bands ---
  // A hard fault is an INSTANT worst-tier ("NOT YET"), bypassing the score: real mono
  // cancellation (phase < -0.1), a section that collapses in mono (sectionCancels), or a
  // true peak OVER +1 dBTP (it genuinely clips on lossy encode — and that is exactly where
  // diagnostics.ts turns the headroom card HIGH-severity, so verdict and card agree). A peak
  // of 0..+1 is hot-but-shippable: a low-severity note, points lost, but not condemned —
  // matching the low-severity card there. (See TP_CLIP_DBTP, shared with diagnostics/issueText.)
  const hardFault = a.phaseCorrelation < -0.1 || sectionCancels || a.truePeakEstimate > TP_CLIP_DBTP;

  // Any HIGH/MEDIUM diagnostics card must cap the verdict so the headline can never read SHIP
  // over a real fix card — the no-bluff invariant. Tonal cards (excess/deficit, both bands)
  // and a NEGATIVE-phase card (mono cancellation, which diagnostics shows HIGH at phase < 0,
  // not only < -0.1) both qualify. sectionCancels is already a hard fault above. These use the
  // SAME predicates/boundaries the cards use, so the two layers cannot drift.
  const tonalCard =
    topEndExcess(highGap, g.highGap) || topEndDeficit(highGap, g.highGap, a.spectralTiltDbPerOct) ||
    lowEndExcess(lowGap, g.lowGap)  || lowEndDeficit(lowGap, g.lowGap);
  const phaseCard = a.phaseCorrelation < 0;   // HIGH "mono cancellation" card fires here
  const cappingCard = tonalCard || phaseCard;

  let verdict: Verdict;
  if (hardFault || score < 55) verdict = 'work';
  else if (score < 80 || cappingCard) verdict = 'almost';   // any medium/high card caps SHIP -> ALMOST
  else verdict = 'ship';

  // CLAMP the numeric score into its verdict's band. The score is persisted and re-rendered
  // elsewhere (Projects history via verdictWordForScore), so a raw score that disagrees with
  // its own verdict (e.g. a hard-faulted track scoring 92) would show SHIP in saved history
  // while the analyzer says NOT YET. Clamping makes the number and the word inseparable.
  if (verdict === 'work') score = Math.min(score, SCORE_ALMOST_MIN - 1);
  else if (verdict === 'almost') score = clamp(score, SCORE_ALMOST_MIN, SCORE_SHIP_MIN - 1);
  else score = Math.max(score, SCORE_SHIP_MIN);

  const verdictWord = verdict === 'ship' ? 'SHIP IT' : verdict === 'almost' ? 'ALMOST' : 'NEEDS WORK';
  const face: FaceMood = verdict === 'ship' ? 'happy' : verdict === 'almost' ? 'thinking' : 'worried';

  // The UI reads only score/verdict/verdictWord/face here; the human-readable consequence
  // strings are owned by issueText.ts (issueSummary/honestyReceipt), which is localized and
  // threshold-shared — so there is exactly ONE source of producer-voice copy, no drift.
  return { score, verdict, verdictWord, face };
}
