import type { Theme } from './types.js';
import { type RandomFn, chance, intBetween, pick } from '../rng.js';
import { LOREM_ORIGIN_WORDS, LOREM_ORIGIN_STORY } from './origins.js';

const SPARKLES = ['✨', '💅', '👑', '💖', '🔥'] as const;
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

/**
 * The signature stylizer. As intensity climbs from 0 → 1 the word gets more
 * extra: elongated vowels ("slay" → "slayyy"), the occasional SHOUT, and a
 * sprinkle of sparkle. At low intensity it leaves words untouched so the
 * ancient Latin roots can shine through. Never introduces whitespace.
 */
function yassify(word: string, intensity: number, rng: RandomFn): string {
  let w = word;

  // Elongate a trailing vowel for emphasis once we're past the midpoint.
  if (intensity > 0.55 && chance(rng, (intensity - 0.5) * 0.7)) {
    const last = w[w.length - 1] ?? '';
    if (VOWELS.has(last.toLowerCase())) {
      w += last.repeat(intBetween(rng, 1, 3));
    } else {
      // Append a trailing flourish vowel for consonant-final words.
      const flourish = pick(rng, ['yy', 'ss', 'hh']);
      w += flourish;
    }
  }

  // SHOUT the whole word when things get truly iconic.
  if (intensity > 0.75 && chance(rng, (intensity - 0.7) * 0.6)) {
    w = w.toUpperCase();
  }

  // Sprinkle sparkle, scaled by intensity.
  if (chance(rng, intensity * 0.18)) {
    w += pick(rng, SPARKLES);
  }

  return w;
}

/** The signature voice of the project: unapologetically sassy, supportive, extra. */
export const yasskween: Theme = {
  id: 'yass-kween',
  name: 'Yass Kween',
  description: 'Sassy, supportive, and absolutely serving. The house voice.',
  emoji: '💅',
  defaultIntensity: 0.85,
  origin: LOREM_ORIGIN_STORY,
  // At low intensity these genuine Cicero words resurface, carrying the
  // obscure origins of lorem ipsum.
  originWords: [...LOREM_ORIGIN_WORDS],
  words: [
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
    'the',
    'assignment',
    'ate',
    'left',
    'no',
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
    'glowing',
    'majestic',
    'divine',
    'reign',
    'rule',
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
  ],
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
