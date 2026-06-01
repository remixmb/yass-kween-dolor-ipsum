import type { Theme } from './types.js';
import { type RandomFn, chance, intBetween, pick } from '../rng.js';
import { LOREM_ORIGIN_WORDS, LOREM_ORIGIN_STORY } from './origins.js';

const SPARKLES = ['✨', '💅', '👑', '💖', '🔥'] as const;
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

/** The sass vocabulary fused into the Latin as the dial climbs. */
const SASS = [
  'slay',
  'queen',
  'iconic',
  'serving',
  'looks',
  'periodt',
  'vibe',
  'energy',
  'flawless',
  'gorgeous',
  'stunning',
  'glamour',
  'fierce',
  'legendary',
  'main',
  'character',
  'moment',
  'understood',
  'assignment',
  'ate',
  'crumbs',
  'sparkle',
  'shine',
  'glow',
  'radiant',
  'confidence',
  'unbothered',
  'thriving',
  'blessed',
  'manifesting',
  'aura',
  'goddess',
  'royalty',
  'crown',
  'tiara',
  'glitter',
  'fabulous',
  'devastating',
  'chic',
  'effortless',
  'snatched',
  'majestic',
  'divine',
  'reign',
  'supreme',
  'unstoppable',
  'powerful',
  'magnetic',
  'dazzling',
  'opulent',
  'luxurious',
  'extravagant',
  'bold',
  'brilliant',
  'radiance',
  'magic',
];

/**
 * Yassify a word. Each base Latin word is fused toward the sass: as intensity
 * climbs it may be swapped for a sass word, then elongated, SHOUTED, and
 * sparkled. At intensity 0 the Latin passes through untouched, so lowering the
 * dial reveals Cicero underneath the glam. Never introduces whitespace.
 */
function yassify(word: string, intensity: number, rng: RandomFn): string {
  // Blend: sometimes swap the Latin root for full sass, more often as the dial
  // climbs — the rest stays Latin, yielding yassified Latin.
  let w = chance(rng, intensity * 0.5) ? pick(rng, SASS) : word;

  // Elongate a trailing letter for emphasis.
  if (intensity > 0.4 && chance(rng, (intensity - 0.35) * 0.7)) {
    const last = w[w.length - 1] ?? '';
    w += VOWELS.has(last.toLowerCase())
      ? last.repeat(intBetween(rng, 1, 3))
      : pick(rng, ['yy', 'ss', 'hh']);
  }

  // SHOUT the whole word when things get truly iconic.
  if (intensity > 0.7 && chance(rng, (intensity - 0.65) * 0.6)) {
    w = w.toUpperCase();
  }

  // Sprinkle sparkle, scaled by intensity.
  if (chance(rng, intensity * 0.16)) {
    w += pick(rng, SPARKLES);
  }

  return w;
}

/**
 * The signature voice: yassified Latin. Built on Cicero's genuine lorem ipsum
 * vocabulary and fused with sass as the intensity dial climbs.
 */
export const yasskween: Theme = {
  id: 'yass-kween',
  name: 'Yass Kween',
  description: 'Yassified Latin — Cicero, but make it iconic. The house voice.',
  emoji: '💅',
  defaultIntensity: 0.85,
  origin: LOREM_ORIGIN_STORY,
  // The genuine Latin source of lorem ipsum is the canvas; yassify paints on it.
  blendBase: [...LOREM_ORIGIN_WORDS],
  words: SASS,
  openers: [
    'Honestly,',
    'Not to be dramatic, but',
    'Listen,',
    'The way you',
    'Okay but',
    'No because',
    'Real talk,',
    'And I oop—',
  ],
  interjections: [
    'Yass!',
    'Periodt.',
    'We love to see it.',
    'Iconic behavior.',
    'And that is on confidence.',
    'No crumbs left.',
    'She ate.',
    'Slay all day.',
  ],
  intensify: yassify,
};
