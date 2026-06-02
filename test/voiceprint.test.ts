import { describe, it, expect } from 'vitest';
import { voiceFromText, generate, withLatinBlend } from '../src/index.js';

const SAMPLE = `Synergy drives our roadmap. Synergy unlocks the roadmap.
We leverage synergy to optimize the roadmap. Roadmap, roadmap, synergy!
We believe in alignment. Ship it.`;

describe('voiceFromText (voiceprint)', () => {
  it("derives the source's distinctive words, excluding stopwords", () => {
    const v = voiceFromText(SAMPLE);
    expect(v.words).toContain('synergy');
    expect(v.words).toContain('roadmap');
    expect(v.words).not.toContain('the');
    expect(v.words).not.toContain('we');
    expect(v.words.length).toBeGreaterThan(0);
  });

  it('ranks more frequent words near the front', () => {
    const v = voiceFromText(SAMPLE);
    expect(v.words.slice(0, 3)).toContain('synergy');
  });

  it('derives openers from sentence starts and interjections from short sentences', () => {
    const v = voiceFromText(SAMPLE);
    expect((v.openers ?? []).some((o) => /we believe/i.test(o))).toBe(true);
    expect((v.interjections ?? []).some((s) => /ship it/i.test(s))).toBe(true);
  });

  it('produces a valid hex accent and is fully deterministic', () => {
    const a = voiceFromText(SAMPLE);
    const b = voiceFromText(SAMPLE);
    expect(a.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(a).toEqual(b);
  });

  it('different text yields a different accent', () => {
    expect(voiceFromText('alpha beta gamma alpha').accent).not.toBe(
      voiceFromText('delta epsilon zeta delta').accent,
    );
  });

  it('throws when there are no usable words', () => {
    expect(() => voiceFromText('   1234 !!! ')).toThrow(/sample text/i);
    expect(() => voiceFromText('')).toThrow(/sample text/i);
  });

  it('generates placeholder text from the cloned voice (plain)', () => {
    const v = voiceFromText(SAMPLE);
    const vocab = new Set(v.words);
    const out = generate({ theme: v, units: 'words', count: 20, seed: 'k' });
    for (const w of out.split(/\s+/)) {
      expect(vocab.has(w.replace(/[.,!?;]+$/, '').toLowerCase()), w).toBe(true);
    }
  });

  it('gets the Latin <-> voice dial when wrapped with withLatinBlend', () => {
    const v = withLatinBlend(voiceFromText(SAMPLE));
    expect(v.blendBase).toBeDefined();
    const cold = generate({ theme: v, units: 'words', count: 12, intensity: 0, seed: 'k' });
    const hot = generate({ theme: v, units: 'words', count: 12, intensity: 1, seed: 'k' });
    expect(cold).not.toBe(hot);
  });
});
