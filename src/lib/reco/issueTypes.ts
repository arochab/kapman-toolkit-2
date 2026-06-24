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
