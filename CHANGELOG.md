# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [1.5.0] — 2026-06-02

### Added

- **CLI `--voiceprint [file]`** — clone a voice from a text file (or piped
  stdin) and generate in it: `cat README.md | yass-ipsum --voiceprint -p 1`.
  Overrides `--theme`; honors the usual unit/count/`--temperature` flags.

### Web demo

- **"Ipsumize the web" bookmarklet** — drag it to your bookmarks bar, then click
  it on any website to rewrite all of its visible text in any voice, in place,
  with a small floating panel (shadow-DOM, so it can't clash with the page) to
  switch voices, blend, or restore. Served as a self-contained `ipsumize.js`.

## [1.4.0] — 2026-06-02

### Added

- **Voiceprint — clone a voice from any text.** New `voiceFromText(text, opts?)`
  export derives a `Theme` from a sample of prose: its distinctive vocabulary
  (word frequency minus stopwords), the phrases that begin its sentences
  (openers), and its shortest sentences (interjections), plus a deterministic
  accent from the text. Generate placeholder that echoes the source. Zero-dep
  and deterministic; returns a plain theme — wrap with `withLatinBlend` for the
  Latin ↔ voice dial.

### Web demo

- **"Clone a voice from text"** in the playground's voice editor — paste a few
  sentences and it builds a voice from them, shows the derived theme as JSON
  (tweakable), and loads it live. Pairs with paste-JSON and the `.json` export.

## [1.3.0] — 2026-06-02

### Added

- **Ten new voices**, bringing the roster to twenty-seven (plus the hidden
  Huttese egg): 🏒 Hockey Bro, 🗿 Looksmaxxer, 🎙️ Sports Announcer,
  🍷 Real Housewives, 👨‍🍳 Gordon Ramsay, 🪑 IKEA Instructions, 🤌 Italian
  Brainrot, 🪞 Baudrillard, 🤖 AI Slop, and ⛵ Rimbaud. Each blends onto
  Cicero's Latin like the rest and ships a decode-the-jargon hover glossary.
- **`withLatinBlend`** is now exported — wrap any `Theme` to give it the
  Latin ↔ voice blend dial (used by the demo's custom-voice loader).

### Web demo

- **Load your own voice** — a "test your own voice" editor in the playground:
  paste a `Theme` as JSON (only `words` is required) and it loads live, blended
  onto Latin like the built-ins, persisted locally, and selectable as a chip.
  Pairs with the existing `.json` export for an export → tweak → re-import loop.

## [1.2.1] — 2026-06-02

### Fixed

- **The blend / `temperature` dial is now a smooth, monotonic crossfade.**
  Previously the dial had dead zones (past a point, nudging it changed nothing)
  and elsewhere reshuffled the whole passage, because every intensity-dependent
  decision drew a _variable_ number of RNG values — so changing intensity
  shifted the entire downstream stream. RNG consumption is now
  intensity-independent (each decision draws its threshold and candidate
  unconditionally, using them only when the dial calls for it), so raising the
  dial converts more words while the Latin skeleton stays put. Determinism is
  preserved and the `0` = Latin / `1` = voice endpoints are unchanged, but
  output for a given seed differs from 1.2.0.

### Web demo

These ship in the live demo only (not in the published package):

- Fixed the per-word hover tooltip's contrast in plain ("simple") mode.
- Much more compact, denser mobile layout; an improved Jabba easter egg on
  mobile (bigger Hutt, explicit close button, safe-area insets).
- Reworked the cantina easter-egg loop into a busier novelty-swing arrangement
  (still an original, IP-safe composition).
- Self-hosted the web fonts (dropped Google Fonts) — no third-party request, so
  iOS Safari's privacy protections no longer flag the page on load.

## [1.2.0] — 2026-06-02

### Added

- **`characters` generation unit** — generate text that fits an N-character
  budget, trimmed to a whole-word boundary. Available via
  `generate({ units: 'characters', count })`, the CLI (`-C` / `--characters`),
  the MCP `generate_ipsum` tool, and the web demo.
- **Byte count** in the web demo's specimen stats (alongside words/chars).
- **Short / Medium / Long length presets** per unit in the web demo.
- **Public light/dark toggle** in the web masthead — cycles the editorial
  surface Auto / Light / Dark (Auto follows the OS `prefers-color-scheme`).

### Tests

- jsdom + Testing Library integration tests for the web demo, running under the
  standard `npm test` on Node 18/20/22.

## [1.1.0] — 2026-06-02

### Added

- **`emoji` option** (default `true`) to suppress decorative emoji such as Yass
  Kween's sparkles — also `--no-emoji` (CLI) and `emoji` (MCP). Determinism is
  preserved: toggling it never changes the underlying words, only the glyphs.
- Exported **`IntensifyContext`** so custom themes can write emoji-aware
  `intensify` functions.
- Web demo: a two-column layout, copy feedback (`✓ Copied`) + per-paragraph
  copy, a bare-bones **Plain view** with light/dark palettes, **OS-aware
  theming** (the editorial surface and plain view follow
  `prefers-color-scheme`), a redrawn Jabba easter egg, and an original
  swing-jazz cantina loop. The cantina honors `prefers-reduced-motion`.

### Changed

- **Every built-in voice now blends onto Cicero's genuine Latin**: the intensity
  dial runs from pure Latin (`0`) to the pure voice (`1`) for all voices, not
  just Yass Kween. Output therefore differs from 1.0.x for the same seed.

### Chore

- Stopped tracking the `*.tgz` npm pack artifacts.

## [1.0.1]

### Fixed

- CLI silently no-opped when run through its installed `yass-ipsum` bin.

## [1.0.0]

- Initial release: a zero-dependency themed placeholder-text generator —
  library, CLI (`yass-ipsum`), MCP server (`yass-ipsum-mcp`), and a web demo.

[1.5.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.5.0
[1.4.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.4.0
[1.3.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.3.0
[1.2.1]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.2.1
[1.2.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.2.0
[1.1.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.1.0
[1.0.1]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.0.1
[1.0.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.0.0
