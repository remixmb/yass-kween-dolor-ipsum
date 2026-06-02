import type { Theme } from './themes/types.js';

/** Options for {@link voiceFromText}. */
export interface VoiceFromTextOptions {
  /** Display name for the derived voice. Defaults to `"Voiceprint"`. */
  name?: string;
  /** Emoji marker. Defaults to `"🎙️"`. */
  emoji?: string;
  /** One-line description. */
  description?: string;
  /** Maximum vocabulary size. Defaults to `60`. */
  maxWords?: number;
  /** Maximum number of derived openers. Defaults to `6`. */
  maxOpeners?: number;
}

// Common English function words — excluded from the derived vocabulary so the
// voice keeps the source's *distinctive* words rather than its connective tissue.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'by',
  'for', 'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
  'do', 'does', 'did', 'not', 'no', 'so', 'up', 'out', 'about', 'into', 'over',
  'then', 'than', 'too', 'very', 'can', 'will', 'just', 'from', 'what', 'which',
  'who', 'whom', 'when', 'where', 'how', 'why', 'all', 'any', 'some', 'here',
  'there', 'would', 'could', 'should', 'has', 'have', 'had', 'also', 'more',
  'most', 'such', 'only', 'own', 'same', 'other', 'because', 'while', 'during',
  'after', 'before', 'again',
]);

/** HSL → `#rrggbb`. */
function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Deterministic vivid accent color from a string (FNV-1a hash → hue). */
function accentFor(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return hslToHex((h >>> 0) % 360, 68, 52);
}

/**
 * Derive a {@link Theme} from a sample of prose — a "voiceprint." The result's
 * vocabulary is the text's most distinctive words, its `openers` are the phrases
 * that begin its sentences, and its `interjections` are its shortest sentences,
 * so generating with it produces placeholder text that echoes the source.
 * Deterministic: the same text always yields the same voice (handy for tests and
 * shareable seeds).
 *
 * The returned theme is *plain* (not a Latin blend): generating with it uses its
 * own words directly. Wrap it with `withLatinBlend` to give it the same
 * Latin ↔ voice dial as the built-in voices.
 *
 * @example
 * ```ts
 * const voice = voiceFromText(await fs.readFile('README.md', 'utf8'));
 * generate({ theme: voice, units: 'sentences', count: 3 });
 * ```
 *
 * @throws if the text contains no usable words.
 */
export function voiceFromText(text: string, options: VoiceFromTextOptions = {}): Theme {
  const src = String(text ?? '');
  const maxWords = Math.max(1, options.maxWords ?? 60);
  const maxOpeners = Math.max(0, options.maxOpeners ?? 6);

  const tokens = src.toLowerCase().match(/[a-z][a-z'-]*[a-z]|[a-z]/g) ?? [];
  if (tokens.length === 0) {
    throw new Error('Need some sample text (with words) to build a voice from.');
  }

  const freq = new Map<string, number>();
  for (const w of tokens) {
    if (w.length >= 2) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  // Most frequent first; ties broken alphabetically so the result is stable.
  const byFreq = (a: [string, number], b: [string, number]): number =>
    b[1] - a[1] || (a[0] < b[0] ? -1 : 1);

  // Distinctive content words first; backfill with anything if the sample is tiny.
  let words = [...freq.entries()]
    .filter(([w]) => !STOPWORDS.has(w))
    .sort(byFreq)
    .map(([w]) => w);
  if (words.length < 8) {
    const seen = new Set(words);
    for (const [w] of [...freq.entries()].sort(byFreq)) {
      if (!seen.has(w)) words.push(w);
    }
  }
  words = words.slice(0, maxWords);
  if (words.length === 0) {
    throw new Error('Need some sample text (with words) to build a voice from.');
  }

  // Sentences power the openers and interjections.
  const sentences = src
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Openers: the most common 2–3 word phrases that begin a sentence.
  const openerCounts = new Map<string, number>();
  for (const s of sentences) {
    const ws = s.split(/\s+/).filter(Boolean);
    if (ws.length < 2) continue;
    const phrase = ws
      .slice(0, Math.min(3, ws.length - 1))
      .join(' ')
      .replace(/[,:;.!?]+$/, '');
    if (/^[A-Za-z]/.test(phrase) && phrase.length <= 28) {
      openerCounts.set(phrase, (openerCounts.get(phrase) ?? 0) + 1);
    }
  }
  const openers = [...openerCounts.entries()]
    .sort(byFreq)
    .slice(0, maxOpeners)
    .map(([p]) => `${p},`);

  // Interjections: the source's shortest standalone sentences.
  const interjections = [
    ...new Set(
      sentences.filter((s) => {
        const c = s.split(/\s+/).filter(Boolean).length;
        return c >= 1 && c <= 4;
      }),
    ),
  ].slice(0, 6);

  return {
    id: 'voiceprint',
    name: options.name ?? 'Voiceprint',
    description: options.description ?? 'A voice cloned from your sample text.',
    emoji: options.emoji ?? '🎙️',
    accent: accentFor(src),
    defaultIntensity: 0.7,
    words,
    ...(openers.length ? { openers } : {}),
    ...(interjections.length ? { interjections } : {}),
  };
}
