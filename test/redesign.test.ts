import { describe, it, expect } from 'vitest';
import {
  generate,
  generateRich,
  blocksToText,
  blocksToHtml,
  themes,
  visibleThemes,
  getTheme,
  gloss,
  themeGloss,
} from '../src/index.js';

/** Mirror of the generator's display rendering, for glossary key checks. */
function glossKey(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');
}

describe('expanded voice registry', () => {
  it('exposes 17 visible voices plus the hidden Huttese egg', () => {
    expect(visibleThemes).toHaveLength(17);
    expect(themes).toHaveLength(18);
    expect(themes.filter((t) => t.hidden).map((t) => t.id)).toEqual(['huttese']);
  });

  it('every voice has a valid hex accent color', () => {
    for (const theme of themes) {
      expect(theme.accent, theme.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('registers the ten new voices', () => {
    for (const id of [
      'legalese',
      'cat',
      'academia',
      'genz',
      'boomer',
      'conspiracy',
      'dutch',
      'artist',
      'barista',
      'hoa',
    ]) {
      expect(getTheme(id), id).toBeDefined();
    }
  });
});

describe('Latin glosses', () => {
  it('translates Cicero source words', () => {
    expect(gloss('dolorem')).toBe('pain');
    expect(gloss('VOLUPTATEM')).toBe('pleasure'); // case-insensitive
    expect(gloss('amet')).toBe('loves');
  });

  it('returns empty string for unknown words', () => {
    expect(gloss('slay')).toBe('');
  });
});

describe('jargon glossaries (non-blend voices)', () => {
  it('decodes a known word, ignoring case and punctuation', () => {
    const corporate = getTheme('corporate')!;
    expect(themeGloss(corporate, 'synergy')).toMatch(/combined output/i);
    // Capitalized + trailing comma, exactly as the generator renders it.
    expect(themeGloss(corporate, 'Synergy,')).toBe(themeGloss(corporate, 'synergy'));
    // Acronyms are stored lowercase but rendered upper-case in vocabulary.
    expect(themeGloss(corporate, 'KPI')).toMatch(/key performance/i);
  });

  it('returns empty string for unglossed and for glossary-less themes', () => {
    const corporate = getTheme('corporate')!;
    expect(themeGloss(corporate, 'definitelynotaword')).toBe('');
    // Blend themes carry no jargon glossary (they gloss Latin roots instead).
    expect(getTheme('yass-kween')!.glossary).toBeUndefined();
    expect(themeGloss(getTheme('yass-kween')!, 'slay')).toBe('');
  });

  it('the jargon-dense voices ship a glossary', () => {
    for (const id of [
      'corporate',
      'legalese',
      'hacker',
      'startup',
      'academia',
      'barista',
      'hoa',
      'conspiracy',
    ]) {
      const theme = getTheme(id)!;
      expect(theme.glossary, id).toBeDefined();
      expect(Object.keys(theme.glossary!).length, id).toBeGreaterThan(8);
    }
  });

  it('every glossary key corresponds to a real vocabulary word', () => {
    const vocab = (t: { words: string[] }) => new Set(t.words.map(glossKey));
    for (const theme of themes) {
      if (!theme.glossary) continue;
      const words = vocab(theme);
      for (const key of Object.keys(theme.glossary)) {
        expect(words.has(key), `${theme.id}:${key}`).toBe(true);
      }
    }
  });

  it('glossed words surface in generated text and trace back through themeGloss', () => {
    const theme = getTheme('legalese')!;
    const rich = generateRich({
      theme: 'legalese',
      units: 'words',
      count: 60,
      seed: 'q',
    });
    const decoded = rich.blocks
      .flat()
      .filter((tok) => !tok.op)
      .some((tok) => themeGloss(theme, tok.t) !== '');
    expect(decoded).toBe(true);
  });
});

describe('generateRich (token mode)', () => {
  it('produces text identical to generate() for the same options', () => {
    const opts = {
      theme: 'pirate',
      units: 'paragraphs',
      count: 2,
      seed: 'ahoy',
    } as const;
    const rich = generateRich(opts);
    expect(rich.text).toBe(generate(opts));
    expect(blocksToText(rich.blocks)).toBe(rich.text);
  });

  it('marks blend themes and carries Latin roots on their tokens', () => {
    const rich = generateRich({
      theme: 'yass-kween',
      units: 'paragraphs',
      count: 2,
      intensity: 0.6,
      seed: 'cicero',
    });
    expect(rich.isBlend).toBe(true);
    const everyToken = rich.blocks.flat();
    // At a moderate blend at least some words trace back to a Cicero root.
    expect(everyToken.some((t) => t.base !== null)).toBe(true);
  });

  it('non-blend voices carry no Latin roots on body words', () => {
    const rich = generateRich({
      theme: 'corporate',
      units: 'sentences',
      count: 3,
      seed: 'c',
    });
    expect(rich.isBlend).toBe(false);
    expect(rich.blocks.flat().every((t) => t.base === null)).toBe(true);
  });

  it('blocksToHtml escapes and wraps paragraphs', () => {
    const rich = generateRich({ units: 'paragraphs', count: 2, seed: 'h' });
    const html = blocksToHtml(rich.blocks);
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(html).not.toMatch(/&(?!(amp|lt|gt);)/);
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateRich({ theme: 'legalese', seed: 'x', count: 2 });
    const b = generateRich({ theme: 'legalese', seed: 'x', count: 2 });
    expect(a.text).toBe(b.text);
  });
});
