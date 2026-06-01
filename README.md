<div align="center">

# 💅 yass-kween-dolor-ipsum

### Lorem ipsum, but make it _iconic_.

A themed placeholder-text generator with a zero-dependency TypeScript core, a
friendly CLI, and a slick interactive web demo. Generate filler text in seven
distinct voices — from sassy **Yass Kween** to **Corporate Synergy** to
**Pirate Shanty**.

[Themes](#-themes) · [Quick start](#-quick-start) · [API](#-api) · [CLI](#️-cli) · [Web demo](#-web-demo) · [Design](#️-design-notes)

</div>

---

## ✨ Highlights

- **Seven hand-tuned themes** (plus one hidden 🥚), each with its own vocabulary, openers, and interjections.
- **An intensity dial** — lessen or intensify the yassification, from calm to maximally extra ✨.
- **Themes carry their origins** — turn Yass Kween down and lorem ipsum's genuine Latin source resurfaces.
- **Deterministic output** — pass a `seed` and get byte-for-byte reproducible text. Great for tests and shareable snippets.
- **Three units** — `words`, `sentences`, or `paragraphs`, plus optional `text` or `html` output.
- **Zero runtime dependencies.** The core is plain, portable TypeScript.
- **Works everywhere** — library (ESM + CJS), CLI, and browser. Ships full type declarations.
- **Tested & typed** — 68 tests, ~98% coverage, strict TypeScript, ESLint + Prettier, CI.

## 🎭 Themes

| Theme                | id           | Vibe                                                        |
| -------------------- | ------------ | ----------------------------------------------------------- |
| 💅 Yass Kween        | `yass-kween` | Sassy, supportive, and absolutely serving. The house voice. |
| 📜 Classic Lorem     | `classic`    | The timeless Latin-flavored filler everyone knows.          |
| 📈 Corporate Synergy | `corporate`  | Leverage best-in-class buzzwords to circle back on copy.    |
| 🏴‍☠️ Pirate Shanty     | `pirate`     | Salty seafaring filler for landlubbers. Arr.                |
| 👾 Hacker Terminal   | `hacker`     | Cyber-thriller technobabble. We're in.                      |
| 🚀 Startup Pitch     | `startup`    | It's like Uber, but for placeholder text.                   |
| 🍃 Zen Garden        | `zen`        | Calm, mindful filler. Breathe in, breathe out.              |

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

| Option                                                  | Type                                     | Default        | Description                                 |
| ------------------------------------------------------- | ---------------------------------------- | -------------- | ------------------------------------------- |
| `theme`                                                 | `string \| Theme`                        | `'yass-kween'` | Theme id or a custom `Theme` object.        |
| `units`                                                 | `'words' \| 'sentences' \| 'paragraphs'` | `'paragraphs'` | What to count.                              |
| `count`                                                 | `number`                                 | `3`            | How many units to produce (clamped to ≥ 1). |
| `seed`                                                  | `number \| string`                       | —              | Seed for deterministic output.              |
| `format`                                                | `'text' \| 'html'`                       | `'text'`       | Plain text or `<p>`-wrapped HTML.           |
| `intensity`                                             | `number` (0–1)                           | theme default  | How "extra" the output is. See below.       |
| `startWithLorem`                                        | `boolean`                                | `false`        | Begin with "Lorem ipsum dolor sit amet".    |
| `minWordsPerSentence` / `maxWordsPerSentence`           | `number`                                 | `5` / `15`     | Sentence length bounds.                     |
| `minSentencesPerParagraph` / `maxSentencesPerParagraph` | `number`                                 | `3` / `6`      | Paragraph length bounds.                    |

### 🎚️ Dialing the yassification

The `intensity` option (`0`–`1`) controls how _extra_ the output is. Turn it
**down** and sentences get calmer, openers and interjections fade, and themes
with origin roots reveal their backstory. Turn it **up** for maximum flair —
more punctuation, and the theme's own stylizer goes all-in (Yass Kween starts
to elongate, SHOUT, and ✨sparkle✨).

```ts
// Maximum glam 💅
generate({ theme: 'yass-kween', intensity: 1, seed: 'glam' });
// → "Glowing💖 GLOW understood thriving UNBOTHERED manifestingss GLITTER…"

// Dial it to zero and Yass Kween reveals lorem ipsum's true origins:
generate({
  theme: 'yass-kween',
  intensity: 0,
  units: 'words',
  count: 10,
  seed: 'cicero',
});
// → "porro modi numquam non aliquam laboriosam atque voluptatum incidunt modi"
```

> **The obscure origins.** Lorem ipsum isn't gibberish — it's scrambled Latin
> from Cicero's _de Finibus Bonorum et Malorum_ (45 BC), a treatise on pleasure
> and pain, where _dolorem ipsum_ means "pain itself." The **Yass Kween** theme
> carries those genuine roots: lower the dial and the ancient text resurfaces.
> Read any theme's backstory with `theme.origin` (or `yass-ipsum --lore`).

### 🥚 A hidden Easter egg

There's a secret eighth voice. Use the seed **`jabba`** (case-insensitive) and a
certain Hutt takes over, whatever theme you asked for:

```ts
generate({ seed: 'jabba', units: 'sentences', count: 1 });
// → "Ee youdsa rundee wanta tweepi wooky goodde wanta kung!"  (Huttese 🐸)
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
  -i, --intensity <n>     Yassification, 0–1 (or 0–100). Lower = calmer
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
yass-ipsum --intensity 0.1                  # calm — Latin roots resurface
yass-ipsum --lore                           # the obscure origins of lorem ipsum
yass-ipsum --seed jabba                      # 🥚 ...what's this?
```

## 🌐 Web demo

`npm run dev` starts a Vite dev server with an interactive playground: pick a
theme, tune the unit/count, set a seed, toggle HTML, and copy the result with
one click. Build a static bundle with `npm run build:web` (output in
`dist-web/`).

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
