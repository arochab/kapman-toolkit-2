import { describe, it, expect } from 'vitest';
import { issueToNeed, routesForNeed, bestRouteForNeed, suggestionsForIssues, characterRoutes, DIAGNOSTIC_NEEDS } from './needRoutes.js';
import { recipes } from '../data/recipes.js';

describe('need routing — the anti-bluff guarantee', () => {
  it('maps headroom+loudness to the single loudness need (no bluff on a need the DSP fuses)', () => {
    expect(issueToNeed('loudness')).toBe('loudness');
    expect(issueToNeed('headroom')).toBe('loudness');
  });
  it('healthy is a verdict, not a route', () => {
    expect(issueToNeed('healthy')).toBeNull();
  });
  it('every diagnostic need resolves to at least one real recipe', () => {
    for (const need of DIAGNOSTIC_NEEDS) {
      expect(routesForNeed(need).length, `need ${need}`).toBeGreaterThan(0);
      expect(bestRouteForNeed(need), `need ${need}`).not.toBeNull();
    }
  });
  it('is deterministic — bestRouteForNeed always returns the same recipe', () => {
    expect(bestRouteForNeed('low-end')?.id).toBe(bestRouteForNeed('low-end')?.id);
  });
  it('suggestionsForIssues only returns routes the DSP can back, deduped, max 3', () => {
    const s = suggestionsForIssues(['low-end', 'low-end', 'top-end', 'phase']);
    expect(s.length).toBeLessThanOrEqual(3);
    expect(new Set(s.map((r) => r.id)).size).toBe(s.length); // no dupes
    expect(s.every((r) => r.need !== 'character')).toBe(true); // never a browse-only lane
  });
  it('a healthy verdict yields no forced fix routes', () => {
    expect(suggestionsForIssues(['healthy'])).toHaveLength(0);
  });
});

describe('recipe data integrity', () => {
  it('has exactly 20 recipes', () => {
    expect(recipes).toHaveLength(20);
  });
  it('every recipe has a need, a chain, and a unique id', () => {
    const ids = new Set<string>();
    for (const r of recipes) {
      expect(r.need, r.id).toBeTruthy();
      expect(r.chain.length, r.id).toBeGreaterThan(0);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });
  it('the character lane is browse-only (8 sound-design recipes)', () => {
    expect(characterRoutes().every((r) => r.need === 'character')).toBe(true);
    expect(characterRoutes().length).toBeGreaterThan(0);
  });
});
