import {
  type Theme,
  getTheme,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
} from './themes/index.js';
import { type RandomFn, createRng, pick, intBetween, chance } from './rng.js';

/** The unit of text to generate. */
export type Unit = 'words' | 'sentences' | 'paragraphs' | 'characters';

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
   * Whether a theme's stylizer may append decorative emoji (e.g. Yass Kween's
   * sparkles). Set `false` for clean placeholder text; toggling never changes
   * the underlying words, only the emoji. Defaults to `true`.
   */
  emoji?: boolean;
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
  emoji: boolean;
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
    emoji: options.emoji ?? true,
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

/**
 * Choose a sentence ending; exclamation grows with intensity. Both decision
 * draws are taken unconditionally so RNG consumption never depends on intensity
 * — the key to a blend dial that crossfades smoothly instead of reshuffling the
 * whole text every time a probability flips.
 */
function pickEnding(opts: ResolvedOptions): string {
  const { rng, intensity } = opts;
  const exclaim = rng() < intensity * 0.5;
  const question = rng() < 0.1 + intensity * 0.1;
  if (exclaim) return '!';
  if (question) return '?';
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

  // Openers grow more likely as intensity climbs. Draw the decision and the
  // candidate unconditionally (intensity-independent consumption), then use the
  // opener only when the dial calls for it.
  const openerProbability = 0.1 + intensity * 0.55;
  let opener: string | undefined;
  if (!opts.startWithLorem && theme.openers && theme.openers.length > 0) {
    const showOpener = rng() < openerProbability;
    const candidate = pick(rng, theme.openers);
    if (showOpener) opener = candidate;
  }

  // Sample words, avoiding immediate repeats, then apply the theme's stylizer.
  let previous = '';
  while (tokens.length < targetLength) {
    let base = sampleVocab(opts);
    if (base === previous) base = sampleVocab(opts);
    previous = base;
    const styled = theme.intensify
      ? theme.intensify(base, intensity, rng, { emoji: opts.emoji })
      : base;
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
    if (i < sentenceCount - 1 && theme.interjections && theme.interjections.length > 0) {
      const showInterjection = rng() < interjectionProbability;
      const candidate = pick(rng, theme.interjections);
      if (showInterjection) sentences.push(candidate);
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
    words.push(
      theme.intensify ? theme.intensify(base, intensity, rng, { emoji: opts.emoji }) : base,
    );
  }

  return words.slice(0, opts.count).join(' ');
}

/**
 * Escape the characters that are unsafe in HTML element content. Keeps `html`
 * output injection-safe even for custom themes whose vocabulary might contain
 * `<`, `>`, or `&`.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapHtml(blocks: string[]): string {
  return blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join('\n');
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
    return opts.format === 'html' ? `<p>${escapeHtml(words)}</p>` : words;
  }
  if (opts.units === 'characters') {
    const text = blocksToText([buildCharsRich(opts)]);
    return opts.format === 'html' ? `<p>${escapeHtml(text)}</p>` : text;
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
 * A single rendered token. `base` is the Cicero Latin word it derived from
 * (blend themes only), so a UI can reveal the root and its gloss on hover;
 * `op` marks openers/interjections, which are never glossed.
 */
export interface Token {
  /** The displayed text (already styled/punctuated). */
  t: string;
  /** The Latin root this word came from, or `null`. */
  base: string | null;
  /** `true` for openers/interjections. */
  op?: boolean;
}

/** Rich generation result: token blocks plus the derived text. */
export interface RichResult {
  /** Paragraph blocks, each an array of {@link Token}. */
  blocks: Token[][];
  /** Plain-text rendering (identical to {@link generate} for the same options). */
  text: string;
  /** The theme actually used (after any Easter-egg override). */
  theme: Theme;
  /** The resolved intensity in `[0, 1]`. */
  intensity: number;
  /** Whether the theme is a Latin blend (its tokens may carry `base`). */
  isBlend: boolean;
}

function buildSentenceRich(opts: ResolvedOptions, isFirst: boolean): Token[] {
  const { rng, theme, intensity } = opts;
  const targetLength = intBetween(
    rng,
    opts.minWordsPerSentence,
    opts.maxWordsPerSentence,
  );
  const tokens: Token[] = [];

  let protectedCount = 0;
  if (isFirst && opts.startWithLorem) {
    for (const w of CLASSIC_OPENING) tokens.push({ t: w, base: null });
    protectedCount = CLASSIC_OPENING.length;
  }

  const openerProbability = 0.1 + intensity * 0.55;
  let opener: string | undefined;
  if (!opts.startWithLorem && theme.openers && theme.openers.length > 0) {
    const showOpener = rng() < openerProbability;
    const candidate = pick(rng, theme.openers);
    if (showOpener) opener = candidate;
  }

  let previous = '';
  while (tokens.length < targetLength) {
    let base = sampleVocab(opts);
    if (base === previous) base = sampleVocab(opts);
    previous = base;
    const styled = theme.intensify
      ? theme.intensify(base, intensity, rng, { emoji: opts.emoji })
      : base;
    tokens.push({ t: styled, base: theme.blendBase ? base : null });
  }

  const commaStart = Math.max(1, protectedCount);
  for (let i = commaStart; i < tokens.length - 1; i++) {
    if (chance(rng, COMMA_PROBABILITY / Math.max(1, tokens.length / 6))) {
      tokens[i]!.t = `${tokens[i]!.t},`;
    }
  }

  if (opener) {
    tokens.unshift({ t: stripTrailingPunctuation(opener), base: null, op: true });
  }
  if (tokens.length > 0) {
    tokens[0] = {
      t: capitalize(tokens[0]!.t),
      base: tokens[0]!.base,
      ...(tokens[0]!.op ? { op: true } : {}),
    };
    const last = tokens[tokens.length - 1]!;
    last.t = `${last.t}${pickEnding(opts)}`;
  }
  return tokens;
}

function buildParagraphRich(opts: ResolvedOptions, isFirstParagraph: boolean): Token[] {
  const { rng, theme, intensity } = opts;
  const sentenceCount = intBetween(
    rng,
    opts.minSentencesPerParagraph,
    opts.maxSentencesPerParagraph,
  );
  const interjectionProbability = intensity * 0.4;
  const out: Token[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    for (const tok of buildSentenceRich(opts, isFirstParagraph && i === 0)) {
      out.push(tok);
    }
    if (i < sentenceCount - 1 && theme.interjections && theme.interjections.length > 0) {
      const showInterjection = rng() < interjectionProbability;
      const candidate = pick(rng, theme.interjections);
      if (showInterjection) out.push({ t: candidate, base: null, op: true });
    }
  }
  return out;
}

function buildWordsRich(opts: ResolvedOptions): Token[] {
  const { rng, theme, intensity } = opts;
  const tokens: Token[] = [];
  if (opts.startWithLorem) {
    for (const w of CLASSIC_OPENING) tokens.push({ t: w, base: null });
  }
  while (tokens.length < opts.count) {
    const base = sampleVocab(opts);
    tokens.push({
      t: theme.intensify ? theme.intensify(base, intensity, rng, { emoji: opts.emoji }) : base,
      base: theme.blendBase ? base : null,
    });
  }
  return tokens.slice(0, opts.count);
}

/**
 * Build word tokens that fit within `count` *characters*: generate whole words
 * until the joined length reaches the budget, then drop trailing words so the
 * result is `<= count`, never cutting a word. Shared by the string and rich
 * paths so they stay byte-identical.
 */
function buildCharsRich(opts: ResolvedOptions): Token[] {
  const { rng, theme, intensity } = opts;
  const tokens: Token[] = [];
  let len = 0;
  const push = (t: string, base: string | null): void => {
    len += (tokens.length > 0 ? 1 : 0) + t.length;
    tokens.push({ t, base });
  };
  if (opts.startWithLorem) for (const w of CLASSIC_OPENING) push(w, null);
  while (len < opts.count) {
    const base = sampleVocab(opts);
    const styled = theme.intensify
      ? theme.intensify(base, intensity, rng, { emoji: opts.emoji })
      : base;
    push(styled, theme.blendBase ? base : null);
  }
  // Trim trailing whole words so the budget isn't exceeded (keep at least one).
  while (tokens.length > 1 && len > opts.count) {
    len -= tokens.pop()!.t.length + 1;
  }
  return tokens;
}

/** Render token blocks to plain text (identical to the string builders). */
export function blocksToText(blocks: Token[][]): string {
  return blocks.map((p) => p.map((t) => t.t).join(' ')).join('\n\n');
}

/** Render token blocks to HTML-escaped `<p>` paragraphs. */
export function blocksToHtml(blocks: Token[][]): string {
  return blocks
    .map((p) => `<p>${escapeHtml(p.map((t) => t.t).join(' '))}</p>`)
    .join('\n');
}

/**
 * Generate themed placeholder text as structured tokens. Each token carries the
 * Cicero `base` it derived from (for blend themes), enabling per-word "reveal
 * the Latin root" hover in a UI. Plain text and HTML are derived from the same
 * tokens, so a copied result matches exactly what is shown.
 */
export function generateRich(options: GenerateOptions = {}): RichResult {
  const opts = resolveOptions(options);
  let blocks: Token[][];
  if (opts.units === 'words') {
    blocks = [buildWordsRich(opts)];
  } else if (opts.units === 'characters') {
    blocks = [buildCharsRich(opts)];
  } else if (opts.units === 'sentences') {
    const all: Token[] = [];
    for (let i = 0; i < opts.count; i++) {
      for (const tok of buildSentenceRich(opts, i === 0)) all.push(tok);
    }
    blocks = [all];
  } else {
    blocks = [];
    for (let i = 0; i < opts.count; i++) {
      blocks.push(buildParagraphRich(opts, i === 0));
    }
  }
  return {
    blocks,
    text: blocksToText(blocks),
    theme: opts.theme,
    intensity: opts.intensity,
    isBlend: Boolean(opts.theme.blendBase),
  };
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
