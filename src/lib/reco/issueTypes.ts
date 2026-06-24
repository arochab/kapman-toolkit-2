// Shared issue taxonomy. The analyzer detects these from the (verified) DSP metrics;
// the recommendation engine and progression tracking key off the same names.
export type IssueType = 'headroom' | 'phase' | 'top-end' | 'low-end' | 'loudness' | 'healthy';

// SHARED DSP thresholds — the single source of truth so the verdict (score.ts), the fix
// card (diagnostics.ts) and the producer-voice sentence (issueText.ts) can NEVER drift on
// where a defect crosses from "note" to "real fault". (Three juries caught drift here.)
//
// True peak:
//   > 0      dBTP  -> over the streaming ceiling: a low-severity note, still shippable
//   > TP_CLIP_DBTP -> genuinely clips on lossy encode: HIGH-severity card + caps the verdict
export const TP_CEILING_DBTP = 0;    // -1 dBTP is the target; over 0 is worth flagging
export const TP_CLIP_DBTP = 1;       // over +1 dBTP audibly clips most lossy codecs
// Phase: a 400ms window this far below 0 means a section collapses in mono (whole-file safe).
export const PHASE_SECTION_CANCEL = -0.25;

// SHARED tonal-card predicates so score.ts (the verdict) and diagnostics.ts (the fix card)
// fire on the SAME condition — the verdict can never read SHIP while a tonal card is shown.
// `range` is the genre's [floor, ceiling] gap; the +2/-2 hysteresis matches the cards.
export function topEndExcess(highGap: number, range: readonly [number, number]): boolean {
  return highGap > range[1] + 2;
}
export function topEndDeficit(highGap: number, range: readonly [number, number], tilt: number): boolean {
  return highGap < range[0] - 2 && tilt < -6;
}
export function lowEndExcess(lowGap: number, range: readonly [number, number]): boolean {
  return lowGap > range[1] + 2;
}
export function lowEndDeficit(lowGap: number, range: readonly [number, number]): boolean {
  return lowGap < range[0] - 2;
}
