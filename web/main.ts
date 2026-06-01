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
const intensityValueEl = el<HTMLOutputElement>('intensityValue');
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

/** Render the temperature value with a cold → hot marker. */
function tempLabel(pct: number): string {
  const icon = pct < 25 ? '❄️' : pct < 55 ? '🌤️' : pct < 80 ? '🔥' : '🌋';
  return `${icon} ${pct}°`;
}

function addThemeChip(theme: Theme): void {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.dataset.id = theme.id;
  chip.setAttribute('role', 'radio');
  chip.setAttribute('aria-checked', String(theme.id === activeThemeId));
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

/** Update which chip is highlighted, without touching other controls. */
function setActiveTheme(id: string): void {
  activeThemeId = id;
  for (const chip of Array.from(themesEl.children) as HTMLButtonElement[]) {
    const isActive = chip.dataset.id === id;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
  }
}

/** Ensure a hidden theme's chip exists (used to reveal the Easter egg). */
function ensureChip(id: string): void {
  if (Array.from(themesEl.children).some((c) => (c as HTMLElement).dataset.id === id)) {
    return;
  }
  const theme = getTheme(id);
  if (theme) addThemeChip(theme);
}

/** User clicked a chip: switch theme and adopt its natural temperature. */
function selectTheme(id: string): void {
  setActiveTheme(id);
  const theme = getTheme(id);
  if (theme) setTemperature(Math.round((theme.defaultIntensity ?? 0.5) * 100));
  render();
}

function setTemperature(pct: number): void {
  intensityEl.value = String(pct);
  intensityValueEl.textContent = tempLabel(pct);
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

/** Surface the active theme's origin note, if it has one. */
function renderLore(theme: Theme | undefined): void {
  if (theme?.origin) {
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
  // us which voice actually spoke.
  const result = generateDetailed({ ...options, format: 'text' });
  outputLabelEl.textContent = `${result.theme.emoji} ${result.theme.name}`;
  renderLore(result.theme);

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

async function copyText(text: string, message: string): Promise<void> {
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

  // Temperature: honor the URL value, else the active theme's natural level.
  const temp = Number(p.get('temp'));
  if (Number.isFinite(temp) && p.get('temp') !== null) {
    setTemperature(Math.min(100, Math.max(0, Math.round(temp))));
  } else {
    const t = getTheme(activeThemeId)?.defaultIntensity ?? 0.5;
    setTemperature(Math.round(t * 100));
  }
}

// Wire up events.
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
intensityEl.addEventListener('input', () => {
  intensityValueEl.textContent = tempLabel(Number(intensityEl.value));
  render();
});
seedEl.addEventListener('input', onSeedInput);
htmlEl.addEventListener('change', render);
loremEl.addEventListener('change', render);
shuffleBtn.addEventListener('click', () => {
  // A fresh seed — unless the user has summoned Jabba and wants to stay.
  seedEl.value = randomSeed();
  render();
  shuffleBtn.classList.remove('pulse');
  void shuffleBtn.offsetWidth; // force reflow so the animation can replay
  shuffleBtn.classList.add('pulse');
});
copyBtn.addEventListener('click', () => copyText(lastPlainText, 'Copied text ✨'));
linkBtn.addEventListener('click', () => copyText(buildPermalink(), 'Link copied 🔗'));

// Initialize.
buildThemeChips();
applyStateFromUrl();
render();
