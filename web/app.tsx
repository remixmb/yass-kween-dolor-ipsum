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
  generateRich,
  blocksToHtml,
  gloss,
  getTheme,
  visibleThemes,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
  type Theme,
  type Token,
  type Unit,
} from '../src/index.js';

const VIDEO_URL = 'https://www.youtube.com/watch?v=kL1PDqzqhM4';
const COUNT_DEFAULTS: Record<Unit, number> = {
  paragraphs: 3,
  sentences: 5,
  words: 24,
};
const COUNT_MAX: Record<Unit, number> = { paragraphs: 12, sentences: 20, words: 120 };

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

function blendCaption(theme: Theme, pct: number): string {
  const isBlend = Boolean(theme.blendBase);
  if (pct <= 5) return isBlend ? 'Pure Cicero Latin' : 'Barely seasoned';
  if (pct < 35) return isBlend ? 'Mostly Latin' : 'Subtle';
  if (pct < 65) return 'An even blend';
  if (pct < 90) return `Mostly ${theme.name}`;
  return isBlend ? `Full ${theme.name}` : 'Maximal';
}

/** A Cicero hover tip for a blend token, or null when the word isn't glossed. */
function tipFor(tok: Token, isBlend: boolean): string | null {
  if (tok.op || !isBlend || !tok.base) return null;
  const en = gloss(tok.base);
  return `📜 ${tok.base}${en ? `  ·  ${en}` : ''}`;
}

function renderTokens(tokens: Token[], isBlend: boolean, onTap: (tip: string) => void) {
  return tokens.map((tok, i) => {
    const tip = tipFor(tok, isBlend);
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
  html: boolean;
  hutteseRevealed: boolean;
}

function initialState(): InitialState {
  const p = new URLSearchParams(location.search);
  const unitParam = p.get('units');
  const unit: Unit =
    unitParam === 'sentences' || unitParam === 'words' ? unitParam : 'paragraphs';
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
    html: p.get('html') === '1',
    hutteseRevealed: jabba || getTheme(themeId)?.hidden === true,
  };
}

export function App() {
  const init = useMemo(initialState, []);
  const [themeId, setThemeId] = useState(init.themeId);
  const [blend, setBlend] = useState(init.blend);
  const [unit, setUnit] = useState<Unit>(init.unit);
  const [count, setCount] = useState(init.count);
  const [seed, setSeed] = useState(init.seed);
  const [lorem, setLorem] = useState(init.lorem);
  const [html, setHtml] = useState(init.html);
  const [hutteseRevealed, setHutteseRevealed] = useState(init.hutteseRevealed);
  const [toast, setToast] = useState('');
  const [eggBurst, setEggBurst] = useState(false);
  const [genId, setGenId] = useState(0);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const shuffleRef = useRef<HTMLButtonElement>(null);

  const result = useMemo(
    () =>
      generateRich({
        theme: themeId,
        units: unit,
        count,
        seed,
        intensity: blend / 100,
        startWithLorem: lorem,
      }),
    [themeId, unit, count, seed, blend, lorem],
  );
  const displayTheme = result.theme;
  const isBlend = result.isBlend;
  const plainText = result.text;
  const htmlText = useMemo(() => blocksToHtml(result.blocks), [result]);
  const copyText = html ? htmlText : plainText;
  const voice = displayTheme.accent ?? '#888888';
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = plainText.length;
  const eggActive = displayTheme.id === EASTER_EGG_THEME_ID;

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
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [displayTheme, unit, count, blend, seed, html, lorem]);

  // Escape dismisses the Easter-egg overlay.
  useEffect(() => {
    if (!eggBurst) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEggBurst(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [eggBurst]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2300);
  }, []);

  function selectTheme(id: string) {
    const th = getTheme(id);
    setThemeId(id);
    if (th) setBlend(Math.round((th.defaultIntensity ?? 0.5) * 100));
    setGenId((g) => g + 1);
  }

  function onSeed(v: string) {
    setSeed(v);
    if (v.trim().toLowerCase() === EASTER_EGG_SEED && !hutteseRevealed) {
      setHutteseRevealed(true);
      setEggBurst(true);
      if (eggTimer.current) clearTimeout(eggTimer.current);
      eggTimer.current = setTimeout(() => setEggBurst(false), 3000);
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
  }
  function changeUnit(v: Unit) {
    setUnit(v);
    setCount(COUNT_DEFAULTS[v]);
    setGenId((g) => g + 1);
  }

  const chipThemes = hutteseRevealed
    ? [...visibleThemes, getTheme(EASTER_EGG_THEME_ID)!]
    : visibleThemes;

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

  const appStyle = {
    '--voice': voice,
    '--blend': blend / 100,
    '--blend-pct': `${blend}%`,
  } as CSSProperties;

  return (
    <div
      id="app"
      data-bg="slate"
      data-type="spectral"
      data-density="regular"
      data-egg={eggActive ? '1' : undefined}
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
            <span className="meta">Est. Cicero, XLV B.C.</span>
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
                  aria-label="Unit"
                >
                  <option value="paragraphs">Paragraphs</option>
                  <option value="sentences">Sentences</option>
                  <option value="words">Words</option>
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
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={html}
                    onChange={(e) => setHtml(e.target.checked)}
                  />
                  <span>HTML output</span>
                </label>
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
              onClick={() => copy(copyText, 'Copied ✨')}
            >
              &#128203; Copy {html ? 'HTML' : 'text'}
            </button>
            <button type="button" className="btn" onClick={copyLink}>
              &#128279; Copy link
            </button>
          </div>
        </section>

        <section className="specimen" aria-label="Generated text" aria-live="polite">
          <div className="specimen-top">
            <p className="sec-label" style={{ margin: 0 }}>
              <span className="n">04</span> Specimen
            </p>
          </div>

          <div className="specimen-head">
            <span className="badge">
              <span className="em">{displayTheme.emoji}</span> {displayTheme.name}
            </span>
            <span className="sp-meta">
              <span className="stats">
                {wordCount} words &middot; {charCount} chars &middot; seed &ldquo;
                {seed}&rdquo;
              </span>
            </span>
          </div>

          {isBlend && !html && (
            <p className="hint">
              <span className="em">📜</span> Hover or tap an{' '}
              <span className="u">underlined</span> word to reveal Cicero&rsquo;s Latin
              &mdash; and what it means.
            </p>
          )}

          {html ? (
            <article className="output code">{htmlText}</article>
          ) : (
            <article className="output" key={genId}>
              {result.blocks.map((p, i) => (
                <p key={i} className={i === 0 ? 'lead' : ''}>
                  {renderTokens(p, isBlend, (tip) => showToast(tip))}
                </p>
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

        <footer className="footer">
          <span>
            Reproducible &amp; shareable &mdash; every result is encoded in the link.
          </span>
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
          <div className="egg-inner">
            <div className="egg-laugh">Ho ho ho ho&hellip;</div>
            <div className="egg-title">BO SHUDA</div>
            <div className="egg-sub">
              A wild Hutt awakens. Cicero&rsquo;s Latin, <em>huttese&rsquo;d.</em>
            </div>
            <div className="egg-skip">tap to enter the cantina</div>
          </div>
        </div>
      )}
    </div>
  );
}
