import {
  generate,
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
const generateBtn = el<HTMLButtonElement>('generate');
const copyBtn = el<HTMLButtonElement>('copy');
const outputEl = el<HTMLElement>('output');
const outputLabelEl = el<HTMLSpanElement>('outputLabel');
const outputStatsEl = el<HTMLSpanElement>('outputStats');
const loreBoxEl = el<HTMLDetailsElement>('loreBox');
const loreTextEl = el<HTMLParagraphElement>('loreText');
const toastEl = el<HTMLDivElement>('toast');

let activeThemeId: string = DEFAULT_THEME_ID;
let lastPlainText = '';
let hutteseRevealed = false;

/** Sensible per-unit defaults for the count slider. */
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

function selectTheme(id: string): void {
  activeThemeId = id;
  for (const chip of Array.from(themesEl.children) as HTMLButtonElement[]) {
    const isActive = chip.dataset.id === id;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-checked', String(isActive));
  }
  // Adopt the theme's natural intensity when switching.
  const theme = getTheme(id);
  if (theme) {
    const natural = Math.round((theme.defaultIntensity ?? 0.5) * 100);
    intensityEl.value = String(natural);
    intensityValueEl.textContent = `${natural}%`;
  }
  render();
}

/** Reveal the hidden Huttese chip — triggered by the Jabba Easter egg. */
function revealHuttese(): void {
  const huttese = getTheme(EASTER_EGG_THEME_ID);
  if (!huttese) return;
  if (!hutteseRevealed) {
    hutteseRevealed = true;
    addThemeChip(huttese);
    showToast('A wild Hutt appears 🐸 Bo shuda!');
  }
  selectTheme(huttese.id);
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
  const unit = unitEl.value as Unit;
  const seed = seedEl.value.trim();
  const options: GenerateOptions = {
    theme: activeThemeId,
    units: unit,
    count: Number(countEl.value),
    format: htmlEl.checked ? 'html' : 'text',
    startWithLorem: loremEl.checked,
    intensity: Number(intensityEl.value) / 100,
  };
  if (seed) options.seed = seed;
  return options;
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

function render(): void {
  const options = currentOptions();
  // The library may override the theme via the Jabba Easter egg, so reflect
  // whatever it actually used.
  const seed = seedEl.value.trim().toLowerCase();
  const effectiveId = seed === EASTER_EGG_SEED ? EASTER_EGG_THEME_ID : activeThemeId;
  const theme = getTheme(effectiveId);
  if (theme) outputLabelEl.textContent = `${theme.emoji} ${theme.name}`;
  renderLore(theme);

  // Always generate a plain-text version for the stats + copy buffer.
  const plain = generate({ ...options, format: 'text' });
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
      const p = document.createElement('p');
      p.textContent = block;
      outputEl.appendChild(p);
    }
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

async function copyOutput(): Promise<void> {
  const text = lastPlainText;
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
    showToast('Copied to clipboard ✨');
  } catch {
    showToast('Could not copy — select and copy manually.');
  }
}

function onSeedInput(): void {
  if (seedEl.value.trim().toLowerCase() === EASTER_EGG_SEED) {
    revealHuttese();
    return;
  }
  render();
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
  intensityValueEl.textContent = `${intensityEl.value}%`;
  render();
});
seedEl.addEventListener('input', onSeedInput);
htmlEl.addEventListener('change', render);
loremEl.addEventListener('change', render);
generateBtn.addEventListener('click', () => {
  render();
  generateBtn.classList.remove('pulse');
  // Force reflow so the animation can replay.
  void generateBtn.offsetWidth;
  generateBtn.classList.add('pulse');
});
copyBtn.addEventListener('click', copyOutput);

// Initialize.
buildThemeChips();
selectTheme(activeThemeId);
syncCountBounds();
render();
