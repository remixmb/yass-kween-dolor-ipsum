<div align="center">

# 💅 yass-kween-dolor-ipsum

### Lorem ipsum, but make it _iconic_.

A themed placeholder-text generator with a zero-dependency TypeScript core, a
friendly CLI, and a slick interactive web demo. Generate filler text in seven
distinct voices — from sassy **Yass Kween** to **Corporate Synergy** to
**Pirate Shanty**.

**[▶ Live demo](https://remixmb.github.io/yass-kween-dolor-ipsum/)**

[![CI](https://github.com/remixmb/yass-kween-dolor-ipsum/actions/workflows/ci.yml/badge.svg)](https://github.com/remixmb/yass-kween-dolor-ipsum/actions/workflows/ci.yml)
[![Deploy web demo](https://github.com/remixmb/yass-kween-dolor-ipsum/actions/workflows/deploy.yml/badge.svg)](https://github.com/remixmb/yass-kween-dolor-ipsum/actions/workflows/deploy.yml)

[Themes](#-themes) · [Quick start](#-quick-start) · [API](#-api) · [CLI](#️-cli) · [Web demo](#-web-demo) · [Design](#️-design-notes)

</div>

---

## ✨ Highlights

- **Seven hand-tuned themes** (plus one hidden 🥚), each with its own vocabulary, openers, and interjections.
- **Blended voices** — the signature themes are _fusions_: **yassified Latin** and **huttese'd Latin**, built on Cicero's genuine lorem ipsum source and transformed word-by-word.
- **A temperature dial** — run it _cold_ for raw, untouched Latin or _hot_ for maximally extra ✨. The dial controls how far each word is transformed.
- **Deterministic output** — pass a `seed` and get byte-for-byte reproducible text. Great for tests and shareable snippets.
- **Three units** — `words`, `sentences`, or `paragraphs`, plus optional `text` or `html` output.
- **Zero runtime dependencies.** The core is plain, portable TypeScript.
- **Works everywhere** — library (ESM + CJS), CLI, and browser. Ships full type declarations.
- **Tested & typed** — 74 tests, ~98% coverage, strict TypeScript, ESLint + Prettier, CI.

## 🎭 Themes

| Theme                | id           | Vibe                                                           |
| -------------------- | ------------ | -------------------------------------------------------------- |
| 💅 Yass Kween        | `yass-kween` | Yassified Latin — Cicero, but make it iconic. The house voice. |
| 📜 Classic Lorem     | `classic`    | The timeless Latin-flavored filler everyone knows.             |
| 📈 Corporate Synergy | `corporate`  | Leverage best-in-class buzzwords to circle back on copy.       |
| 🏴‍☠️ Pirate Shanty     | `pirate`     | Salty seafaring filler for landlubbers. Arr.                   |
| 👾 Hacker Terminal   | `hacker`     | Cyber-thriller technobabble. We're in.                         |
| 🚀 Startup Pitch     | `startup`    | It's like Uber, but for placeholder text.                      |
| 🍃 Zen Garden        | `zen`        | Calm, mindful filler. Breathe in, breathe out.                 |

## 🚀 Quick start

```bash
npm install
npm run build      # build the library + CLI into dist/
npm run dev        # launch the interactive web demo (Vite)
npm test           # run the test suite
```

## 🧩 API

```ts
import { generate, ipsum } from 'yass-kween-dolor-ipsum';

// Three sassy paragraphs (the defaults).
generate();

// Two pirate sentences, reproducible thanks to the seed.
generate({ theme: 'pirate', units: 'sentences', count: 2, seed: 'ahoy' });

// HTML output, starting with the familiar "Lorem ipsum dolor sit amet".
generate({
  theme: 'corporate',
  units: 'paragraphs',
  count: 2,
  format: 'html',
  startWithLorem: true,
});

// Convenience helpers mirroring popular ipsum libraries.
ipsum.words(12, { theme: 'hacker' });
ipsum.sentences(4, { theme: 'zen', seed: 'calm' });
ipsum.paragraphs(3, { theme: 'startup' });
```

### `generate(options)`

| Option                                                  | Type                                     | Default        | Description                                    |
| ------------------------------------------------------- | ---------------------------------------- | -------------- | ---------------------------------------------- |
| `theme`                                                 | `string \| Theme`                        | `'yass-kween'` | Theme id or a custom `Theme` object.           |
| `units`                                                 | `'words' \| 'sentences' \| 'paragraphs'` | `'paragraphs'` | What to count.                                 |
| `count`                                                 | `number`                                 | `3`            | How many units to produce (clamped to ≥ 1).    |
| `seed`                                                  | `number \| string`                       | —              | Seed for deterministic output.                 |
| `format`                                                | `'text' \| 'html'`                       | `'text'`       | Plain text or `<p>`-wrapped HTML.              |
| `intensity` / `temperature`                             | `number` (0–1)                           | theme default  | The temperature dial — cold to hot. See below. |
| `startWithLorem`                                        | `boolean`                                | `false`        | Begin with "Lorem ipsum dolor sit amet".       |
| `minWordsPerSentence` / `maxWordsPerSentence`           | `number`                                 | `5` / `15`     | Sentence length bounds.                        |
| `minSentencesPerParagraph` / `maxSentencesPerParagraph` | `number`                                 | `3` / `6`      | Paragraph length bounds.                       |

### 🌡️ The temperature dial

The signature themes are _blends_: every word starts as genuine Cicero Latin
and is fused toward the voice, scaled by a **temperature** dial (`0`–`1`). Run
it **cold** and the raw Latin shows through. Run it **hot** and the voice takes
over — Yass Kween elongates, SHOUTs, ✨sparkles✨, and swaps in sass. Use
`intensity` or its alias `temperature` — both drive the same dial.

```ts
// ❄️ Cold (0°): the genuine lorem ipsum source resurfaces, untouched:
generate({
  theme: 'yass-kween',
  temperature: 0,
  units: 'sentences',
  count: 1,
  seed: 'gala',
});
// → "Vero magnam, cupiditate sed voluptatum molestias corporis dolor neque…"

// 🌋 Hot (100°): fully yassified Latin:
generate({
  theme: 'yass-kween',
  temperature: 1,
  units: 'sentences',
  count: 1,
  seed: 'gala',
});
// → "QUAERAT NUMQUAMYY slay CHARACTER tiara DIVINEE unstoppableeee✨ EXCEPTURI…"
```

> **The obscure origins.** Lorem ipsum isn't gibberish — it's scrambled Latin
> from Cicero's _de Finibus Bonorum et Malorum_ (45 BC), a treatise on pleasure
> and pain, where _dolorem ipsum_ means "pain itself." Yass Kween is built right
> on top of that genuine source. Read any theme's backstory with `theme.origin`
> (or `yass-ipsum --lore`), and watch
> [the mystery of lorem ipsum's origins](https://www.youtube.com/watch?v=kL1PDqzqhM4).

### 🥚 A hidden Easter egg

There's a secret eighth voice: **huttese'd Latin**. Use the seed **`jabba`**
(case-insensitive) and a certain Hutt takes over — Cicero's Latin gets mutated
toward the language of the Hutts (c→k, v→w, stretched vowels) and sprinkled with
genuine Huttese, whatever theme you asked for:

```ts
generate({ seed: 'jabba', units: 'sentences', count: 1 });
// → "Ee youdsa yatuka mooie wooluptatem, murishani, noostrum numkwam!"  (🐸)
```

In the web demo, typing `jabba` into the seed field reveals the hidden theme
chip. _Bo shuda!_

### Custom themes

A theme is just data, so rolling your own is trivial:

```ts
import { generate, type Theme } from 'yass-kween-dolor-ipsum';

const catIpsum: Theme = {
  id: 'cat',
  name: 'Cat',
  description: 'Filler text, but for cats.',
  emoji: '🐈',
  words: ['meow', 'purr', 'nap', 'knock', 'over', 'glass', 'treat', 'zoomies'],
  openers: ['Hooman,', 'Excuse me but'],
  interjections: ['Meow.', 'Feed me.'],
};

generate({ theme: catIpsum, units: 'sentences', count: 2 });
```

## ⌨️ CLI

```bash
# After building, or via the published bin name:
npx yass-ipsum --help
```

```
yass-ipsum [options]

  -t, --theme <id>        Theme to use (default: yass-kween)
  -p, --paragraphs <n>    Generate n paragraphs
  -s, --sentences <n>     Generate n sentences
  -w, --words <n>         Generate n words
  -c, --count <n>         Count for the chosen unit
  -u, --units <unit>      words | sentences | paragraphs
      --seed <value>      Seed for reproducible output
  -i, --temperature <n>   Blend temperature, 0–1 (or 0–100). Cold = raw Latin
                          (alias: --intensity, --temp)
      --html              Wrap output in <p> tags
      --lorem             Start with "Lorem ipsum dolor sit amet"
      --lore              Show the chosen theme's origin story
  -l, --list              List available themes
  -h, --help              Show help
  -v, --version           Show version
```

```bash
yass-ipsum                                  # three sassy paragraphs
yass-ipsum --theme corporate --paragraphs 2
yass-ipsum -t pirate -s 4 --seed ahoy       # reproducible pirate text
yass-ipsum --words 12 --html
yass-ipsum --temperature 0.1                # cold — raw Latin resurfaces
yass-ipsum --lore                           # the obscure origins of lorem ipsum
yass-ipsum --seed jabba                      # 🥚 ...what's this?
```

## 🌐 Web demo

`npm run dev` starts a Vite dev server with an interactive playground: pick a
theme, tune the unit/count, slide the temperature dial, and copy the result with
one click. Build a static bundle with `npm run build:web` (output in
`dist-web/`).

Every result is **reproducible and shareable** — the seed is always shown and
editable, **🎲 Shuffle** rolls a new one, and **🔗 Copy link** yields a
permalink that encodes the full state (`?theme=…&seed=…&temp=…&units=…`), so
anyone who opens it sees the exact same output.

> **HTML output is escaped.** When `format: 'html'`, content is HTML-escaped
> (`&`, `<`, `>`), so even a custom theme's vocabulary can't inject markup.

## 🏗️ Design notes

- **`src/rng.ts`** — a seeded `mulberry32` PRNG with an `xmur3` string hasher.
  Determinism is the backbone: it makes output reproducible and the generator
  fully testable.
- **`src/themes/`** — each theme is pure data implementing the `Theme`
  interface. Adding a voice means adding one file and one registry entry.
- **`src/generator.ts`** — assembles words → sentences → paragraphs, layering in
  openers, interjections, commas, and varied punctuation. No theme-specific
  logic lives here; behavior is driven entirely by theme data.
- **`src/cli.ts`** — a dependency-free argument parser with friendly errors,
  exported as a testable `run(argv)` function.

```
src/
  index.ts          # public API surface
  generator.ts      # words → sentences → paragraphs
  rng.ts            # seeded PRNG + helpers
  cli.ts            # command-line interface
  themes/           # one file per voice + a registry
web/                # Vite-powered interactive demo
test/               # vitest suite (rng, themes, generator, cli)
```

## 📜 Scripts

| Script              | Description                                         |
| ------------------- | --------------------------------------------------- |
| `npm run build`     | Bundle library + CLI (ESM, CJS, `.d.ts`) with tsup. |
| `npm run dev`       | Interactive web demo (Vite dev server).             |
| `npm run build:web` | Static build of the web demo.                       |
| `npm test`          | Run the vitest suite.                               |
| `npm run coverage`  | Tests with a v8 coverage report.                    |
| `npm run typecheck` | `tsc --noEmit` in strict mode.                      |
| `npm run lint`      | ESLint over the project.                            |
| `npm run check`     | Typecheck + lint + test (CI gate).                  |

## 📄 License

[MIT](./LICENSE) © Remi M.
