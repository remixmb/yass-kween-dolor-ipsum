import { describe, it, expect } from 'vitest';
import {
  generate,
  generateDetailed,
  themes,
  visibleThemes,
  getTheme,
  listThemeIds,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
} from '../src/index.js';
import { LOREM_ORIGIN_WORDS } from '../src/themes/origins.js';

describe('hidden Huttese theme', () => {
  it('is registered but hidden from public listings', () => {
    expect(getTheme('huttese')).toBeDefined();
    expect(getTheme('huttese')!.hidden).toBe(true);
    expect(themes.some((t) => t.id === 'huttese')).toBe(true);
    expect(visibleThemes.some((t) => t.id === 'huttese')).toBe(false);
  });

  it('is a Latin-blend theme', () => {
    const huttese = getTheme('huttese')!;
    expect(huttese.blendBase?.length).toBeGreaterThan(0);
    expect(huttese.intensify).toBeTypeOf('function');
  });

  it('is still usable when explicitly requested by id', () => {
    const result = generateDetailed({
      theme: 'huttese',
      units: 'words',
      count: 12,
      seed: 'q',
    });
    expect(result.theme.id).toBe('huttese');
    expect(result.text.split(/\s+/)).toHaveLength(12);
  });

  it('carries an origin story', () => {
    expect(getTheme(EASTER_EGG_THEME_ID)!.origin).toMatch(/Star Wars|Huttese/);
  });
});

describe('Jabba Easter egg', () => {
  it('summons Huttese when the secret seed is used', () => {
    expect(generateDetailed({ seed: EASTER_EGG_SEED }).theme.id).toBe(
      EASTER_EGG_THEME_ID,
    );
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    for (const seed of ['JABBA', '  jabba  ', 'Jabba']) {
      expect(generateDetailed({ seed }).theme.id).toBe(EASTER_EGG_THEME_ID);
    }
  });

  it('overrides whatever theme was requested', () => {
    expect(generateDetailed({ theme: 'pirate', seed: EASTER_EGG_SEED }).theme.id).toBe(
      EASTER_EGG_THEME_ID,
    );
  });

  it('does not trigger for ordinary seeds', () => {
    expect(generateDetailed({ theme: 'classic', seed: 'not-jabba' }).theme.id).toBe(
      'classic',
    );
  });

  it('keeps the egg out of the standard list view but resolvable by id', () => {
    // listThemeIds reflects the full registry (egg resolvable by id)…
    expect(listThemeIds()).toContain('huttese');
    // …while the public, browsable set hides it.
    expect(visibleThemes.map((t) => t.id)).not.toContain('huttese');
  });
});

describe('blend behavior', () => {
  const originSet = new Set(LOREM_ORIGIN_WORDS);

  it('at intensity 0, the egg yields the raw Latin source untouched', () => {
    const text = generate({
      units: 'words',
      count: 40,
      intensity: 0,
      seed: EASTER_EGG_SEED,
    });
    for (const word of text.split(/\s+/)) {
      expect(originSet.has(word)).toBe(true);
    }
  });

  it('at high intensity, huttese mixes in genuine Huttese words', () => {
    const hutteseWords = new Set(getTheme('huttese')!.words);
    const text = generate({
      theme: 'huttese',
      units: 'words',
      count: 80,
      intensity: 1,
      seed: 'cantina',
    });
    const words = text.split(/\s+/);
    const swapped = words.filter((w) => hutteseWords.has(w));
    const mutatedOrLatin = words.filter((w) => !hutteseWords.has(w));
    // A genuine blend: some pure Huttese words swapped in, plenty of
    // mutated/Latin words remaining.
    expect(swapped.length).toBeGreaterThan(0);
    expect(mutatedOrLatin.length).toBeGreaterThan(0);
  });
});
