/**
 * yass-kween-dolor-ipsum
 * ------------------------
 * A themed placeholder-text generator. Lorem ipsum, but make it iconic.
 *
 * @packageDocumentation
 */

export {
  generate,
  ipsum,
  type GenerateOptions,
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

export { createRng, type RandomFn } from './rng.js';
