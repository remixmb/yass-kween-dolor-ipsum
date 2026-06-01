import { describe, it, expect } from 'vitest';
import {
  themes,
  getTheme,
  listThemeIds,
  DEFAULT_THEME_ID,
} from '../src/themes/index.js';

describe('theme registry', () => {
  it('exposes at least the documented set of themes', () => {
    expect(themes.length).toBeGreaterThanOrEqual(7);
  });

  it('has a registered default theme', () => {
    expect(getTheme(DEFAULT_THEME_ID)).toBeDefined();
  });

  it('returns undefined for unknown ids', () => {
    expect(getTheme('does-not-exist')).toBeUndefined();
  });

  it('lists ids that all resolve', () => {
    for (const id of listThemeIds()) {
      expect(getTheme(id)).toBeDefined();
    }
  });
});

describe('theme integrity', () => {
  it('every theme has unique, well-formed metadata', () => {
    const seen = new Set<string>();
    for (const theme of themes) {
      expect(theme.id).toMatch(/^[a-z0-9-]+$/);
      expect(seen.has(theme.id)).toBe(false);
      seen.add(theme.id);

      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      expect(theme.emoji.length).toBeGreaterThan(0);
    }
  });

  it('every theme has a substantial, clean vocabulary', () => {
    // Words are lowercase by convention so the generator controls
    // capitalization, with all-caps acronyms (e.g. KPI, ROI) allowed.
    const isLowerOrAcronym = (w: string) =>
      w === w.toLowerCase() || /^[A-Z]{2,}$/.test(w);
    for (const theme of themes) {
      expect(theme.words.length).toBeGreaterThanOrEqual(20);
      for (const word of theme.words) {
        expect(word.length).toBeGreaterThan(0);
        expect(isLowerOrAcronym(word)).toBe(true);
        expect(word.trim()).toBe(word);
        expect(word).not.toMatch(/\s/);
      }
    }
  });

  it('optional openers and interjections are non-empty when present', () => {
    for (const theme of themes) {
      for (const opener of theme.openers ?? []) {
        expect(opener.trim().length).toBeGreaterThan(0);
      }
      for (const interjection of theme.interjections ?? []) {
        expect(interjection.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
