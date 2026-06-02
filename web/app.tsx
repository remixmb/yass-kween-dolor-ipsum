import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  generate,
  generateRich,
  blocksToHtml,
  gloss,
  themeGloss,
  getTheme,
  visibleThemes,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
  type Theme,
  type Token,
  type Unit,
} from '../src/index.js';
import { enterCantina, leaveCantina } from './eggAudio';

const VIDEO_URL = 'https://www.youtube.com/watch?v=kL1PDqzqhM4';
const COUNT_DEFAULTS: Record<Unit, number> = {
  paragraphs: 3,
  sentences: 5,
  words: 24,
  characters: 280,
};
const COUNT_MAX: Record<Unit, number> = {
  paragraphs: 12,
  sentences: 20,
  words: 120,
  characters: 2000,
};
// Friendly length presets (Short / Medium / Long) per unit — Cupcake's trick of
// removing the "how many?" decision while the slider stays for fine control.
const LENGTH_PRESETS: Record<Unit, [number, number, number]> = {
  paragraphs: [1, 3, 8],
  sentences: [2, 5, 12],
  words: [10, 24, 60],
  characters: [140, 280, 600],
};
const UNIT_SHORT: Record<Unit, string> = {
  paragraphs: 'para',
  sentences: 'sent',
  words: 'words',
  characters: 'char',
};

/* ---------- appearance tweaks (persisted) ---------- */
type Surface = 'auto' | 'slate' | 'paper' | 'aurora';
type Face = 'spectral' | 'garamond' | 'newsreader';
type Density = 'compact' | 'regular' | 'spacious';
type PlainScheme = 'auto' | 'light' | 'dark';
const SCHEME_CYCLE: Record<PlainScheme, PlainScheme> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
};
// The public scheme toggle cycles the editorial surface Auto -> Light -> Dark
// (paper/slate); aurora stays a dev-only choice and reverts to auto on cycle.
const SURFACE_LABEL: Record<Surface, string> = {
  auto: '◐ Auto',
  paper: '☀ Light',
  slate: '☾ Dark',
  aurora: '✦ Aurora',
};
const SURFACE_PUBLIC_CYCLE: Record<Surface, Surface> = {
  auto: 'paper',
  paper: 'slate',
  slate: 'auto',
  aurora: 'auto',
};
interface Tweaks {
  surface: Surface;
  face: Face;
  density: Density;
  tint: boolean;
  /** Bare-bones, high-contrast dev view: system font, no decoration. */
  plain: boolean;
  /** Plain view color scheme: follow the OS ('auto'), or force light/dark. */
  plainScheme: PlainScheme;
}
const DEFAULT_TWEAKS: Tweaks = {
  surface: 'auto',
  face: 'spectral',
  density: 'regular',
  tint: true,
  plain: false,
  plainScheme: 'auto',
};
const SURFACES: Surface[] = ['auto', 'slate', 'paper', 'aurora'];
const FACES: Face[] = ['spectral', 'garamond', 'newsreader'];
const DENSITIES: Density[] = ['compact', 'regular', 'spacious'];

/* ---------- recent rolls (persisted) ---------- */
interface Roll {
  key: string;
  themeId: string;
  blend: number;
  unit: Unit;
  count: number;
  seed: string;
  lorem: boolean;
  emoji: boolean;
}
const RECENT_KEY = 'li:recent';
const TWEAKS_KEY = 'li:tweaks';
const DEV_KEY = 'li:dev';
const RECENT_MAX = 14;

// Secret seeds (case-insensitive). `jabba` is handled by the library itself
// (it overrides the theme with Huttese); the rest are demo-only flourishes.
const PRIDE_SEEDS = /^(pride|rainbow|loveislove|lgbtq\+?|lgbtqia\+?)$/i;
const CICERO_SEEDS = /^(cicero|ave|finibus)$/i;
const ANSWER_SEEDS = /^(42|hitchhiker)$/i;

// The Konami code reveals the otherwise-hidden Appearance panel — a developer
// convenience, not a public control. ↑ ↑ ↓ ↓ ← → ← → B A.
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

/** The non-standard `beforeinstallprompt` event (absent from the DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function rollKey(r: Omit<Roll, 'key'>): string {
  return [r.themeId, r.blend, r.unit, r.count, r.seed, r.lorem ? 1 : 0, r.emoji ? 1 : 0].join('|');
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode, quotas) — ignore. */
  }
}

/** The OS color-scheme preference, used as the plain view's first default. */
function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Whether the OS asks for reduced motion — also used to keep the egg silent. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function loadTweaks(): Tweaks {
  const t = readStore<Partial<Tweaks>>(TWEAKS_KEY, {});
  return {
    surface:
      t.surface && SURFACES.includes(t.surface) ? t.surface : DEFAULT_TWEAKS.surface,
    face: t.face && FACES.includes(t.face) ? t.face : DEFAULT_TWEAKS.face,
    density:
      t.density && DENSITIES.includes(t.density) ? t.density : DEFAULT_TWEAKS.density,
    tint: t.tint !== false,
    plain: t.plain === true,
    plainScheme:
      t.plainScheme === 'light' || t.plainScheme === 'dark' ? t.plainScheme : 'auto',
  };
}

function loadRecent(): Roll[] {
  const raw = readStore<unknown>(RECENT_KEY, []);
  if (!Array.isArray(raw)) return [];
  const out: Roll[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const v = item as Partial<Roll>;
    if (typeof v.seed !== 'string' || typeof v.themeId !== 'string') continue;
    if (!getTheme(v.themeId)) continue;
    const unit: Unit =
      v.unit === 'sentences' || v.unit === 'words' || v.unit === 'characters'
        ? v.unit
        : 'paragraphs';
    const roll: Omit<Roll, 'key'> = {
      themeId: v.themeId,
      blend: clampInt(Number(v.blend), 0, 100, 50),
      unit,
      count: Math.max(1, Math.floor(Number(v.count)) || 1),
      seed: v.seed,
      lorem: Boolean(v.lorem),
      emoji: Boolean(v.emoji),
    };
    out.push({ key: rollKey(roll), ...roll });
    if (out.length >= RECENT_MAX) break;
  }
  return out;
}

function clampInt(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

function safeSeed(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'random';
}

function blendCaption(theme: Theme, pct: number): string {
  const isBlend = Boolean(theme.blendBase);
  if (pct <= 5) return isBlend ? 'Pure Cicero Latin' : 'Barely seasoned';
  if (pct < 35) return isBlend ? 'Mostly Latin' : 'Subtle';
  if (pct < 65) return 'An even blend';
  if (pct < 90) return `Mostly ${theme.name}`;
  return isBlend ? `Full ${theme.name}` : 'Maximal';
}

/** Normalize a rendered token to its dictionary form for display in a tip. */
function bareWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');
}

/**
 * A hover tip for a token: the Cicero Latin root + gloss for blend themes, or
 * the plain-English meaning for a non-blend voice's jargon. `null` when the
 * word carries no annotation (openers, interjections, unglossed words).
 */
function tipFor(tok: Token, theme: Theme, isBlend: boolean): string | null {
  if (tok.op) return null;
  // A voice word that carries a jargon gloss explains itself first — this keeps
  // the decode-the-jargon hover working for the blended jargon voices (e.g.
  // corporate "synergy"), where the word sits on top of a Latin root.
  const jargon = themeGloss(theme, tok.t);
  if (jargon) return `💡 ${bareWord(tok.t)}  ·  ${jargon}`;
  if (isBlend && tok.base) {
    const en = gloss(tok.base);
    return `📜 ${tok.base}${en ? `  ·  ${en}` : ''}`;
  }
  return null;
}

function renderTokens(
  tokens: Token[],
  theme: Theme,
  isBlend: boolean,
  onTap: (tip: string) => void,
) {
  return tokens.map((tok, i) => {
    const tip = tipFor(tok, theme, isBlend);
    return (
      <Fragment key={i}>
        {tip ? (
          <span className="cicero" data-tip={tip} onClick={() => onTap(tip)}>
            {tok.t}
          </span>
        ) : (
          tok.t
        )}
        {i < tokens.length - 1 ? ' ' : ''}
      </Fragment>
    );
  });
}

interface InitialState {
  themeId: string;
  blend: number;
  unit: Unit;
  count: number;
  seed: string;
  lorem: boolean;
  emoji: boolean;
  html: boolean;
  hutteseRevealed: boolean;
}

function initialState(): InitialState {
  const p = new URLSearchParams(location.search);
  const unitParam = p.get('units');
  const unit: Unit =
    unitParam === 'sentences' || unitParam === 'words' || unitParam === 'characters'
      ? unitParam
      : 'paragraphs';
  let count = Number(p.get('count'));
  if (!Number.isFinite(count) || count < 1) count = COUNT_DEFAULTS[unit];
  count = Math.min(count, COUNT_MAX[unit]);
  const seedParam = p.get('seed');
  const seed = seedParam && seedParam.trim() ? seedParam.trim() : randomSeed();
  const jabba = seed.toLowerCase() === EASTER_EGG_SEED;
  let themeId = p.get('theme') ?? '';
  if (!getTheme(themeId)) themeId = DEFAULT_THEME_ID;
  const tObj = getTheme(jabba ? EASTER_EGG_THEME_ID : themeId)!;
  let blend = Number(p.get('temp'));
  if (p.get('temp') === null || !Number.isFinite(blend)) {
    blend = Math.round((tObj.defaultIntensity ?? 0.5) * 100);
  }
  blend = Math.min(100, Math.max(0, Math.round(blend)));
  return {
    themeId,
    blend,
    unit,
    count,
    seed,
    lorem: p.get('lorem') === '1',
    emoji: p.get('emoji') === '1',
    html: p.get('html') === '1',
    hutteseRevealed: jabba || getTheme(themeId)?.hidden === true,
  };
}

/** An original, stylized Hutt — no copyrighted artwork, just shapes: a fat
 *  slug-lord with hooded eyes and a wide sneer. Breathes and blinks at rest. */
function JabbaHutt() {
  return (
    <svg className="hutt" viewBox="0 0 240 212" role="img" aria-label="A Hutt awakens">
      <defs>
        <linearGradient id="huttBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdb56e" />
          <stop offset="48%" stopColor="#9f9043" />
          <stop offset="100%" stopColor="#5b5226" />
        </linearGradient>
        <radialGradient id="huttSheen" cx="38%" cy="26%" r="44%">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff3cf" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="hutt-body">
        {/* the slug mound */}
        <path
          d="M120 26 C92 26 70 44 66 74 C46 96 30 132 38 164 C46 192 84 202 120 202 C156 202 194 192 202 164 C210 132 194 96 174 74 C170 44 148 26 120 26 Z"
          fill="url(#huttBody)"
          stroke="#3f4a22"
          strokeWidth="3"
        />
        {/* pale underbelly + fat folds */}
        <ellipse cx="120" cy="156" rx="76" ry="46" fill="#d8c489" opacity="0.5" />
        <path d="M58 140 Q120 160 182 140" stroke="#7c7032" strokeWidth="2.5" fill="none" opacity="0.4" />
        <path d="M66 170 Q120 188 174 170" stroke="#7c7032" strokeWidth="2.5" fill="none" opacity="0.32" />
        {/* slimy sheen */}
        <ellipse cx="98" cy="62" rx="58" ry="42" fill="url(#huttSheen)" />
        {/* eyes: small, hooded, half-lidded for a scheming glare */}
        <g className="hutt-eyes">
          <ellipse cx="96" cy="102" rx="15" ry="12" fill="#e7d68f" stroke="#4a4220" strokeWidth="2" />
          <ellipse cx="144" cy="102" rx="15" ry="12" fill="#e7d68f" stroke="#4a4220" strokeWidth="2" />
          <ellipse cx="97" cy="103" rx="5.5" ry="8" fill="#23180a" />
          <ellipse cx="143" cy="103" rx="5.5" ry="8" fill="#23180a" />
          <circle cx="93" cy="99" r="1.8" fill="#fffaf0" opacity="0.6" />
          <circle cx="139" cy="99" r="1.8" fill="#fffaf0" opacity="0.6" />
          {/* heavy lids drooping over the top half */}
          <path d="M80 102 Q96 86 112 102 Q96 100 80 102 Z" fill="url(#huttBody)" />
          <path d="M128 102 Q144 86 160 102 Q144 100 128 102 Z" fill="url(#huttBody)" />
          <path d="M81 100 Q96 92 111 100" stroke="#4a4220" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M129 100 Q144 92 159 100" stroke="#4a4220" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
        {/* heavy angled brow ridges + a frown crease */}
        <path d="M73 90 Q96 80 117 89" stroke="#544a22" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M123 89 Q144 80 167 90" stroke="#544a22" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M119 83 Q121 92 120 99" stroke="#4a4220" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* nostrils */}
        <ellipse cx="111" cy="128" rx="3" ry="5" fill="#3a3115" transform="rotate(-16 111 128)" />
        <ellipse cx="129" cy="128" rx="3" ry="5" fill="#3a3115" transform="rotate(16 129 128)" />
        {/* jutting lower lip / jowl */}
        <path d="M64 162 Q120 154 176 162 Q174 192 120 196 Q66 192 64 162 Z" fill="#b18a55" opacity="0.92" />
        {/* wide down-turned maw — the sneer */}
        <path
          className="hutt-mouth"
          d="M74 161 Q120 146 166 161 Q120 156 74 161 Z"
          fill="#23170b"
        />
        {/* drooping corner creases */}
        <path d="M71 156 Q66 165 73 171" stroke="#5c4a2c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M169 156 Q174 165 167 171" stroke="#5c4a2c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

export function App() {
  const init = useMemo(initialState, []);
  const [themeId, setThemeId] = useState(init.themeId);
  const [blend, setBlend] = useState(init.blend);
  const [unit, setUnit] = useState<Unit>(init.unit);
  const [count, setCount] = useState(init.count);
  const [seed, setSeed] = useState(init.seed);
  const [lorem, setLorem] = useState(init.lorem);
  const [emoji, setEmoji] = useState(init.emoji);
  const [view, setView] = useState<'text' | 'html'>(init.html ? 'html' : 'text');
  const [hutteseRevealed, setHutteseRevealed] = useState(init.hutteseRevealed);
  const [tweaks, setTweaks] = useState<Tweaks>(loadTweaks);
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [recent, setRecent] = useState<Roll[]>(loadRecent);
  const [compareOpen, setCompareOpen] = useState(false);
  const [devPanel, setDevPanel] = useState(() => readStore<boolean>(DEV_KEY, false));
  const [toast, setToast] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [eggBurst, setEggBurst] = useState(false);
  const [prideBurst, setPrideBurst] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [genId, setGenId] = useState(0);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prideFired = useRef(false);
  const devRef = useRef(devPanel);
  const lastRecorded = useRef<string>('');
  const primaryRef = useRef<HTMLButtonElement>(null);
  const shuffleRef = useRef<HTMLButtonElement>(null);

  const html = view === 'html';
  const pride = PRIDE_SEEDS.test(seed.trim());

  const result = useMemo(
    () =>
      generateRich({
        theme: themeId,
        units: unit,
        count,
        seed,
        intensity: blend / 100,
        startWithLorem: lorem,
        emoji,
      }),
    [themeId, unit, count, seed, blend, lorem, emoji],
  );
  const displayTheme = result.theme;
  const isBlend = result.isBlend;
  const hasGlossary = Boolean(displayTheme.glossary);
  const plainText = result.text;
  const htmlText = useMemo(() => blocksToHtml(result.blocks), [result]);
  const copyText = html ? htmlText : plainText;
  const voice = displayTheme.accent ?? '#888888';
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = plainText.length;
  const byteCount = new TextEncoder().encode(plainText).length;
  const eggActive = displayTheme.id === EASTER_EGG_THEME_ID;

  const currentKey = rollKey({
    themeId: displayTheme.id,
    blend,
    unit,
    count,
    seed,
    lorem,
    emoji,
  });

  const chipThemes = useMemo(
    () =>
      hutteseRevealed
        ? [...visibleThemes, getTheme(EASTER_EGG_THEME_ID)!]
        : [...visibleThemes],
    [hutteseRevealed],
  );

  // Compare gallery: one short, same-seed specimen per voice at its natural
  // blend. Computed only while the gallery is open. Dodge the Jabba override so
  // every card shows its own voice rather than collapsing to Huttese.
  const comparePreviews = useMemo(() => {
    if (!compareOpen) return [];
    const previewSeed = seed.toLowerCase() === EASTER_EGG_SEED ? `${seed}~` : seed;
    return chipThemes.map((th) => ({
      theme: th,
      text: generate({
        theme: th.id,
        units: 'sentences',
        count: 1,
        seed: previewSeed,
        intensity: th.defaultIntensity ?? 0.6,
      }),
    }));
  }, [compareOpen, seed, chipThemes]);

  // Reflect state in the URL so every result is shareable.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set('theme', displayTheme.id);
    p.set('units', unit);
    p.set('count', String(count));
    p.set('temp', String(blend));
    p.set('seed', seed);
    if (html) p.set('html', '1');
    if (lorem) p.set('lorem', '1');
    if (emoji) p.set('emoji', '1');
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [displayTheme, unit, count, blend, seed, html, lorem, emoji]);

  // Persist appearance tweaks and recent rolls.
  useEffect(() => writeStore(TWEAKS_KEY, tweaks), [tweaks]);
  // Don't persist the hidden Huttese egg into saved history — keep it a secret
  // that re-hides next session (a shared ?seed=jabba link still summons it).
  useEffect(
    () => writeStore(RECENT_KEY, recent.filter((r) => !getTheme(r.themeId)?.hidden)),
    [recent],
  );

  // Follow the OS color scheme live while the plain view is on "auto".
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Record a "roll" once the current result settles, deduped by signature. The
  // debounce keeps slider drags from flooding history with intermediate values.
  useEffect(() => {
    const id = setTimeout(() => {
      if (currentKey === lastRecorded.current) return;
      lastRecorded.current = currentKey;
      const entry: Roll = {
        key: currentKey,
        themeId: displayTheme.id,
        blend,
        unit,
        count,
        seed,
        lorem,
        emoji,
      };
      setRecent((prev) =>
        [entry, ...prev.filter((r) => r.key !== currentKey)].slice(0, RECENT_MAX),
      );
    }, 700);
    return () => clearTimeout(id);
  }, [currentKey, displayTheme.id, blend, unit, count, seed, lorem, emoji]);

  // Persist the (secret) developer Appearance panel unlock.
  useEffect(() => {
    devRef.current = devPanel;
    writeStore(DEV_KEY, devPanel);
  }, [devPanel]);

  // Escape dismisses any open Easter-egg overlay.
  useEffect(() => {
    if (!eggBurst && !prideBurst) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEggBurst(false);
        setPrideBurst(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eggBurst, prideBurst]);

  // The cantina audio rides with the Huttese overlay: a live-synthesized 8-bit
  // loop and Jabba's laugh (no audio files), faded out when it closes.
  useEffect(() => {
    // Treat reduced-motion as a "calm, please" signal: the egg still appears,
    // but stays silent for anyone who has asked the OS to tone effects down.
    if (eggBurst && !prefersReducedMotion()) enterCantina();
    else leaveCantina();
    return () => leaveCantina();
  }, [eggBurst]);

  // Fire the Pride celebration once when a pride seed activates it.
  useEffect(() => {
    if (pride && !prideFired.current) {
      prideFired.current = true;
      setPrideBurst(true);
      if (prideTimer.current) clearTimeout(prideTimer.current);
      prideTimer.current = setTimeout(() => setPrideBurst(false), 3600);
    }
    if (!pride) prideFired.current = false;
  }, [pride]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2300);
  }, []);

  // Konami code (↑ ↑ ↓ ↓ ← → ← → B A) toggles the hidden Appearance panel — a
  // developer convenience kept out of the public UI.
  useEffect(() => {
    const buf: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (buf.length > KONAMI.length) buf.shift();
      if (buf.length === KONAMI.length && KONAMI.every((k, i) => buf[i] === k)) {
        buf.length = 0;
        const next = !devRef.current;
        devRef.current = next;
        setDevPanel(next);
        showToast(next ? '🛠️ Appearance panel unlocked' : '🛠️ Appearance panel hidden');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showToast]);

  // Quick-use shortcuts: C copies, S shuffles — but never while typing in a
  // field, with a modifier held (so Cmd/Ctrl+C still works), or over an overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || eggBurst || prideBurst) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el?.isContentEditable
      )
        return;
      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        copy(copyText, 'Copied ✨');
        flashCopied('text');
      } else if (k === 's') {
        e.preventDefault();
        doShuffle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyText, eggBurst, prideBurst]);

  // Surface an Install button only when the browser reports the app installable.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice.catch(() => undefined);
    setInstallEvt(null);
  }

  function selectTheme(id: string) {
    const th = getTheme(id);
    if (th?.hidden) {
      // Picking the secret Hutt chip replays the cantina, laugh and all.
      setHutteseRevealed(true);
      setEggBurst(true);
    }
    setThemeId(id);
    if (th) setBlend(Math.round((th.defaultIntensity ?? 0.5) * 100));
    setGenId((g) => g + 1);
  }

  function onSeed(v: string) {
    setSeed(v);
    const s = v.trim().toLowerCase();
    if (s === EASTER_EGG_SEED && !hutteseRevealed) {
      setHutteseRevealed(true);
      setEggBurst(true);
    } else if (CICERO_SEEDS.test(s)) {
      showToast('🏛️ Ave, Cicero. Slide the blend to 0 to read him unblended.');
    } else if (ANSWER_SEEDS.test(s)) {
      showToast('📖 42 — the answer to ipsum, the universe, and everything.');
    }
  }

  function doShuffle() {
    setSeed(randomSeed());
    setGenId((g) => g + 1);
    const el = primaryRef.current;
    if (el) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
    const s = shuffleRef.current;
    if (s) {
      s.classList.remove('spin');
      void s.offsetWidth;
      s.classList.add('spin');
    }
  }

  function restoreRoll(r: Roll) {
    if (getTheme(r.themeId)?.hidden) setHutteseRevealed(true);
    setThemeId(r.themeId);
    setBlend(r.blend);
    setUnit(r.unit);
    setCount(r.count);
    setSeed(r.seed);
    setLorem(r.lorem);
    setEmoji(r.emoji);
    setGenId((g) => g + 1);
  }

  function clearRecent() {
    setRecent([]);
    lastRecorded.current = currentKey;
  }

  // Flash transient "✓ Copied" feedback on the button that was used, on top of
  // the aria-live toast (a visual confirmation that doesn't rely on the toast).
  function flashCopied(id: string) {
    setCopiedId(id);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedId(''), 1600);
  }

  async function copy(text: string, msg: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(msg);
    } catch {
      showToast('Could not copy — select manually.');
    }
  }
  function copyLink() {
    copy(location.origin + location.pathname + location.search, 'Link copied 🔗');
    flashCopied('link');
  }
  function copyParagraph(text: string, i: number) {
    copy(text, 'Paragraph copied ✨');
    flashCopied(`p${i}`);
  }

  function download(filename: string, mime: string, data: string) {
    try {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Saved ${filename} ⬇`);
    } catch {
      showToast('Download failed — copy instead.');
    }
  }
  function exportTxt() {
    download(
      `lorem-ipsum-${safeSeed(seed)}.txt`,
      'text/plain;charset=utf-8',
      `${plainText}\n`,
    );
  }
  function exportJson() {
    const payload = {
      generator: 'yass-kween-dolor-ipsum',
      theme: displayTheme.id,
      voice: displayTheme.name,
      seed,
      units: unit,
      count,
      blend,
      intensity: blend / 100,
      startWithLorem: lorem,
      emoji,
      isBlend,
      text: plainText,
      html: htmlText,
    };
    download(
      `lorem-ipsum-${safeSeed(seed)}.json`,
      'application/json;charset=utf-8',
      JSON.stringify(payload, null, 2),
    );
  }

  function changeUnit(v: Unit) {
    setUnit(v);
    setCount(COUNT_DEFAULTS[v]);
    setGenId((g) => g + 1);
  }

  function onVoicesKey(e: React.KeyboardEvent) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (keys.indexOf(e.key) < 0) return;
    e.preventDefault();
    const ids = chipThemes.map((th) => th.id);
    let idx = ids.indexOf(displayTheme.id);
    if (idx < 0) idx = 0;
    let n = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (idx + 1) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      n = (idx - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    const nextId = ids[n]!;
    selectTheme(nextId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `.voices .chip[data-id="${nextId}"]`,
      );
      el?.focus();
    });
  }

  // The editorial surface follows the OS when on 'auto': parchment (paper) for a
  // light system, slate for a dark one. The Appearance panel can still override.
  const surface: Exclude<Surface, 'auto'> =
    tweaks.surface === 'auto' ? (systemDark ? 'slate' : 'paper') : tweaks.surface;
  const plainDark =
    tweaks.plainScheme === 'auto' ? systemDark : tweaks.plainScheme === 'dark';
  const appStyle = {
    '--voice': voice,
    '--blend': blend / 100,
    '--blend-pct': `${blend}%`,
  } as CSSProperties;

  return (
    <div
      id="app"
      data-bg={surface}
      data-type={tweaks.face}
      data-density={tweaks.density}
      data-tint={tweaks.tint ? undefined : 'off'}
      data-plain={tweaks.plain ? (plainDark ? 'dark' : 'light') : undefined}
      data-egg={eggActive ? '1' : undefined}
      data-pride={pride ? '1' : undefined}
      style={appStyle}
    >
      <a className="skip" href="#composer">
        Skip to controls
      </a>
      <div className="bg" aria-hidden="true">
        <div className="aura" />
        <div className="grain" />
        <div className="vignette" />
      </div>

      <main className="page">
        <header className="masthead">
          <div className="mast-top">
            <span>A field guide to themed placeholder text</span>
            <span className="mast-right">
              <span className="meta">Est. Cicero, XLV B.C.</span>
              <button
                type="button"
                className="plain-toggle"
                title="Color scheme — Auto follows your system"
                onClick={() =>
                  setTweaks((t) =>
                    t.plain
                      ? { ...t, plainScheme: SCHEME_CYCLE[t.plainScheme] }
                      : { ...t, surface: SURFACE_PUBLIC_CYCLE[t.surface] },
                  )
                }
              >
                {tweaks.plain
                  ? tweaks.plainScheme === 'auto'
                    ? '◐ Auto'
                    : tweaks.plainScheme === 'dark'
                      ? '☾ Dark'
                      : '☀ Light'
                  : SURFACE_LABEL[tweaks.surface]}
              </button>
              <button
                type="button"
                className="plain-toggle"
                aria-pressed={tweaks.plain}
                title="Toggle a bare-bones, dev-friendly view"
                onClick={() => setTweaks((t) => ({ ...t, plain: !t.plain }))}
              >
                {tweaks.plain ? 'Editorial view' : 'Plain view'}
              </button>
            </span>
          </div>
          <h1 className="wordmark">
            Lorem <span className="amp">&amp;</span> Ipsum
          </h1>
          <p className="dek">
            It was never gibberish. <b>Lorem ipsum</b> is scrambled Latin from
            Cicero&rsquo;s <span className="latin">de Finibus Bonorum et Malorum</span>{' '}
            (45 BC) &mdash; a treatise on pleasure and pain, where{' '}
            <span className="latin">dolorem ipsum</span> means &ldquo;pain
            itself.&rdquo; Slide the blend toward Latin and Cicero resurfaces; push it
            toward a voice and the text comes alive.{' '}
            <a href={VIDEO_URL} target="_blank" rel="noopener">
              &#9654; Watch the origin story
            </a>
          </p>
          <div className="rule double" />
        </header>

        <div className="workbench">
          <div className="controls">
        <section className="composer" id="composer" aria-label="Generator controls">
          <div className="group">
            <p className="sec-label" id="voiceLabel">
              <span className="n">01</span> Voice
            </p>
            <div
              className="voices"
              role="radiogroup"
              aria-labelledby="voiceLabel"
              onKeyDown={onVoicesKey}
            >
              {chipThemes.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  data-id={th.id}
                  className={
                    'chip' +
                    (th.id === displayTheme.id ? ' active' : '') +
                    (th.hidden ? ' secret' : '')
                  }
                  role="radio"
                  aria-checked={th.id === displayTheme.id}
                  title={th.description}
                  tabIndex={th.id === displayTheme.id ? 0 : -1}
                  style={{ '--chip': th.accent } as CSSProperties}
                  onClick={() => selectTheme(th.id)}
                >
                  <span className="em">{th.emoji}</span>
                  <span>{th.name}</span>
                </button>
              ))}
            </div>
            <p className="voice-blurb">{displayTheme.description}</p>
          </div>

          <div className="group">
            <div className="blend-head">
              <p className="sec-label" style={{ margin: 0 }}>
                <span className="n">02</span> Blend
              </p>
              <span className="blend-caption">
                {blendCaption(displayTheme, blend)}
                <span className="deg">{blend}&deg;</span>
              </span>
            </div>
            <input
              type="range"
              className="dial"
              min={0}
              max={100}
              value={blend}
              aria-label="Blend from Latin to the chosen voice"
              aria-valuetext={`${blendCaption(displayTheme, blend)}, ${blend} of 100`}
              onChange={(e) => setBlend(Number(e.target.value))}
            />
            <div className="scale-ends">
              <span>{isBlend ? '📜 Latin' : 'Subtle'}</span>
              <span className="hi">
                {displayTheme.emoji} {displayTheme.name}
              </span>
            </div>
          </div>

          <div className="group">
            <p className="sec-label">
              <span className="n">03</span> Shape
            </p>
            <div className="shape">
              <label className="field">
                <span className="field-label">Generate</span>
                <select
                  value={unit}
                  onChange={(e) => changeUnit(e.target.value as Unit)}
                >
                  <option value="paragraphs">Paragraphs</option>
                  <option value="sentences">Sentences</option>
                  <option value="words">Words</option>
                  <option value="characters">Characters</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">
                  Count <span className="out">{count}</span>
                </span>
                <div className="count-row">
                  <input
                    type="range"
                    className="range"
                    min={1}
                    max={COUNT_MAX[unit]}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    aria-label="Count"
                    aria-valuetext={`${count} ${unit}`}
                  />
                </div>
              </label>
              <label className="field">
                <span className="field-label">Length</span>
                <div className="view-seg presets" role="group" aria-label="Length preset">
                  {(['Short', 'Medium', 'Long'] as const).map((label, i) => {
                    const v = LENGTH_PRESETS[unit][i]!;
                    return (
                      <button
                        key={label}
                        type="button"
                        className={count === v ? 'on' : ''}
                        aria-pressed={count === v}
                        onClick={() => setCount(v)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </label>
              <label className="field">
                <span className="field-label">
                  Seed <small>shareable</small>
                </span>
                <div className="seed-row">
                  <input
                    type="text"
                    className="text-in"
                    value={seed}
                    placeholder="random"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => onSeed(e.target.value)}
                    aria-label="Seed"
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    ref={shuffleRef}
                    title="New random seed"
                    aria-label="Shuffle seed"
                    onClick={doShuffle}
                  >
                    &#127922;
                  </button>
                </div>
              </label>
              <div className="field toggles">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={lorem}
                    onChange={(e) => setLorem(e.target.checked)}
                  />
                  <span>Start with &ldquo;Lorem ipsum&rdquo;</span>
                </label>
                {/* Only Yass Kween sparkles, so the toggle appears for it alone. */}
                {displayTheme.id === 'yass-kween' && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={emoji}
                      onChange={(e) => setEmoji(e.target.checked)}
                    />
                    <span>Sparkle emoji ✨</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn btn-primary"
              ref={primaryRef}
              onClick={doShuffle}
            >
              &#127922; Shuffle
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                copy(copyText, 'Copied ✨');
                flashCopied('text');
              }}
            >
              {copiedId === 'text' ? (
                '✓ Copied'
              ) : (
                <>&#128203; Copy {html ? 'HTML' : 'text'}</>
              )}
            </button>
            <button type="button" className="btn" onClick={copyLink}>
              {copiedId === 'link' ? '✓ Copied' : <>&#128279; Copy link</>}
            </button>
          </div>
          <p className="kbd-hint" aria-hidden="true">
            <kbd>C</kbd> copy &middot; <kbd>S</kbd> shuffle
          </p>
        </section>

        {devPanel && (
          <details className="tweaks">
            <summary>
              <span className="tw-gear" aria-hidden="true">
                &#9881;
              </span>{' '}
              Appearance (dev)
            </summary>
            <div className="tweak-grid">
              <div className="tweak-row">
                <span className="tw-label">Surface</span>
                <div className="view-seg" role="group" aria-label="Surface">
                  {SURFACES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={tweaks.surface === s ? 'on' : ''}
                      aria-pressed={tweaks.surface === s}
                      onClick={() => setTweaks((t) => ({ ...t, surface: s }))}
                    >
                      {cap(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tweak-row">
                <span className="tw-label">Reading face</span>
                <div className="view-seg" role="group" aria-label="Reading face">
                  {FACES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={tweaks.face === f ? 'on' : ''}
                      aria-pressed={tweaks.face === f}
                      onClick={() => setTweaks((t) => ({ ...t, face: f }))}
                    >
                      {cap(f)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tweak-row">
                <span className="tw-label">Density</span>
                <div className="view-seg" role="group" aria-label="Density">
                  {DENSITIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={tweaks.density === d ? 'on' : ''}
                      aria-pressed={tweaks.density === d}
                      onClick={() => setTweaks((t) => ({ ...t, density: d }))}
                    >
                      {cap(d)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tweak-row">
                <span className="tw-label">Page tint</span>
                <label className="toggle tw-toggle">
                  <input
                    type="checkbox"
                    checked={tweaks.tint}
                    onChange={(e) =>
                      setTweaks((t) => ({ ...t, tint: e.target.checked }))
                    }
                  />
                  <span>{tweaks.tint ? 'Voice color' : 'Neutral'}</span>
                </label>
              </div>
            </div>
          </details>
        )}
          </div>

        <section className="specimen" aria-label="Generated text" aria-live="polite">
          <div className="specimen-top">
            <p className="sec-label" style={{ margin: 0 }}>
              <span className="n">04</span> Specimen
            </p>
            <div className="view-seg" role="group" aria-label="Output format">
              <button
                type="button"
                className={view === 'text' ? 'on' : ''}
                aria-pressed={view === 'text'}
                onClick={() => setView('text')}
              >
                Text
              </button>
              <button
                type="button"
                className={view === 'html' ? 'on' : ''}
                aria-pressed={view === 'html'}
                onClick={() => setView('html')}
              >
                HTML
              </button>
            </div>
          </div>

          <div className="specimen-head">
            <span className="badge">
              <span className="em">{displayTheme.emoji}</span> {displayTheme.name}
            </span>
            <span className="sp-meta">
              <span className="stats">
                {wordCount} words &middot; {charCount} chars &middot; {byteCount} bytes
                &middot; seed &ldquo;{seed}&rdquo;
              </span>
              <span className="export">
                <button
                  type="button"
                  onClick={exportTxt}
                  title="Download as plain text"
                >
                  .txt
                </button>
                <button type="button" onClick={exportJson} title="Download as JSON">
                  .json
                </button>
              </span>
            </span>
          </div>

          {!html && isBlend && (
            <p className="hint">
              <span className="em">📜</span> Hover or tap an{' '}
              <span className="u">underlined</span> word to reveal Cicero&rsquo;s Latin
              &mdash; and what it means.
            </p>
          )}
          {!html && !isBlend && hasGlossary && (
            <p className="hint">
              <span className="em">💡</span> Hover or tap an{' '}
              <span className="u">underlined</span> word to decode the jargon.
            </p>
          )}

          {html ? (
            <article className="output code">{htmlText}</article>
          ) : (
            <article className="output" key={genId}>
              {result.blocks.map((p, i) => (
                <div className="op" key={i}>
                  <p className={i === 0 ? 'lead' : ''}>
                    {renderTokens(p, displayTheme, isBlend, (tip) => showToast(tip))}
                  </p>
                  <button
                    type="button"
                    className="op-copy"
                    title="Copy this paragraph"
                    aria-label="Copy this paragraph"
                    onClick={() => copyParagraph(p.map((t) => t.t).join(' '), i)}
                  >
                    {copiedId === `p${i}` ? '✓' : '⧉'}
                  </button>
                </div>
              ))}
            </article>
          )}

          {displayTheme.origin && (
            <details className="lore">
              <summary>About this voice</summary>
              <p>{displayTheme.origin}</p>
            </details>
          )}
        </section>
        </div>

        {recent.length > 0 && (
          <section className="recent" aria-label="Recent rolls">
            <div className="recent-head">
              <p className="sec-label" style={{ margin: 0 }}>
                <span className="n">05</span> Recent rolls
              </p>
              <button type="button" className="recent-clear" onClick={clearRecent}>
                Clear
              </button>
            </div>
            <div className="recent-strip">
              {recent.map((r) => {
                const th = getTheme(r.themeId)!;
                const on = r.key === currentKey;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={'recent-item' + (on ? ' on' : '')}
                    style={{ '--voice': th.accent } as CSSProperties}
                    onClick={() => restoreRoll(r)}
                    aria-current={on ? 'true' : undefined}
                    title={`${th.name} · ${r.blend}° · ${r.count} ${r.unit} · seed "${r.seed}"`}
                  >
                    <span className="em">{th.emoji}</span>
                    <span className="ri-body">
                      <span className="ri-seed">{r.seed}</span>
                      <span className="ri-meta">
                        {th.name} &middot; {r.blend}&deg; &middot; {r.count}{' '}
                        {UNIT_SHORT[r.unit]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="compare" aria-label="Compare voices">
          <div className="specimen-top">
            <p className="sec-label" style={{ margin: 0 }}>
              <span className="n">06</span> Compare
            </p>
            <button
              type="button"
              className="btn-ghost"
              aria-expanded={compareOpen}
              onClick={() => setCompareOpen((o) => !o)}
            >
              {compareOpen ? 'Hide gallery' : 'Compare all voices'}
            </button>
          </div>
          {compareOpen && (
            <>
              <p className="hint">
                <span className="em">🎛️</span> Same seed &ldquo;{seed}&rdquo;, each
                voice at its natural blend. Click a card to switch the specimen to that
                voice.
              </p>
              <div className="cmp-grid">
                {comparePreviews.map(({ theme: th, text }) => (
                  <button
                    key={th.id}
                    type="button"
                    className={
                      'cmp-card' + (th.id === displayTheme.id ? ' active' : '')
                    }
                    style={{ '--voice': th.accent } as CSSProperties}
                    onClick={() => selectTheme(th.id)}
                  >
                    <span className="cmp-head">
                      <span className="em">{th.emoji}</span> {th.name}
                    </span>
                    <span className="cmp-body">{text}</span>
                    <span className="cmp-pick">
                      {th.id === displayTheme.id ? 'Current voice' : 'Use this voice →'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <footer className="footer">
          <span>
            Reproducible &amp; shareable &mdash; every result is encoded in the link.
          </span>
          {installEvt && (
            <button type="button" className="install-btn" onClick={installApp}>
              &#11015; Install app
            </button>
          )}
          <a
            href="https://github.com/remixmb/yass-kween-dolor-ipsum"
            target="_blank"
            rel="noopener"
          >
            View the source &rarr;
          </a>
        </footer>
      </main>

      <div
        className={'toast' + (toast ? ' show' : '')}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>

      {eggBurst && (
        <div
          className="egg-burst"
          onClick={() => setEggBurst(false)}
          role="presentation"
        >
          <div className="egg-suns" aria-hidden="true" />
          {/* Diegetic "the band is playing" cue — drifting notes, motion-gated
              to match the audio (both stay still/silent under reduced-motion). */}
          <div className="egg-notes" aria-hidden="true">
            <span>&#9834;</span>
            <span>&#9835;</span>
            <span>&#9833;</span>
            <span>&#9839;</span>
          </div>
          <button
            type="button"
            className="egg-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setEggBurst(false);
            }}
          >
            &times;
          </button>
          <div className="egg-inner">
            <div className="egg-laugh">Ho ho ho ho&hellip;</div>
            <JabbaHutt />
            <div className="egg-title">BO SHUDA</div>
            <div className="egg-sub">
              A wild Hutt awakens. Cicero&rsquo;s Latin, <em>huttese&rsquo;d.</em>
            </div>
            <div className="egg-trans">
              &laquo; bo shuda &raquo; &mdash; <span>back off, lesser being</span>
            </div>
            <div className="egg-skip">
              &#127927; live-synth cantina swing &middot; tap anywhere to close
            </div>
          </div>
        </div>
      )}

      {prideBurst && (
        <div
          className="pride-burst"
          onClick={() => setPrideBurst(false)}
          role="presentation"
        >
          <button
            type="button"
            className="egg-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              setPrideBurst(false);
            }}
          >
            &times;
          </button>
          <div className="pride-flag" aria-hidden="true" />
          <div className="pride-inner">
            <div className="pride-emoji">🏳️‍🌈</div>
            <div className="pride-title">LOVE IS LOVE</div>
            <div className="pride-sub">Lorem ipsum, in full color. Happy Pride. 🌈</div>
            <div className="egg-skip">tap to continue</div>
          </div>
        </div>
      )}
    </div>
  );
}
