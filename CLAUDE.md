# CLAUDE.md

Guidance for working in this repository.

## What this is

`yass-kween-dolor-ipsum` is a themed placeholder-text ("ipsum") generator. It
ships three things from one codebase:

1. A zero-dependency TypeScript **library** (`src/`).
2. A **CLI** (`src/cli.ts`, exposed as `yass-ipsum`).
3. An interactive **web demo** (`web/`, built with Vite).

## Architecture

- `src/rng.ts` — seeded `mulberry32` PRNG + `xmur3` string hashing, plus
  `pick`/`intBetween`/`chance`/`shuffle` helpers. Determinism is core: the same
  seed must always yield the same output.
- `src/themes/` — one file per voice, each a plain-data `Theme` object, plus a
  registry in `index.ts`. **To add a theme:** create the file and add it to the
  `themes` array and `ThemeId` union in `themes/index.ts`.
- `src/generator.ts` — the engine. It composes words → sentences → paragraphs
  using only theme _data_; there is no per-theme branching here. The `intensity`
  option (0–1) scales openers, interjections, and punctuation, biases the
  origin-word mix, and drives each theme's optional `intensify` stylizer.
- `src/themes/origins.ts` — the genuine Cicero source of lorem ipsum, used as
  Yass Kween's `originWords` (surfaced at low intensity).
- **Easter egg:** the seed `jabba` (case-insensitive) overrides the theme with
  the hidden `huttese` voice. See `EASTER_EGG_SEED` / `visibleThemes` in
  `themes/index.ts`. Hidden themes (`hidden: true`) stay out of `--list` and the
  web chips but remain resolvable by id.
- `src/cli.ts` — argument parsing + `run(argv)`. Keep it dependency-free.

## Conventions

- Theme `words` are lowercase (the generator handles capitalization). All-caps
  acronyms (KPI, ROI, MVP) are the only exception.
- Public API changes go through `src/index.ts`.
- Strict TypeScript is non-negotiable; no `any`, honor `noUncheckedIndexedAccess`.

## Workflow

Run `npm run check` (typecheck + lint + test) before committing. Tests live in
`test/` and mirror the source modules. Coverage thresholds are enforced in
`vitest.config.ts` — keep new code covered.

```bash
npm run check        # gate: typecheck + lint + test
npm run dev          # web demo
npm run build        # library + CLI
node dist/cli.js -l  # sanity-check the built CLI
```
