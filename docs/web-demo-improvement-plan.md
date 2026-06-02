# Web demo improvement plan

Scope: the "Lorem & Ipsum" web demo (`web/`) and the supporting library
(`src/`). Five workstreams, from a competitive review of popular ipsum
generators plus a hands-on pass over the running demo.

## Goals

1. Make the house voice usable as **real** placeholder text (emoji toggle).
2. Make the live preview **visible and friendly** (it's below the fold today).
3. Redraw the Easter-egg **Hutt** into something characterful.
4. Give the Easter-egg **cantina loop** musical depth.
5. Close the small gaps vs. best-in-class generators surfaced by research.

## Guardrails (non-negotiable)

- **Determinism is core.** Same seed + options ⇒ identical text. A new option
  must not perturb existing seeds' output _unless_ the user toggles it. See the
  RNG note in Workstream A.
- **Library stays zero-dependency.** React remains a dev-only dep of the demo.
- **Strict TS**, no `any`, honor `noUncheckedIndexedAccess`. `npm run check`
  (typecheck + lint + test) must pass; coverage thresholds are enforced, so new
  library code ships with tests.
- **One feature, three surfaces.** Any library change is wired through CLI +
  MCP + web, documented in `README.md`, and lands a version bump.

## Decisions to lock before building

| # | Decision | Recommendation |
|---|----------|----------------|
| **D1** | Emoji default value | Library/CLI/MCP default **`emoji: true`** (non-breaking — existing seeds keep their output). In the **web demo**, surface the toggle in section 03; **default it OFF** so the "I just need filler" visitor gets clean text, while the brand sparkle is one click away. *(Your call on the web default — this is a brand vs. utility tradeoff.)* |
| **D2** | Live-preview layout | **Two-column on desktop**: controls left, **sticky specimen right**; collapses to the current single-column stack on narrow screens. Keeps the editorial feel while putting output on screen immediately. Alternatives in Workstream B1. |
| **D3** | "Markdown" output format | For paragraph output, **Markdown ≈ plain text** (blank-line-separated), so a third toggle adds little. Higher-value version: make the **HTML view actually rendered + copyable**, and (stretch) add **list generation**, which is what makes Markdown/HTML genuinely distinct. |
| **D4** | Egg-polish scope | Jabba: full redraw, still original vector art. Cantina: A/B structure + moving bass. Both self-contained; safe to time-box. |
| **D5** | Version | `1.0.1 → 1.1.0` (additive features). Bump in `package.json`, `cli.ts` `VERSION`, `mcp.ts` `SERVER_INFO`. |
| **D6** | "Plain / bare-bones" mode | Add a **visible** "Plain" toggle (default off) that strips the editorial chrome to a system-font, high-contrast, no-decoration layout and renders output as a raw selectable block — a dev-friendly "just give me text" view (à la lipsum.com). Distinct from the hidden Konami Appearance panel. Pairs naturally with emoji-off. |

---

## Workstream A — Emoji on/off  ·  priority 1  ·  effort S

**Goal:** a first-class `emoji` option that suppresses the sparkle injection,
available everywhere, without breaking determinism.

**Root cause:** only `yassify()` injects emoji — `yasskween.ts:92` appends a
random `SPARKLES` glyph with probability `intensity * 0.16` (~14% per word at
the 0.85 default). No other theme emits emoji into generated text.

**Determinism-preserving approach (important):** the sparkle decision must
consume the **same** RNG draws whether emoji is on or off, so toggling only
adds/removes glyphs and never changes the underlying words:

```ts
// yassify(), emoji-aware — RNG stream identical for emoji on vs off
if (chance(rng, intensity * 0.16)) {
  const spark = pick(rng, SPARKLES); // always drawn when the branch is taken
  if (ctx?.emoji !== false) w += spark; // …but only appended when enabled
}
```

**Files:**
- `src/themes/types.ts` — extend `intensify` signature with an optional context
  bag, e.g. `intensify?: (word, intensity, rng, ctx?: { emoji: boolean }) => string`.
  Additive/optional → existing implementations still typecheck.
- `src/themes/yasskween.ts` — read `ctx.emoji` as above.
- `src/generator.ts` — add `emoji?: boolean` to `GenerateOptions`; resolve to
  `true` by default in `resolveOptions`; pass through at the 4 `intensify` call
  sites (`buildSentence`, `buildWords`, `buildSentenceRich`, `buildWordsRich`).
- `src/cli.ts` — add `--no-emoji` flag + HELP entry.
- `src/mcp.ts` — add `emoji: { type: 'boolean' }` to `generate_ipsum` schema and
  map it in `buildOptions`.
- `web/app.tsx` — toggle in section 03 (next to "Start with Lorem ipsum");
  persist in the shareable URL (`emoji=0`); thread into `generateRich`.
- `README.md` — document the option/flag.

**Tests:** `generator`/`intensity` — at a fixed seed, assert the word sequence
is **identical** with `emoji:true` vs `emoji:false` (only glyphs differ), and
that no `SPARKLES` glyph appears when off. `cli.test` — `--no-emoji`.
`mcp.test` — `emoji:false` path.

---

## Workstream B — Live preview & copy  ·  priority 2  ·  effort M

The demo already nails the hard parts (seedable shareable URLs, seed decoupled
from the other knobs, live reactivity, export). The gaps are presentation.

**B1 — Output above the fold (the big one).** Today `.page` is a vertical
stack; the Specimen (section 04) sits below all controls, so first paint shows
zero output. Wrap the composer + specimen in a `.workbench` element and make it
a 2-col grid at ≥ ~960px with the specimen `position: sticky`; Recent/Compare
stay full-width below. Single-column stack preserved under the breakpoint.
- Files: `web/app.tsx` (wrapper element), `web/style.css` (grid + sticky + new
  `min-width` media query).
- Alternatives if D2 lands differently: (a) move Specimen _above_ the composer
  in one column; (b) a slim sticky "result + Copy" bar that follows scroll.

**B2 — Copy feedback & granularity.**
- Swap the button label to **"Copied ✓"** on success and auto-revert (~2s), in
  addition to the existing aria-live toast (don't rely on toast alone).
- Add a **per-paragraph copy** icon on hover of each `.output p`.
- Files: `web/app.tsx`, `web/style.css`.

**B3 — Make the format view useful.** The HTML view currently prints raw markup
as text. Render a proper preview and keep per-format copy. Optional: **wrap in a
chosen tag (`p`/`div`) + CSS class** (loremipsum.io pattern). Add a real
`blocksToMarkdown` (+ export from `index.ts` + tests) **only** if we also add
list output (see B4); otherwise it duplicates plain text.

**B4 — Smaller wins (optional / tiered):**
- **Byte count** beside words/chars — trivial display add.
- **Short / Medium / Long** presets mapping to count values (Cupcake pattern).
- **Characters** as a generation unit — bigger: new `Unit` in the generator
  (generate, then trim to N at a word boundary) + tests. Treat as stretch.
- **Voice-tinted microcopy** — let the selected voice color button labels/empty
  states, not just the accent (Hipster/Cupcake carry the joke everywhere).

**Tests:** any generator addition (e.g. `blocksToMarkdown`, characters unit)
gets unit tests. The web layer isn't unit-tested today — verify B1/B2 by running
the demo.

---

## Workstream C — Jabba redraw  ·  priority 3  ·  effort S–M

**Goal:** keep it original vector art (no copyrighted likeness), but make it
read as a menacing Hutt, not a smiley frog.

- `web/app.tsx` `JabbaHutt` SVG: wider slug silhouette (no neck), **heavy hooded
  eyelids** over smaller eyes, a **wide sneering/downturned mouth**, layered
  shading, a **specular "slimy" highlight**, soft drop shadow; scale up to match
  the "BO SHUDA" drama.
- `web/style.css` `.hutt`: sizing + optional **idle animation** (slow breathing
  scale, occasional blink) — gated behind `prefers-reduced-motion`.
- Optional: retire the 🐸 chip emoji in `huttese.ts` (it primes the "frog" read)
  for something like 👑/🛸.

---

## Workstream D — Cantina enrichment  ·  priority 3  ·  effort M

**Goal:** turn the 16-step loop into something that doesn't fatigue. Stays
fully synthesized and original (no quoting the real cantina tune); already
user-initiated, so no autoplay concern.

- `web/eggAudio.ts` only: **A/B phrase structure** (32–64 steps with a
  contrasting B section + a turnaround fill); a **walking bassline** between the
  downbeats; a **kick** on downbeats and varied **hat** velocity for groove; a
  second **counter-melody** voice and light **lead vibrato** for the "alien
  jazz" wobble; layer the laugh (slight detune/echo).

---

## Workstream E — "Plain / bare-bones" dev mode  ·  priority 2  ·  effort S–M

**Goal:** a discoverable toggle that turns the editorial app into a no-nonsense
dev utility — system fonts, high contrast, no decoration, raw selectable output
— for people who "just want the text." The old-web / lipsum.com aesthetic, on
purpose.

**What flips when it's on:**
- **Chrome:** system (or monospace) font stack; solid high-contrast background
  (kill the aura/grain/vignette/gradients); flat borders; tighter spacing; no
  serif reading face, no drop-cap.
- **Output:** render the specimen as a plain, full-width, **selectable** block
  (a `<pre>`/`<textarea>`), no per-word hover spans, no flourish — so
  select-all + copy is frictionless.
- **Sensible pairings:** default **emoji off** and a neutral accent in plain
  mode.

**How it fits the code:** the app already drives appearance via data-attributes
on `#app` (`data-bg`, `data-type`, `data-density`, `data-tint`) with the rules
in `style.css`, persisted to `localStorage`. Add a **public** `plain` boolean
(visible toggle in the header or section 04), set `data-plain="1"` on `#app`,
add a `[data-plain]` CSS block that neutralizes the decorative layers, and
reflect it in the URL (`plain=1`). The hidden Konami Appearance panel stays as
dev fine-tuning; this is the one obvious public switch.

**Files:** `web/app.tsx` (toggle + `data-plain` + URL/persist), `web/style.css`
(the `[data-plain]` ruleset, motion-safe). **Library untouched.**

---

## Sequencing

- **Milestone 1 — Workstream A.** Fast, high-value usability fix; establishes the
  `1.1.0` bump and the README-update rhythm.
- **Milestone 2 — B1 + B2 + E.** The core UX win (visible output + copy polish)
  and the Plain dev mode — all demo CSS/UI, so they share a context. B3/B4
  follow as appetite allows.
- **Milestone 3 — C + D.** The delight pass; both live in the egg overlay.

Each milestone ends green on `npm run check`, with `README.md` updated and a
focused commit/PR.

## Housekeeping (any time)

- Untrack the two committed `*.tgz` pack artifacts; add `*.tgz` to `.gitignore`.
- The pending `package-lock.json` working-tree change (lockfile catching up to
  v1.0.1) can be committed.

## Out of scope (for now)

- A public HTTP API — the MCP server already covers programmatic use.
- New themes/voices.
