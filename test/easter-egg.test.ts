import { describe, it, expect } from 'vitest';
import {
  generate,
  themes,
  visibleThemes,
  getTheme,
  listThemeIds,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
} from '../src/index.js';

describe('hidden Huttese theme', () => {
  it('is registered but hidden from public listings', () => {
    expect(getTheme('huttese')).toBeDefined();
    expect(getTheme('huttese')!.hidden).toBe(true);
    expect(themes.some((t) => t.id === 'huttese')).toBe(true);
    expect(visibleThemes.some((t) => t.id === 'huttese')).toBe(false);
  });

  it('is still usable when explicitly requested by id', () => {
    const hutteseWords = new Set(getTheme('huttese')!.words);
    const text = generate({ theme: 'huttese', units: 'words', count: 12, seed: 'q' });
    for (const word of text.split(/\s+/)) {
      expect(hutteseWords.has(word)).toBe(true);
    }
  });

  it('carries an origin story', () => {
    expect(getTheme(EASTER_EGG_THEME_ID)!.origin).toMatch(/Star Wars|Huttese/);
  });
});

describe('Jabba Easter egg', () => {
  const hutteseWords = () => new Set(getTheme(EASTER_EGG_THEME_ID)!.words);

  it('summons Huttese when the secret seed is used', () => {
    const text = generate({ units: 'words', count: 15, seed: EASTER_EGG_SEED });
    const words = hutteseWords();
    for (const word of text.split(/\s+/)) {
      expect(words.has(word)).toBe(true);
    }
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    // Different casings/padding seed different RNG streams, but every variant
    // must still summon Huttese.
    const words = hutteseWords();
    for (const seed of ['JABBA', '  jabba  ', 'Jabba']) {
      const text = generate({ units: 'words', count: 12, seed });
      for (const word of text.split(/\s+/)) {
        expect(words.has(word)).toBe(true);
      }
    }
  });

  it('overrides whatever theme was requested', () => {
    const text = generate({
      theme: 'pirate',
      units: 'words',
      count: 12,
      seed: EASTER_EGG_SEED,
    });
    const words = hutteseWords();
    for (const word of text.split(/\s+/)) {
      expect(words.has(word)).toBe(true);
    }
  });

  it('does not trigger for ordinary seeds', () => {
    const hutteseWordSet = hutteseWords();
    const text = generate({
      theme: 'classic',
      units: 'words',
      count: 20,
      seed: 'not-jabba',
    });
    const classicWords = new Set(getTheme('classic')!.words);
    // Classic output should be Latin lorem words, not Huttese.
    const allHuttese = text.split(/\s+/).every((w) => hutteseWordSet.has(w));
    expect(allHuttese).toBe(false);
    for (const word of text.split(/\s+/)) {
      expect(classicWords.has(word)).toBe(true);
    }
  });

  it('keeps the egg out of the standard theme id list view but resolvable', () => {
    // listThemeIds reflects the full registry (egg resolvable by id)…
    expect(listThemeIds()).toContain('huttese');
    // …while the public, browsable set hides it.
    expect(visibleThemes.map((t) => t.id)).not.toContain('huttese');
  });
});
