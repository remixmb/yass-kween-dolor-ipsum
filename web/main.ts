import {
  generate,
  generateDetailed,
  visibleThemes,
  getTheme,
  DEFAULT_THEME_ID,
  EASTER_EGG_SEED,
  EASTER_EGG_THEME_ID,
  type Unit,
  type GenerateOptions,
  type Theme,
} from '../src/index.js';
import './style.css';

/** The YouTube video about the mystery behind lorem ipsum's origins. */
const INSPIRATION_VIDEO_URL = 'https://www.youtube.com/watch?v=kL1PDqzqhM4';

/** Small typed helper for required DOM lookups. */
function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

const themesEl = el<HTMLDivElement>('themes');
const unitEl = el<HTMLSelectElement>('unit');
const countEl = el<HTMLInputElement>('count');
const countValueEl = el<HTMLOutputElement>('countValue');
const intensityEl = el<HTMLInputElement>('intensity');
const blendValueEl = el<HTMLOutputElement>('blendValue');
const endLoEl = el<HTMLSpanElement>('endLo');
const endHiEl = el<HTMLSpanElement>('endHi');
const seedEl = el<HTMLInputElement>('seed');
const htmlEl = el<HTMLInputElement>('html');
const loremEl = el<HTMLInputElement>('lorem');
const shuffleBtn = el<HTMLButtonElement>('shuffle');
const copyBtn = el<HTMLButtonElement>('copy');
const linkBtn = el<HTMLButtonElement>('link');
const outputEl = el<HTMLElement>('output');
const outputLabelEl = el<HTMLSpanElement>('outputLabel');
const outputStatsEl = el<HTMLSpanElement>('outputStats');
const loreBoxEl = el<HTMLDetailsElement>('loreBox');
const loreTextEl = el<HTMLParagraphElement>('loreText');
const inspoVideoEl = el<HTMLAnchorElement>('inspoVideo');
const toastEl = el<HTMLDivElement>('toast');

let activeThemeId: string = DEFAULT_THEME_ID;
let lastPlainText = '';
let hutteseRevealed = false;

/** Sensible per-unit defaults and ceilings for the count slider. */
const COUNT_DEFAULTS: Record<Unit, number> = {
  paragraphs: 3,
  sentences: 5,
  words: 24,
};
const COUNT_MAX: Record<Unit, number> = {
  paragraphs: 12,
  sentences: 20,
  words: 120,
};

/** A short, URL-friendly random seed. */
function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

function chips(): HTMLButtonElement[] {
  return Array.from(themesEl.children) as HTMLButtonElement[];
}

function addThemeChip(theme: Theme): void {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.dataset.id = theme.id;
  chip.setAttribute('role', 'radio');
  chip.setAttribute('aria-checked', String(theme.id === activeThemeId));
  chip.tabIndex = theme.id === activeThemeId ? 0 : -1;
  chip.title = theme.description;
  chip.innerHTML = `<span class="chip-emoji">${theme.emoji}</span><span class="chip-name">${theme.name}</span>`;
  if (theme.id === activeThemeId) chip.classList.add('active');
  if (theme.hidden) chip.classList.add('secret');
  chip.addEventListener('click', () => selectTheme(theme.id));
  themesEl.appendChild(chip);
}

function buildThemeChips(): void {
  for (const theme of visibleThemes) addThemeChip(theme);
}

/** Update which chip is highlighted and which is keyboard-focusable. */
function setActiveTheme(id: string): void {
  activeThemeId = id;
  for (const chip of chips()) {
    const isActive = chip.dataset.id === id;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
    chip.tabIndex = isActive ? 0 : -1;
  }
}

/** Ensure a hidden theme's chip exists (used to reveal the Easter egg). */
function ensureChip(id: string): void {
  if (chips().some((c) => c.dataset.id === id)) return;
  const theme = getTheme(id);
  if (theme) addThemeChip(theme);
}

/** User chose a chip: switch theme and adopt its natural blend level. */
function selectTheme(id: string): void {
  setActiveTheme(id);
  const theme = getTheme(id);
  if (theme) setBlend(Math.round((theme.defaultIntensity ?? 0.5) * 100));
  render();
}

function setBlend(pct: number): void {
  intensityEl.value = String(pct);
}

/** Reveal + select the hidden Huttese theme — the Jabba Easter egg. */
function revealHuttese(quiet = false): void {
  const huttese = getTheme(EASTER_EGG_THEME_ID);
  if (!huttese) return;
  const firstReveal = !hutteseRevealed;
  hutteseRevealed = true;
  ensureChip(huttese.id);
  if (firstReveal && !quiet) showToast('A wild Hutt appears 🐸 Bo shuda!');
  setActiveTheme(huttese.id);
}

/** Roving-tabindex keyboard navigation for the theme radiogroup. */
function onThemeKeydown(event: KeyboardEvent): void {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const list = chips();
  const currentIndex = list.findIndex((c) => c.dataset.id === activeThemeId);
  if (currentIndex < 0) return;
  event.preventDefault();
  let next = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    next = (currentIndex + 1) % list.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    next = (currentIndex - 1 + list.length) % list.length;
  } else if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = list.length - 1;
  }
  const target = list[next];
  if (target?.dataset.id) {
    selectTheme(target.dataset.id);
    target.focus();
  }
}

function syncCountBounds(): void {
  const unit = unitEl.value as Unit;
  countEl.max = String(COUNT_MAX[unit]);
  if (Number(countEl.value) > COUNT_MAX[unit]) {
    countEl.value = String(COUNT_DEFAULTS[unit]);
  }
  countValueEl.textContent = countEl.value;
}

function currentOptions(): GenerateOptions {
  return {
    theme: activeThemeId,
    units: unitEl.value as Unit,
    count: Number(countEl.value),
    format: htmlEl.checked ? 'html' : 'text',
    startWithLorem: loremEl.checked,
    intensity: Number(intensityEl.value) / 100,
    // The field is always populated, so output is reproducible and shareable.
    seed: seedEl.value.trim(),
  };
}

function computeStats(plain: string): string {
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  const chars = plain.length;
  return `${words} words · ${chars} chars`;
}

/** A human description of the current blend position for the given theme. */
function blendCaption(theme: Theme, pct: number): string {
  const isBlend = Boolean(theme.blendBase);
  if (pct <= 5) return isBlend ? 'Pure Cicero Latin 📜' : 'Barely seasoned';
  if (pct < 35) return isBlend ? 'Mostly Latin' : 'Subtle';
  if (pct < 65) return 'An even blend';
  if (pct < 90) return isBlend ? `Mostly ${theme.name}` : 'Bold';
  return isBlend ? `Full ${theme.name}` : 'Maximal';
}

/** Update the blend slider's endpoint labels and live caption. */
function renderBlend(theme: Theme): void {
  endLoEl.textContent = theme.blendBase ? '📜 Latin' : '🍃 Subtle';
  endHiEl.textContent = `${theme.emoji} ${theme.name}`;
  blendValueEl.textContent = blendCaption(theme, Number(intensityEl.value));
}

/** Surface the active theme's origin note, if it has one. */
function renderLore(theme: Theme): void {
  if (theme.origin) {
    loreTextEl.textContent = theme.origin;
    loreBoxEl.hidden = false;
  } else {
    loreBoxEl.hidden = true;
  }
}

/** Reflect the current state in the URL so it can be copied and shared. */
function buildPermalink(): string {
  const p = new URLSearchParams();
  p.set('theme', activeThemeId);
  p.set('units', unitEl.value);
  p.set('count', countEl.value);
  p.set('temp', intensityEl.value);
  p.set('seed', seedEl.value.trim());
  if (htmlEl.checked) p.set('html', '1');
  if (loremEl.checked) p.set('lorem', '1');
  const query = `?${p.toString()}`;
  history.replaceState(null, '', query);
  return `${location.origin}${location.pathname}${query}`;
}

function render(): void {
  const options = currentOptions();
  // The library may override the theme via the Jabba Easter egg, so let it tell
  // us which voice actually spoke, and label everything from that.
  const result = generateDetailed({ ...options, format: 'text' });
  const theme = result.theme;
  outputLabelEl.textContent = `${theme.emoji} ${theme.name}`;
  renderBlend(theme);
  renderLore(theme);

  const plain = result.text;
  lastPlainText = htmlEl.checked ? generate({ ...options, format: 'html' }) : plain;
  outputStatsEl.textContent = computeStats(plain);

  if (htmlEl.checked) {
    // Show the literal HTML markup so users can copy it.
    outputEl.classList.add('code');
    outputEl.textContent = lastPlainText;
  } else {
    outputEl.classList.remove('code');
    outputEl.innerHTML = '';
    for (const block of plain.split('\n\n')) {
      const para = document.createElement('p');
      para.textContent = block;
      outputEl.appendChild(para);
    }
  }

  buildPermalink();
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

async function copyToClipboard(text: string, message: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast(message);
  } catch {
    showToast('Could not copy — select and copy manually.');
  }
}

function onSeedInput(): void {
  if (seedEl.value.trim().toLowerCase() === EASTER_EGG_SEED) {
    revealHuttese();
  }
  render();
}

/** Restore state from the URL query, falling back to sensible defaults. */
function applyStateFromUrl(): void {
  const p = new URLSearchParams(location.search);

  const unit = p.get('units');
  if (unit && unit in COUNT_DEFAULTS) unitEl.value = unit;
  syncCountBounds();

  const count = Number(p.get('count'));
  if (Number.isFinite(count) && count >= 1) {
    const unitKey = unitEl.value as Unit;
    countEl.value = String(Math.min(count, COUNT_MAX[unitKey]));
  }
  countValueEl.textContent = countEl.value;

  htmlEl.checked = p.get('html') === '1';
  loremEl.checked = p.get('lorem') === '1';

  const seed = p.get('seed');
  seedEl.value = seed && seed.trim() ? seed.trim() : randomSeed();

  // Theme: reveal the hidden one if requested directly or via the egg seed.
  const themeParam = p.get('theme');
  if (seedEl.value.toLowerCase() === EASTER_EGG_SEED) {
    revealHuttese(true);
  } else if (themeParam && getTheme(themeParam)) {
    ensureChip(themeParam);
    setActiveTheme(themeParam);
    if (getTheme(themeParam)?.hidden) hutteseRevealed = true;
  } else {
    setActiveTheme(DEFAULT_THEME_ID);
  }

  // Blend: honor the URL value, else the active theme's natural level.
  const temp = Number(p.get('temp'));
  if (p.get('temp') !== null && Number.isFinite(temp)) {
    setBlend(Math.min(100, Math.max(0, Math.round(temp))));
  } else {
    const t = getTheme(activeThemeId)?.defaultIntensity ?? 0.5;
    setBlend(Math.round(t * 100));
  }
}

// Wire up events.
themesEl.addEventListener('keydown', onThemeKeydown);
unitEl.addEventListener('change', () => {
  const unit = unitEl.value as Unit;
  countEl.value = String(COUNT_DEFAULTS[unit]);
  syncCountBounds();
  render();
});
countEl.addEventListener('input', () => {
  countValueEl.textContent = countEl.value;
  render();
});
intensityEl.addEventListener('input', render);
seedEl.addEventListener('input', onSeedInput);
htmlEl.addEventListener('change', render);
loremEl.addEventListener('change', render);
shuffleBtn.addEventListener('click', () => {
  seedEl.value = randomSeed();
  render();
  shuffleBtn.classList.remove('pulse');
  void shuffleBtn.offsetWidth; // force reflow so the animation can replay
  shuffleBtn.classList.add('pulse');
});
copyBtn.addEventListener('click', () =>
  copyToClipboard(lastPlainText, 'Copied text ✨'),
);
linkBtn.addEventListener('click', () =>
  copyToClipboard(buildPermalink(), 'Link copied 🔗'),
);

// Initialize.
inspoVideoEl.href = INSPIRATION_VIDEO_URL;
buildThemeChips();
applyStateFromUrl();
render();
