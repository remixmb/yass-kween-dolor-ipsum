import {
  type Theme,
  getTheme,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
} from './themes/index.js';
import { type RandomFn, createRng, pick, intBetween, chance } from './rng.js';

/** The unit of text to generate. */
export type Unit = 'words' | 'sentences' | 'paragraphs';

/** Output format. */
export type Format = 'text' | 'html';

/** The canonical opening of the original lorem ipsum passage. */
const CLASSIC_OPENING = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

/** Options accepted by {@link generate}. */
export interface GenerateOptions {
  /**
   * Theme id (e.g. `"yass-kween"`) or a {@link Theme} object. Defaults to the
   * house theme.
   */
  theme?: string | Theme;
  /** What to count. Defaults to `"paragraphs"`. */
  units?: Unit;
  /** How many `units` to produce. Defaults to `3`. Clamped to `>= 1`. */
  count?: number;
  /**
   * Seed for deterministic output. Same seed + options ⇒ identical text. When
   * omitted, output is randomized per call.
   */
  seed?: number | string;
  /** Output format. Defaults to `"text"`. */
  format?: Format;
  /**
   * Begin the very first sentence with the familiar "Lorem ipsum dolor sit
   * amet" so output reads like traditional filler. Defaults to `false`.
   */
  startWithLorem?: boolean;
  /**
   * The "temperature" of the blend, in the range `[0, 1]` (values outside are
   * clamped). Think cold → hot: turn it **down** and the output runs _cold_ —
   * calm, with the raw Latin showing through. Turn it **up** and it runs _hot_
   * — more flair and punctuation, and the theme's stylizer goes all-in (full
   * yassified / huttese'd Latin). Defaults to the theme's natural temperature.
   *
   * `temperature` is the friendly alias; both map to the same dial.
   */
  intensity?: number;
  /** Alias for {@link GenerateOptions.intensity} — the temperature dial (0–1). */
  temperature?: number;
  /** Minimum words per sentence. Defaults to `5`. */
  minWordsPerSentence?: number;
  /** Maximum words per sentence. Defaults to `15`. */
  maxWordsPerSentence?: number;
  /** Minimum sentences per paragraph. Defaults to `3`. */
  minSentencesPerParagraph?: number;
  /** Maximum sentences per paragraph. Defaults to `6`. */
  maxSentencesPerParagraph?: number;
}

interface ResolvedOptions {
  theme: Theme;
  units: Unit;
  count: number;
  format: Format;
  startWithLorem: boolean;
  intensity: number;
  minWordsPerSentence: number;
  maxWordsPerSentence: number;
  minSentencesPerParagraph: number;
  maxSentencesPerParagraph: number;
  rng: RandomFn;
}

const COMMA_PROBABILITY = 0.28;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function resolveTheme(theme: GenerateOptions['theme']): Theme {
  if (theme && typeof theme === 'object') {
    return theme;
  }
  const id = theme ?? DEFAULT_THEME_ID;
  const found = getTheme(id);
  if (!found) {
    throw new Error(
      `Unknown theme "${id}". Use one of the registered theme ids or pass a Theme object.`,
    );
  }
  return found;
}

function resolveOptions(options: GenerateOptions): ResolvedOptions {
  const minWords = Math.max(1, options.minWordsPerSentence ?? 5);
  const maxWords = Math.max(minWords, options.maxWordsPerSentence ?? 15);
  const minSentences = Math.max(1, options.minSentencesPerParagraph ?? 3);
  const maxSentences = Math.max(minSentences, options.maxSentencesPerParagraph ?? 6);
  let theme = resolveTheme(options.theme);

  // Hidden Easter egg: the secret seed summons Jabba's Huttese, whatever theme
  // was requested. Bo shuda!
  if (
    typeof options.seed === 'string' &&
    options.seed.trim().toLowerCase() === EASTER_EGG_SEED
  ) {
    theme = getTheme(EASTER_EGG_THEME_ID) ?? theme;
  }

  return {
    theme,
    units: options.units ?? 'paragraphs',
    count: Math.max(1, Math.floor(options.count ?? 3)),
    format: options.format ?? 'text',
    startWithLorem: options.startWithLorem ?? false,
    // `intensity` and its friendly alias `temperature` drive the same dial.
    intensity: clamp01(
      options.intensity ?? options.temperature ?? theme.defaultIntensity ?? 0.5,
    ),
    minWordsPerSentence: minWords,
    maxWordsPerSentence: maxWords,
    minSentencesPerParagraph: minSentences,
    maxSentencesPerParagraph: maxSentences,
    rng: createRng(options.seed),
  };
}

function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word[0]!.toUpperCase() + word.slice(1);
}

/** Strip trailing sentence punctuation so phrases compose cleanly. */
function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.!?,;]+$/, '');
}

/**
 * Sample one raw vocabulary word. Blend themes always draw from their base
 * lexicon (the genuine Latin lorem ipsum source); the theme's `intensify` then
 * fuses each Latin word toward the voice, scaled by intensity — producing
 * "yassified Latin" / "huttese'd Latin". Non-blend themes draw from their own
 * vocabulary.
 */
function sampleVocab(opts: ResolvedOptions): string {
  const { theme, rng } = opts;
  const base = theme.blendBase;
  if (base && base.length > 0) {
    return pick(rng, base);
  }
  return pick(rng, theme.words);
}

/** Choose a sentence ending; exclamation grows with intensity. */
function pickEnding(opts: ResolvedOptions): string {
  const { rng, intensity } = opts;
  if (chance(rng, intensity * 0.5)) return '!';
  if (chance(rng, 0.1 + intensity * 0.1)) return '?';
  return '.';
}

/**
 * Build a single sentence: an optional opener, a run of theme words (styled by
 * the theme's intensifier) with the occasional comma, capitalized and
 * punctuated.
 */
function buildSentence(opts: ResolvedOptions, isFirst: boolean): string {
  const { rng, theme, intensity } = opts;
  const targetLength = intBetween(
    rng,
    opts.minWordsPerSentence,
    opts.maxWordsPerSentence,
  );

  const tokens: string[] = [];

  // Seed the first sentence with the classic opening when requested. These
  // tokens are protected from styling and comma insertion so the familiar
  // phrase stays intact.
  let protectedCount = 0;
  if (isFirst && opts.startWithLorem) {
    tokens.push(...CLASSIC_OPENING);
    protectedCount = CLASSIC_OPENING.length;
  }

  // Openers grow more likely as intensity climbs.
  const openerProbability = 0.1 + intensity * 0.55;
  let opener: string | undefined;
  if (
    !opts.startWithLorem &&
    theme.openers &&
    theme.openers.length > 0 &&
    chance(rng, openerProbability)
  ) {
    opener = pick(rng, theme.openers);
  }

  // Sample words, avoiding immediate repeats, then apply the theme's stylizer.
  let previous = '';
  while (tokens.length < targetLength) {
    let base = sampleVocab(opts);
    if (base === previous) base = sampleVocab(opts);
    previous = base;
    const styled = theme.intensify ? theme.intensify(base, intensity, rng) : base;
    tokens.push(styled);
  }

  // Sprinkle commas at internal word boundaries, never inside the protected
  // classic opening.
  const commaStart = Math.max(1, protectedCount);
  for (let i = commaStart; i < tokens.length - 1; i++) {
    if (chance(rng, COMMA_PROBABILITY / Math.max(1, tokens.length / 6))) {
      tokens[i] = `${tokens[i]},`;
    }
  }

  let body = tokens.join(' ');
  if (opener) {
    body = `${stripTrailingPunctuation(opener)} ${body}`;
  }

  return `${capitalize(body)}${pickEnding(opts)}`;
}

/** Build a paragraph from several sentences with occasional interjections. */
function buildParagraph(opts: ResolvedOptions, isFirstParagraph: boolean): string {
  const { rng, theme, intensity } = opts;
  const sentenceCount = intBetween(
    rng,
    opts.minSentencesPerParagraph,
    opts.maxSentencesPerParagraph,
  );

  // Interjections scale with intensity, fading away as the dial drops.
  const interjectionProbability = intensity * 0.4;

  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    const isFirst = isFirstParagraph && i === 0;
    sentences.push(buildSentence(opts, isFirst));
    if (
      i < sentenceCount - 1 &&
      theme.interjections &&
      theme.interjections.length > 0 &&
      chance(rng, interjectionProbability)
    ) {
      sentences.push(pick(rng, theme.interjections));
    }
  }
  return sentences.join(' ');
}

/** Produce exactly `count` standalone words. */
function buildWords(opts: ResolvedOptions): string {
  const { rng, theme, intensity } = opts;
  const words: string[] = [];

  if (opts.startWithLorem) {
    words.push(...CLASSIC_OPENING);
  }

  while (words.length < opts.count) {
    const base = sampleVocab(opts);
    words.push(theme.intensify ? theme.intensify(base, intensity, rng) : base);
  }

  return words.slice(0, opts.count).join(' ');
}

function wrapHtml(blocks: string[]): string {
  return blocks.map((block) => `<p>${block}</p>`).join('\n');
}

/** The text plus metadata about how it was produced. */
export interface GenerateResult {
  /** The generated text. */
  text: string;
  /** The theme actually used (after any Easter-egg override). */
  theme: Theme;
  /** The resolved intensity in `[0, 1]`. */
  intensity: number;
}

function buildText(opts: ResolvedOptions): string {
  if (opts.units === 'words') {
    const words = buildWords(opts);
    return opts.format === 'html' ? `<p>${words}</p>` : words;
  }

  const blocks: string[] = [];
  if (opts.units === 'sentences') {
    // Render the requested number of sentences as a single block.
    const sentences: string[] = [];
    for (let i = 0; i < opts.count; i++) {
      sentences.push(buildSentence(opts, i === 0));
    }
    blocks.push(sentences.join(' '));
  } else {
    for (let i = 0; i < opts.count; i++) {
      blocks.push(buildParagraph(opts, i === 0));
    }
  }

  return opts.format === 'html' ? wrapHtml(blocks) : blocks.join('\n\n');
}

/**
 * Generate themed placeholder text along with the theme and intensity used.
 * Handy when the {@link GenerateOptions.seed} might trigger the hidden Easter
 * egg and you want to know which voice actually spoke.
 */
export function generateDetailed(options: GenerateOptions = {}): GenerateResult {
  const opts = resolveOptions(options);
  return { text: buildText(opts), theme: opts.theme, intensity: opts.intensity };
}

/**
 * Generate themed placeholder text.
 *
 * @example
 * ```ts
 * generate({ theme: 'pirate', units: 'sentences', count: 2, seed: 'ahoy' });
 * // Lower the dial to reveal the genuine Latin under the yassified blend:
 * generate({ theme: 'yass-kween', intensity: 0.1, seed: 'cicero' });
 * ```
 */
export function generate(options: GenerateOptions = {}): string {
  return generateDetailed(options).text;
}

/**
 * Convenience helpers mirroring popular ipsum APIs.
 */
export const ipsum = {
  words: (count: number, options: Omit<GenerateOptions, 'units' | 'count'> = {}) =>
    generate({ ...options, units: 'words', count }),
  sentences: (count: number, options: Omit<GenerateOptions, 'units' | 'count'> = {}) =>
    generate({ ...options, units: 'sentences', count }),
  paragraphs: (count: number, options: Omit<GenerateOptions, 'units' | 'count'> = {}) =>
    generate({ ...options, units: 'paragraphs', count }),
};
