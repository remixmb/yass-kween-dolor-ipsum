# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

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

[1.2.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.2.0
[1.1.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.1.0
[1.0.1]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.0.1
[1.0.0]: https://github.com/remixmb/yass-kween-dolor-ipsum/releases/tag/v1.0.0
