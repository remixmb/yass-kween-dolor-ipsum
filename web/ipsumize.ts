/* ============================================================
   ipsumize.ts — the "Ipsumize the web" bookmarklet payload.

   Bundled to dist-web/ipsumize.js as a self-contained IIFE and injected into
   any page by the bookmarklet. It walks the page's visible text and rewrites it
   in a chosen voice (length-matched so the layout roughly holds), with a small
   floating control panel (in a shadow root, so the host page's CSS can't break
   it and ours can't leak). Re-injecting toggles the panel. "Restore" puts the
   original text back.
   ============================================================ */
import { generate, visibleThemes } from '../src/index.js';

const FLAG = '__yassIpsumize';
const HOST_ID = 'yass-ipsumize-host';

interface IpsumizeApi {
  toggle: () => void;
}
declare global {
  interface Window {
    [FLAG]?: IpsumizeApi;
  }
}

function start(): void {
  // Already injected on this page? Just toggle the panel.
  const prior = window[FLAG];
  if (prior) {
    prior.toggle();
    return;
  }

  const originals = new Map<Text, string>();
  let active = false;
  let theme = 'pirate';
  let intensity = 0.7;

  // Elements whose text must not be touched.
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP']);

  function collect(): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const t = n as Text;
        if (!t.nodeValue || !t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = t.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (p.isContentEditable) return NodeFilter.FILTER_REJECT;
        if (p.closest(`#${HOST_ID}`)) return NodeFilter.FILTER_REJECT; // our own panel
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let cur: Node | null;
    while ((cur = walker.nextNode())) nodes.push(cur as Text);
    return nodes;
  }

  function ipsumize(original: string, seed: string): string {
    const lead = original.match(/^\s*/)?.[0] ?? '';
    const trail = original.match(/\s*$/)?.[0] ?? '';
    const core = original.trim();
    const count = Math.max(1, core.split(/\s+/).filter(Boolean).length);
    let out = generate({ theme, units: 'words', count, seed, intensity, emoji: false });
    if (/^[A-Z]/.test(core)) out = out.charAt(0).toUpperCase() + out.slice(1); // echo the original's case
    return `${lead}${out}${trail}`;
  }

  function apply(): void {
    const nodes = active ? [...originals.keys()] : collect();
    nodes.forEach((node, i) => {
      if (!originals.has(node)) originals.set(node, node.nodeValue ?? '');
      node.nodeValue = ipsumize(originals.get(node)!, `ipsum-${i}`);
    });
    active = true;
  }

  function restore(): void {
    for (const [node, text] of originals) {
      if (node.isConnected) node.nodeValue = text;
    }
    active = false;
  }

  // ---------- floating panel (shadow DOM) ----------
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'all:initial;position:fixed;z-index:2147483647;bottom:16px;right:16px;';
  const root = host.attachShadow({ mode: 'open' });

  const options = visibleThemes
    .map((t) => `<option value="${t.id}"${t.id === theme ? ' selected' : ''}>${t.emoji} ${t.name}</option>`)
    .join('');

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        font-family: ui-sans-serif, system-ui, sans-serif;
        width: 248px;
        background: #14141b;
        color: #efeadf;
        border: 1px solid #33333f;
        border-radius: 12px;
        box-shadow: 0 18px 50px -12px rgba(0,0,0,0.6);
        padding: 12px 13px;
      }
      .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
      .title { font-weight:700; font-size:13px; letter-spacing:0.01em; }
      .x { cursor:pointer; border:none; background:none; color:#9a98a6; font-size:18px; line-height:1; padding:0 2px; }
      .x:hover { color:#efeadf; }
      label { display:block; font-size:10px; text-transform:uppercase; letter-spacing:0.12em; color:#9a98a6; margin:8px 0 4px; }
      select, input[type=range] { width:100%; box-sizing:border-box; }
      select {
        background:#1d1d27; color:#efeadf; border:1px solid #33333f; border-radius:7px;
        padding:6px 8px; font-size:13px;
      }
      .row { display:flex; gap:7px; margin-top:11px; }
      button.act {
        flex:1; cursor:pointer; border-radius:8px; padding:7px 10px; font-size:12.5px; font-weight:600;
        border:1px solid #33333f; background:#1d1d27; color:#efeadf;
      }
      button.primary { background:#e6178b; border-color:#e6178b; color:#fff; }
      button.act:hover { filter:brightness(1.1); }
      .credit { margin-top:9px; font-size:10px; color:#6f6d7a; text-align:center; }
      .credit a { color:#9a98a6; }
    </style>
    <div class="panel">
      <div class="head">
        <span class="title">🪄 Ipsumize</span>
        <button class="x" title="Hide">&times;</button>
      </div>
      <label>Voice</label>
      <select class="voice">${options}</select>
      <label>Blend <span class="pct"></span></label>
      <input type="range" class="blend" min="0" max="100" />
      <div class="row">
        <button class="act primary apply">Ipsumize</button>
        <button class="act restore">Restore</button>
      </div>
      <div class="credit">Lorem &amp; Ipsum</div>
    </div>
  `;
  document.body.appendChild(host);

  const $ = <T extends HTMLElement>(sel: string): T => root.querySelector(sel) as T;
  const voiceSel = $<HTMLSelectElement>('.voice');
  const blend = $<HTMLInputElement>('.blend');
  const pct = $<HTMLSpanElement>('.pct');
  blend.value = String(Math.round(intensity * 100));
  pct.textContent = `${blend.value}°`;

  voiceSel.addEventListener('change', () => {
    theme = voiceSel.value;
    if (active) apply();
  });
  blend.addEventListener('input', () => {
    intensity = Number(blend.value) / 100;
    pct.textContent = `${blend.value}°`;
    if (active) apply();
  });
  $('.apply').addEventListener('click', apply);
  $('.restore').addEventListener('click', restore);
  $('.x').addEventListener('click', () => {
    host.style.display = 'none';
  });

  window[FLAG] = {
    toggle() {
      host.style.display = host.style.display === 'none' ? '' : 'none';
    },
  };

  // Instant gratification: transform the page right away.
  apply();
}

start();
