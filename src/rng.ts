/**
 * Tiny, dependency-free seeded pseudo-random number generator.
 *
 * Determinism matters here: given the same seed, the generator produces the
 * exact same stream of values. That keeps generated ipsum reproducible, which
 * makes the output testable and lets users share a `seed` to get identical text.
 */

/** A function returning a float in the half-open interval `[0, 1)`. */
export type RandomFn = () => number;

/**
 * `xmur3` string hasher — turns an arbitrary string into a well-mixed 32-bit
 * seed. Used so that human-friendly string seeds (e.g. `"yass"`) spread evenly
 * across the PRNG's state space instead of clustering.
 */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * `mulberry32` — a compact, fast 32-bit PRNG with good statistical quality for
 * non-cryptographic use. Returns a stateful function producing `[0, 1)` floats.
 */
function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded {@link RandomFn}.
 *
 * @param seed - A number or string seed. When omitted, a non-deterministic
 *   seed derived from the current time is used.
 */
export function createRng(seed?: number | string): RandomFn {
  let numericSeed: number;
  if (seed === undefined) {
    numericSeed = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
  } else if (typeof seed === 'string') {
    numericSeed = xmur3(seed)();
  } else {
    numericSeed = seed >>> 0;
  }
  return mulberry32(numericSeed);
}

/** Pick a uniformly random element from a non-empty array. */
export function pick<T>(rng: RandomFn, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty array.');
  }
  const index = Math.floor(rng() * items.length);
  // `index` is always within bounds, but `noUncheckedIndexedAccess` widens the
  // type, so assert the element exists.
  return items[index] as T;
}

/** Return a random integer in the inclusive range `[min, max]`. */
export function intBetween(rng: RandomFn, min: number, max: number): number {
  if (max < min) {
    throw new RangeError(`intBetween: max (${max}) must be >= min (${min}).`);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

/** Return `true` with probability `p` (clamped to `[0, 1]`). */
export function chance(rng: RandomFn, p: number): boolean {
  return rng() < Math.min(1, Math.max(0, p));
}

/**
 * Fisher–Yates shuffle returning a new array. Useful for sampling words
 * without repetition.
 */
export function shuffle<T>(rng: RandomFn, items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = tmp;
  }
  return result;
}
