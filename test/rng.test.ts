import { describe, it, expect } from 'vitest';
import { createRng, pick, intBetween, chance, shuffle } from '../src/rng.js';

describe('createRng', () => {
  it('is deterministic for a numeric seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('is deterministic for a string seed', () => {
    const a = createRng('yass');
    const b = createRng('yass');
    expect(a()).toBe(b());
  });

  it('produces different streams for different seeds', () => {
    const a = createRng('queen');
    const b = createRng('king');
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = createRng(1);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('throws on an empty array', () => {
    const rng = createRng(1);
    expect(() => pick(rng, [])).toThrow();
  });
});

describe('intBetween', () => {
  it('stays within the inclusive range', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = intBetween(rng, 3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('handles a single-value range', () => {
    const rng = createRng(1);
    expect(intBetween(rng, 5, 5)).toBe(5);
  });

  it('throws when max < min', () => {
    const rng = createRng(1);
    expect(() => intBetween(rng, 10, 1)).toThrow(RangeError);
  });
});

describe('chance', () => {
  it('clamps probabilities', () => {
    const rng = createRng(1);
    expect(chance(rng, -1)).toBe(false);
    expect(chance(rng, 2)).toBe(true);
  });

  it('roughly matches the requested probability', () => {
    const rng = createRng(123);
    let hits = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (chance(rng, 0.3)) hits++;
    }
    const ratio = hits / trials;
    expect(ratio).toBeGreaterThan(0.27);
    expect(ratio).toBeLessThan(0.33);
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const rng = createRng(5);
    const items = [1, 2, 3, 4, 5];
    const shuffled = shuffle(rng, items);
    expect(shuffled.slice().sort()).toEqual(items);
  });

  it('does not mutate the input', () => {
    const rng = createRng(5);
    const items = [1, 2, 3];
    shuffle(rng, items);
    expect(items).toEqual([1, 2, 3]);
  });
});
