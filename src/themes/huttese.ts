import type { Theme } from './types.js';
import { type RandomFn, chance } from '../rng.js';
import { LOREM_ORIGIN_WORDS } from './origins.js';

/** Genuine Huttese words fused into the Latin as the dial climbs. */
const HUTT_WORDS = [
  'bargon',
  'bota',
  'chuba',
  'coona',
  'doompa',
  'goodde',
  'jee',
  'jee-jee',
  'killee',
  'mooie',
  'peedunkey',
  'poodoo',
  'wanta',
  'yatuka',
  'achuta',
  'bantha',
  'boonowa',
  'tweepi',
  'coo',
  'dopa',
  'gardo',
  'hagwa',
  'jeedai',
  'keepuna',
  'kung',
  'moocha',
  'nee',
  'choo',
  'noah',
  'stoopa',
  'wermo',
  'whiforce',
  'yaté',
  'tagwa',
  'murishani',
  'okkota',
  'pateesa',
  'rundee',
  'sleemo',
  'tonta',
  'uba',
  'wooky',
  'crispo',
  'grancha',
  'haku',
  'naga',
];

/**
 * Phonetically mutate a Latin word toward Huttese: harden c→k, soften v→w,
 * stretch endings, and draw out a vowel. Each rule fires with probability
 * scaled by intensity, so low intensity leaves the Latin mostly intact while
 * high intensity speaks fluent Hutt. Never introduces whitespace.
 */
function mutate(word: string, intensity: number, rng: RandomFn): string {
  let w = word;
  const apply = (p: number, fn: (s: string) => string): void => {
    if (chance(rng, p)) w = fn(w);
  };

  apply(intensity, (s) => s.replace(/qu/g, 'kw'));
  apply(intensity, (s) => s.replace(/c/g, 'k'));
  apply(intensity, (s) => s.replace(/x/g, 'ks'));
  apply(intensity, (s) => s.replace(/v/g, 'w'));
  apply(intensity, (s) => s.replace(/ph/g, 'f'));
  apply(intensity, (s) =>
    s.replace(/us$/, 'a').replace(/um$/, 'o').replace(/em$/, 'a').replace(/is$/, 'ee'),
  );
  // Draw out a vowel for that unmistakable Hutt cadence.
  apply(intensity * 0.6, (s) => {
    const i = s.search(/[aeiou]/);
    return i >= 0 ? `${s.slice(0, i + 1)}${s[i]}${s.slice(i + 1)}` : s;
  });

  return w;
}

/**
 * Huttese'd Latin. The hidden Easter-egg voice (summon with the seed "jabba").
 * Built on Cicero's lorem ipsum and mutated toward the language of the Hutts.
 */
export const huttese: Theme = {
  id: 'huttese',
  name: 'Huttese Cantina',
  description: 'Huttese’d Latin from a galaxy far, far away. Bo shuda!',
  emoji: '🐸',
  accent: '#7d8f23',
  // Hidden Easter egg: not shown in listings. Summon it with the seed "jabba".
  hidden: true,
  defaultIntensity: 0.6,
  origin:
    'Huttese is the fictional trade language of the Star Wars galaxy, spoken ' +
    'by Jabba the Hutt and heard across Tatooine. Its sound was devised by ' +
    'sound designer Ben Burtt, loosely inspired by Quechua. Here it is fused ' +
    'with Cicero’s Latin: "Bo shuda" is a greeting, "Boska" means "let\'s go", ' +
    'and "poodoo" is... best left untranslated at the dinner table.',
  // The Latin source is mutated toward Huttese as the dial climbs.
  blendBase: [...LOREM_ORIGIN_WORDS],
  words: HUTT_WORDS,
  openers: [
    'Achuta,',
    'H’chu apenkee,',
    'Koona t’chuta —',
    'Jabba wanna',
    'Bo shuda,',
    'Ee youdsa,',
    'Mee jewz ku,',
  ],
  interjections: [
    'Boska!',
    'Chuba!',
    'Ho ho ho!',
    'Bo shuda.',
    'De wanna wanga.',
    'Stoopa!',
    'Bargon u noa-a-uyat.',
  ],
  intensify: (word, intensity, rng) => {
    // Draw the swap decision, the Huttese candidate, and the phonetic mutation
    // unconditionally so RNG consumption is the same at any intensity (mutate()
    // already draws a fixed number). The dial then crossfades smoothly from
    // Latin to huttese'd Latin instead of reshuffling as it climbs.
    const doSwap = rng() < intensity * 0.5;
    const index = Math.floor(rng() * HUTT_WORDS.length);
    const mutated = mutate(word, intensity, rng);
    return doSwap ? (HUTT_WORDS[index] as string) : mutated;
  },
};
