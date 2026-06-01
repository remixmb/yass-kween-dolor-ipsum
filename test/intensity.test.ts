import { describe, it, expect } from 'vitest';
import { generate, getTheme } from '../src/index.js';
import { LOREM_ORIGIN_WORDS } from '../src/themes/origins.js';

const originSet = new Set(LOREM_ORIGIN_WORDS);

describe('intensity — lessening the yassification', () => {
  it('at intensity 0, Yass Kween surfaces only its genuine Latin origins', () => {
    const text = generate({
      theme: 'yass-kween',
      units: 'words',
      count: 40,
      intensity: 0,
      seed: 'cicero',
    });
    for (const word of text.split(/\s+/)) {
      expect(originSet.has(word)).toBe(true);
    }
  });

  it('at intensity 0, sentences never use exclamation endings', () => {
    const text = generate({
      theme: 'yass-kween',
      units: 'paragraphs',
      count: 6,
      intensity: 0,
      seed: 'calm',
    });
    expect(text).not.toContain('!');
  });

  it('clamps out-of-range intensity values', () => {
    const low = generate({ units: 'words', count: 20, intensity: -5, seed: 's' });
    const lowClamped = generate({ units: 'words', count: 20, intensity: 0, seed: 's' });
    expect(low).toBe(lowClamped);

    const high = generate({ units: 'words', count: 20, intensity: 50, seed: 's' });
    const highClamped = generate({
      units: 'words',
      count: 20,
      intensity: 1,
      seed: 's',
    });
    expect(high).toBe(highClamped);
  });
});

describe('intensity — intensifying the yassification', () => {
  it('at high intensity, Yass Kween glams up its words', () => {
    const text = generate({
      theme: 'yass-kween',
      units: 'words',
      count: 80,
      intensity: 1,
      seed: 'glam',
    });
    // Over many words at max intensity, the stylizer should add sparkle emoji
    // and/or SHOUT at least once.
    const hasSparkle = /[✨💅👑💖🔥]/u.test(text);
    const hasShout = text.split(/\s+/).some((w) => /[A-Z]{2,}/.test(w));
    expect(hasSparkle || hasShout).toBe(true);
  });

  it('different intensities yield different output for the same seed', () => {
    const calm = generate({ units: 'paragraphs', count: 2, intensity: 0.1, seed: 'x' });
    const extra = generate({ units: 'paragraphs', count: 2, intensity: 1, seed: 'x' });
    expect(calm).not.toBe(extra);
  });

  it('accepts `temperature` as an alias for `intensity`', () => {
    const viaTemperature = generate({
      units: 'words',
      count: 20,
      temperature: 0.2,
      seed: 't',
    });
    const viaIntensity = generate({
      units: 'words',
      count: 20,
      intensity: 0.2,
      seed: 't',
    });
    expect(viaTemperature).toBe(viaIntensity);
  });

  it('falls back to the theme default intensity when unspecified', () => {
    const explicit = generate({
      theme: 'yass-kween',
      units: 'paragraphs',
      count: 2,
      intensity: getTheme('yass-kween')!.defaultIntensity!,
      seed: 'd',
    });
    const implicit = generate({
      theme: 'yass-kween',
      units: 'paragraphs',
      count: 2,
      seed: 'd',
    });
    expect(implicit).toBe(explicit);
  });
});
