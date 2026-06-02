import type { Theme } from './types.js';
import { pick, type RandomFn } from '../rng.js';
import { LOREM_ORIGIN_WORDS } from './origins.js';
import { classic } from './classic.js';
import { yasskween } from './yasskween.js';
import { corporate } from './corporate.js';
import { pirate } from './pirate.js';
import { hacker } from './hacker.js';
import { startup } from './startup.js';
import { zen } from './zen.js';
import { legalese } from './legalese.js';
import { cat } from './cat.js';
import { academia } from './academia.js';
import { genz } from './genz.js';
import { boomer } from './boomer.js';
import { conspiracy } from './conspiracy.js';
import { dutch } from './dutch.js';
import { artist } from './artist.js';
import { barista } from './barista.js';
import { hoa } from './hoa.js';
import { hockey } from './hockey.js';
import { looksmaxxer } from './looksmaxxer.js';
import { announcer } from './announcer.js';
import { housewives } from './housewives.js';
import { ramsay } from './ramsay.js';
import { ikea } from './ikea.js';
import { brainrot } from './brainrot.js';
import { baudrillard } from './baudrillard.js';
import { aislop } from './aislop.js';
import { rimbaud } from './rimbaud.js';
import { huttese } from './huttese.js';

export type { Theme, IntensifyContext } from './types.js';

/**
 * The secret seed that unlocks the hidden Huttese theme. Pass `seed: "jabba"`
 * (case-insensitive) to summon it.
 */
export const EASTER_EGG_SEED = 'jabba';

/** The theme revealed by the {@link EASTER_EGG_SEED}. */
export const EASTER_EGG_THEME_ID = 'huttese';

/**
 * Give a voice the Latin blend: words are drawn from Cicero's genuine source
 * vocabulary and swapped for the theme's own words as intensity climbs, so the
 * dial runs from pure Latin (`0`) to the pure voice (`1`), the Latin showing
 * through in between. Voices that already define their own blend (Yass Kween,
 * Huttese) or that *are* the Latin (Classic) are returned untouched.
 */
export function withLatinBlend(theme: Theme): Theme {
  if (theme.blendBase || theme.intensify || theme.id === 'classic') {
    return theme;
  }
  const voice = theme.words;
  return {
    ...theme,
    blendBase: LOREM_ORIGIN_WORDS,
    // Draw a stable per-word threshold and a voice candidate unconditionally, so
    // each word's Latin→voice swap point is fixed and the dial crossfades
    // monotonically (no dead zones, no full-text reshuffle as it climbs).
    intensify: (word: string, intensity: number, rng: RandomFn): string => {
      const swap = rng() < intensity;
      const candidate = pick(rng, voice);
      return swap ? candidate : word;
    },
  };
}

/** Every built-in theme, in display order (includes hidden ones). */
export const themes: readonly Theme[] = [
  yasskween,
  classic,
  corporate,
  pirate,
  hacker,
  startup,
  zen,
  legalese,
  cat,
  academia,
  genz,
  boomer,
  conspiracy,
  dutch,
  artist,
  barista,
  hoa,
  hockey,
  looksmaxxer,
  announcer,
  housewives,
  ramsay,
  ikea,
  brainrot,
  baudrillard,
  aislop,
  rimbaud,
  huttese,
].map(withLatinBlend);

/** Themes shown in public listings (excludes hidden Easter-egg themes). */
export const visibleThemes: readonly Theme[] = themes.filter((t) => !t.hidden);

/** All built-in theme ids, useful for validation and CLI help. */
export type ThemeId =
  | 'yass-kween'
  | 'classic'
  | 'corporate'
  | 'pirate'
  | 'hacker'
  | 'startup'
  | 'zen'
  | 'legalese'
  | 'cat'
  | 'academia'
  | 'genz'
  | 'boomer'
  | 'conspiracy'
  | 'dutch'
  | 'artist'
  | 'barista'
  | 'hoa'
  | 'hockey'
  | 'looksmaxxer'
  | 'announcer'
  | 'housewives'
  | 'ramsay'
  | 'ikea'
  | 'brainrot'
  | 'baudrillard'
  | 'aislop'
  | 'rimbaud'
  | 'huttese';

/** The default theme id used when none is specified. */
export const DEFAULT_THEME_ID: ThemeId = 'yass-kween';

const themesById = new Map<string, Theme>(themes.map((t) => [t.id, t]));

/** Look up a theme by id, returning `undefined` if it is not registered. */
export function getTheme(id: string): Theme | undefined {
  return themesById.get(id);
}

/** All registered theme ids. */
export function listThemeIds(): string[] {
  return themes.map((t) => t.id);
}

/**
 * Normalize a rendered word to a glossary key: lowercase, with leading and
 * trailing punctuation stripped (internal hyphens and apostrophes are kept). So
 * `"Synergy,"` → `"synergy"` and `"low-hanging"` stays `"low-hanging"`.
 */
function glossKey(word: string): string {
  return String(word)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');
}

/**
 * Look up a plain-language gloss for a word within a non-blend theme's own
 * {@link Theme.glossary}. Matches case-insensitively and ignores surrounding
 * punctuation, so the rendered token `"Synergy,"` resolves to `"synergy"`.
 * Returns `''` when the theme has no glossary or the word isn't listed.
 */
export function themeGloss(theme: Theme, word: string): string {
  const glossary = theme.glossary;
  if (!glossary) return '';
  return glossary[glossKey(word)] ?? '';
}

export {
  classic,
  yasskween,
  corporate,
  pirate,
  hacker,
  startup,
  zen,
  legalese,
  cat,
  academia,
  genz,
  boomer,
  conspiracy,
  dutch,
  artist,
  barista,
  hoa,
  hockey,
  looksmaxxer,
  announcer,
  housewives,
  ramsay,
  ikea,
  brainrot,
  baudrillard,
  aislop,
  rimbaud,
  huttese,
};
