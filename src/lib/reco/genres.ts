// Genre-first targets, focused on the electronic / underground spectrum (no mainstream EDM).
// Styles drawn from the Yoyaku catalogue (deep house, minimal, techno, dub techno, electro,
// acid, UK garage, ambient). The wedge: a beginner never has to supply a reference track;
// Cue judges against curated, per-style target zones instead.
//
// Ranges are intentionally forgiving and tuned to how each style actually masters for clubs
// and streaming. The DSP numbers stay the source of truth; these only shape verdict + score.

export type GenreId =
  | 'deep-house' | 'minimal' | 'techno' | 'dub-techno' | 'electro' | 'acid' | 'uk-garage' | 'ambient' | 'other';

export interface GenreTarget {
  id: GenreId;
  label: string;
  // Integrated LUFS this style is typically released at.
  lufs: [number, number];
  // Acceptable low-vs-mid energy gap (dB). Bass-forward styles tolerate a bigger gap.
  lowGap: [number, number];
  // High-vs-mid gap (dB) before it reads brittle.
  highGap: [number, number];
}

// Ordered for the chip row: the styles a Yoyaku-leaning producer reaches for first.
// lowGap/highGap are on the BANDWIDTH-NORMALIZED spectrum scale (post tilt-bias fix):
// a balanced electronic master (~ -4.5 dB/oct) reads lowGap ~ +20 and highGap ~ -16, so the
// ranges are wide & positive on lowGap / strongly negative on highGap. Recalibrated against
// real FFT-shaped slope anchors (0/-3/-4.5/-6/-9 dB/oct) and verified against score.ts math:
// a good per-style master lands SHIP, a sub-heavy/off-style cut is flagged ALMOST.
export const GENRES: GenreTarget[] = [
  { id: 'deep-house', label: 'Deep House',  lufs: [-11, -8],  lowGap: [15, 30], highGap: [-20, -9] },
  { id: 'minimal',    label: 'Minimal',     lufs: [-12, -9],  lowGap: [14, 28], highGap: [-20, -11] },
  { id: 'techno',     label: 'Techno',      lufs: [-9, -6],   lowGap: [10, 38], highGap: [-24, -9] },
  { id: 'dub-techno', label: 'Dub Techno',  lufs: [-13, -9],  lowGap: [18, 34], highGap: [-23, -11] },
  { id: 'electro',    label: 'Electro',     lufs: [-11, -7],  lowGap: [10, 26], highGap: [-19, -9] },
  { id: 'acid',       label: 'Acid',        lufs: [-10, -7],  lowGap: [12, 26], highGap: [-17, -8] },
  { id: 'uk-garage',  label: 'UK Garage',   lufs: [-9, -6],   lowGap: [9, 26],  highGap: [-18, -9] },
  { id: 'ambient',    label: 'Ambient',     lufs: [-18, -13], lowGap: [14, 48], highGap: [-30, -8] },
  { id: 'other',      label: 'Not sure',    lufs: [-13, -7],  lowGap: [6, 33],  highGap: [-23, -8] },
];

export function genreById(id: GenreId | null | undefined): GenreTarget {
  return GENRES.find((g) => g.id === id) ?? GENRES[GENRES.length - 1];
}

const KEY = 'cuepoint.genre.v1';

// Remember the producer's last pick so the chip is pre-selected next time (small kindness).
export function rememberGenre(id: GenreId): void {
  try { localStorage.setItem(KEY, id); } catch { /* non-fatal */ }
}
export function lastGenre(): GenreId | null {
  try { return (localStorage.getItem(KEY) as GenreId) ?? null; } catch { return null; }
}
