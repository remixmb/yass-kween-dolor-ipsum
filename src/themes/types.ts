import type { RandomFn } from '../rng.js';

/**
 * A theme is a data-driven vocabulary plus a little personality. The generator
 * stitches these pieces together into sentences and paragraphs, so adding a new
 * voice is as simple as dropping in another {@link Theme}.
 */
export interface Theme {
  /** Stable identifier used by the CLI and API (kebab-case). */
  id: string;
  /** Human-friendly display name. */
  name: string;
  /** One-line description shown in the UI and CLI listing. */
  description: string;
  /** An emoji used as a visual marker in the UI/CLI. */
  emoji: string;
  /**
   * Accent color (hex) for this voice. The web demo uses it to recolor the
   * whole page as the blend dial climbs toward the voice. Optional; defaults
   * are handled by the UI.
   */
  accent?: string;
  /**
   * When `true`, the theme is omitted from public listings (the CLI `--list`
   * and the web demo's chips). It remains fully usable when requested by id —
   * handy for Easter eggs. The Huttese theme is hidden until you summon Jabba.
   */
  hidden?: boolean;
  /**
   * The core vocabulary. Sentences are assembled mostly from these words, so a
   * richer list yields more varied output. Keep them lowercase; the generator
   * handles capitalization.
   */
  words: string[];
  /**
   * Optional punchy phrases that can lead a sentence (e.g. "Honestly,").
   * Capitalization is preserved as written.
   */
  openers?: string[];
  /**
   * Optional standalone interjections occasionally inserted between sentences
   * for flavor (e.g. "Yass!"). Capitalization is preserved as written.
   */
  interjections?: string[];
  /**
   * Optional base lexicon for a *blend* theme. When set, every word starts from
   * this vocabulary (the genuine Latin lorem ipsum source) and is fused toward
   * the theme's voice by {@link Theme.intensify}, scaled by intensity. This is
   * what produces "yassified Latin" and "huttese'd Latin": at intensity 0 the
   * raw Latin shows through; as the dial climbs, the voice takes over.
   */
  blendBase?: readonly string[];
  /**
   * Optional plain-language glossary for a *non-blend* voice — a map from a
   * vocabulary word (lowercase) to a short, human meaning. The web demo uses it
   * to decode jargon on hover, the same way blend themes reveal their Latin
   * root: hover "synergy" and learn what it actually means. Keys are matched
   * case-insensitively and ignore surrounding punctuation. Blend themes do not
   * need this — their roots are glossed via {@link gloss}.
   */
  glossary?: Readonly<Record<string, string>>;
  /**
   * Optional note describing the theme's origin or backstory, surfaced by the
   * CLI (`--lore`) and the web demo.
   */
  origin?: string;
  /**
   * The theme's natural intensity in the range `[0, 1]` when the caller does
   * not specify one. Defaults to `0.5` if omitted.
   */
  defaultIntensity?: number;
  /**
   * Optional per-word transformer, scaled by the current intensity (`0`–`1`).
   * For a blend theme it fuses the base Latin word toward the voice — Yass
   * Kween elongates, SHOUTs, sparkles ✨, and swaps in sass; Huttese mutates
   * Latin phonetics and swaps in genuine Huttese. For a plain theme it simply
   * stylizes its own vocabulary. Must not introduce whitespace.
   */
  intensify?: (word: string, intensity: number, rng: RandomFn) => string;
}
