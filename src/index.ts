/**
 * yass-kween-dolor-ipsum
 * ------------------------
 * A themed placeholder-text generator. Lorem ipsum, but make it iconic.
 *
 * @packageDocumentation
 */

export {
  generate,
  generateDetailed,
  generateRich,
  blocksToText,
  blocksToHtml,
  ipsum,
  type GenerateOptions,
  type GenerateResult,
  type RichResult,
  type Token,
  type Unit,
  type Format,
} from './generator.js';

export {
  themes,
  visibleThemes,
  getTheme,
  listThemeIds,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
  type Theme,
  type ThemeId,
} from './themes/index.js';

export {
  LATIN_GLOSS,
  gloss,
  LOREM_ORIGIN_WORDS,
  LOREM_ORIGIN_STORY,
} from './themes/origins.js';

export { createRng, type RandomFn } from './rng.js';
