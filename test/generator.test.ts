import { describe, it, expect } from 'vitest';
import { generate, ipsum } from '../src/generator.js';
import type { Theme } from '../src/themes/index.js';

describe('generate — defaults', () => {
  it('produces 3 paragraphs by default', () => {
    const text = generate({ seed: 'default' });
    const paragraphs = text.split('\n\n');
    expect(paragraphs).toHaveLength(3);
    for (const p of paragraphs) {
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it('starts sentences with a capital letter and ends with punctuation', () => {
    const text = generate({ units: 'sentences', count: 5, seed: 'caps' });
    const sentences = text.match(/[^.!?]+[.!?]/g) ?? [];
    expect(sentences.length).toBeGreaterThan(0);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      expect(trimmed[0]).toBe(trimmed[0]?.toUpperCase());
      expect(/[.!?]$/.test(trimmed)).toBe(true);
    }
  });
});

describe('generate — determinism', () => {
  it('returns identical output for identical seed and options', () => {
    const opts = {
      theme: 'pirate',
      units: 'paragraphs',
      count: 2,
      seed: 'ahoy',
    } as const;
    expect(generate(opts)).toBe(generate(opts));
  });

  it('returns different output for different seeds', () => {
    const a = generate({ seed: 'one', units: 'paragraphs', count: 2 });
    const b = generate({ seed: 'two', units: 'paragraphs', count: 2 });
    expect(a).not.toBe(b);
  });
});

describe('generate — units and counts', () => {
  it('produces the exact requested number of words', () => {
    const text = generate({ units: 'words', count: 10, seed: 'w' });
    expect(text.split(/\s+/)).toHaveLength(10);
  });

  it('produces the requested number of paragraphs', () => {
    const text = generate({ units: 'paragraphs', count: 5, seed: 'p' });
    expect(text.split('\n\n')).toHaveLength(5);
  });

  it('clamps count to at least 1', () => {
    const text = generate({ units: 'paragraphs', count: 0, seed: 'z' });
    expect(text.split('\n\n')).toHaveLength(1);
  });

  it('floors fractional counts', () => {
    const text = generate({ units: 'words', count: 4.9, seed: 'f' });
    expect(text.split(/\s+/)).toHaveLength(4);
  });
});

describe('generate — html format', () => {
  it('wraps paragraphs in <p> tags', () => {
    const html = generate({ units: 'paragraphs', count: 2, format: 'html', seed: 'h' });
    const matches = html.match(/<p>.*?<\/p>/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it('wraps words and sentences in a single <p>', () => {
    const html = generate({ units: 'words', count: 6, format: 'html', seed: 'h2' });
    expect(html.startsWith('<p>')).toBe(true);
    expect(html.endsWith('</p>')).toBe(true);
    expect(html.match(/<p>/g)).toHaveLength(1);
  });

  it('escapes HTML-unsafe characters from custom theme content', () => {
    const sneaky: Theme = {
      id: 'sneaky',
      name: 'Sneaky',
      description: 'injection attempt',
      emoji: '🐍',
      words: ['<script>', 'a&b', '<b>'],
    };
    const html = generate({ theme: sneaky, units: 'words', count: 6, format: 'html' });
    // No raw tags or ampersands leak through…
    expect(html).not.toMatch(/<script>/);
    expect(html).not.toMatch(/<b>/);
    expect(html).not.toMatch(/&(?!(amp|lt|gt);)/);
    // …they are rendered as entities instead.
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a&amp;b');
    // The wrapping <p> tags themselves are intact.
    expect(html.startsWith('<p>')).toBe(true);
    expect(html.endsWith('</p>')).toBe(true);
  });
});

describe('generate — startWithLorem', () => {
  it('begins with the classic opening', () => {
    const text = generate({
      startWithLorem: true,
      units: 'paragraphs',
      count: 1,
      seed: 's',
    });
    expect(text.toLowerCase().startsWith('lorem ipsum dolor sit amet')).toBe(true);
  });

  it('works for the words unit too', () => {
    const text = generate({
      startWithLorem: true,
      units: 'words',
      count: 8,
      seed: 's2',
    });
    expect(text.toLowerCase().startsWith('lorem ipsum dolor sit amet')).toBe(true);
  });
});

describe('generate — theme handling', () => {
  it('accepts a theme id', () => {
    expect(() => generate({ theme: 'corporate', seed: 'c' })).not.toThrow();
  });

  it('accepts a custom Theme object', () => {
    const custom: Theme = {
      id: 'test-theme',
      name: 'Test',
      description: 'test',
      emoji: '🧪',
      words: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'],
    };
    const text = generate({ theme: custom, units: 'words', count: 4, seed: 'ct' });
    const words = text.split(/\s+/);
    for (const word of words) {
      expect(custom.words).toContain(word.toLowerCase());
    }
  });

  it('throws a helpful error for an unknown theme id', () => {
    expect(() => generate({ theme: 'nonexistent' })).toThrow(/Unknown theme/);
  });
});

describe('ipsum helper', () => {
  it('mirrors generate for each unit', () => {
    expect(ipsum.words(5, { seed: 'i' })).toBe(
      generate({ units: 'words', count: 5, seed: 'i' }),
    );
    expect(ipsum.sentences(3, { seed: 'i' })).toBe(
      generate({ units: 'sentences', count: 3, seed: 'i' }),
    );
    expect(ipsum.paragraphs(2, { seed: 'i' })).toBe(
      generate({ units: 'paragraphs', count: 2, seed: 'i' }),
    );
  });
});

describe('generate — sentence shaping', () => {
  it('respects custom words-per-sentence bounds', () => {
    const text = generate({
      units: 'sentences',
      count: 1,
      seed: 'bounds',
      minWordsPerSentence: 4,
      maxWordsPerSentence: 4,
      theme: 'classic', // no openers/interjections to skew the count
    });
    const wordCount = text
      .replace(/[.!?,]/g, '')
      .trim()
      .split(/\s+/).length;
    expect(wordCount).toBe(4);
  });
});
