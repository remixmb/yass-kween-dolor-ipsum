import type { Theme } from './types.js';
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
import { huttese } from './huttese.js';

export type { Theme } from './types.js';

/**
 * The secret seed that unlocks the hidden Huttese theme. Pass `seed: "jabba"`
 * (case-insensitive) to summon it.
 */
export const EASTER_EGG_SEED = 'jabba';

/** The theme revealed by the {@link EASTER_EGG_SEED}. */
export const EASTER_EGG_THEME_ID = 'huttese';

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
  huttese,
];

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
  huttese,
};
