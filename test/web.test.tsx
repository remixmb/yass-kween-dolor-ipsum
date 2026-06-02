// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { App } from '../web/app.js';

/** Render the demo with a known URL so output is deterministic. */
function renderAt(search: string): HTMLElement {
  window.history.replaceState({}, '', search);
  return render(<App />).container;
}
const outputText = (c: HTMLElement): string =>
  [...c.querySelectorAll('.output p')].map((p) => p.textContent).join(' ');
const setRange = (el: Element | null, value: string): void => {
  fireEvent.change(el as HTMLInputElement, { target: { value } });
};
const schemeButton = (c: HTMLElement): HTMLButtonElement =>
  [...c.querySelectorAll<HTMLButtonElement>('.plain-toggle')].find((b) =>
    /Auto|Light|Dark|Aurora/.test(b.textContent ?? ''),
  )!;

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('web demo (jsdom integration)', () => {
  it('renders generated text and the active voice on load', () => {
    const c = renderAt('?theme=corporate&units=words&count=20&seed=t');
    expect(outputText(c).length).toBeGreaterThan(0);
    expect(c.querySelector('.badge')?.textContent).toMatch(/Corporate/i);
  });

  it('selecting a voice updates the specimen badge', () => {
    const c = renderAt('?theme=corporate&seed=t');
    fireEvent.click(c.querySelector('.voices .chip[data-id="pirate"]')!);
    expect(c.querySelector('.badge')?.textContent).toMatch(/Pirate/i);
  });

  it('the blend dial changes the output (Latin <-> voice)', () => {
    const c = renderAt('?theme=pirate&units=words&count=30&seed=t&temp=50');
    const dial = c.querySelector('.dial');
    setRange(dial, '0');
    const cold = outputText(c);
    setRange(dial, '100');
    expect(outputText(c)).not.toBe(cold);
  });

  it('the characters unit fits within the budget', () => {
    const c = renderAt('?theme=corporate&units=characters&count=120&seed=t');
    const out = outputText(c);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(120);
  });

  it('a length preset sets the count', () => {
    const c = renderAt('?theme=corporate&units=words&count=24&seed=t');
    const long = [...c.querySelectorAll<HTMLButtonElement>('.presets button')].find((b) =>
      /Long/.test(b.textContent ?? ''),
    )!;
    fireEvent.click(long);
    expect((c.querySelector('input[aria-label="Count"]') as HTMLInputElement).value).toBe('60');
  });

  it('shows a byte count in the specimen stats', () => {
    const c = renderAt('?theme=corporate&units=words&count=20&seed=t');
    expect(c.querySelector('.stats')?.textContent).toMatch(/bytes/);
  });

  it('Plain view sets the data-plain attribute', () => {
    const c = renderAt('?theme=corporate&seed=t');
    const app = c.querySelector('#app')!;
    expect(app.getAttribute('data-plain')).toBeNull();
    const plainBtn = [...c.querySelectorAll<HTMLButtonElement>('.plain-toggle')].find((b) =>
      /Plain view/.test(b.textContent ?? ''),
    )!;
    fireEvent.click(plainBtn);
    expect(app.getAttribute('data-plain')).toMatch(/light|dark/);
  });

  it('the public scheme toggle cycles the editorial theme', () => {
    const c = renderAt('?theme=corporate&seed=t');
    const before = schemeButton(c).textContent;
    fireEvent.click(schemeButton(c));
    expect(schemeButton(c).textContent).not.toBe(before);
  });

  it('the Huttese seed summons the egg overlay, and its close button dismisses it', () => {
    const c = renderAt('?theme=corporate&seed=t');
    expect(c.querySelector('.egg-burst')).toBeNull();
    // Typing the secret seed reveals Jabba (audio is a no-op without AudioContext).
    fireEvent.change(c.querySelector('input[aria-label="Seed"]')!, {
      target: { value: 'jabba' },
    });
    const burst = c.querySelector('.egg-burst');
    expect(burst).not.toBeNull();
    const close = burst!.querySelector<HTMLButtonElement>('.egg-close');
    expect(close).not.toBeNull();
    fireEvent.click(close!);
    expect(c.querySelector('.egg-burst')).toBeNull();
  });

  it('loads a custom voice from the editor and generates with it', () => {
    const c = renderAt('?theme=corporate&seed=t&temp=100');
    // Open the "load your own voice" editor.
    const toggle = [...c.querySelectorAll<HTMLButtonElement>('.custom-toggle')][0]!;
    fireEvent.click(toggle);
    const textarea = c.querySelector<HTMLTextAreaElement>('#customjson')!;
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify({
          name: 'Zorp',
          emoji: '🛸',
          accent: '#123456',
          words: ['zorp', 'blarg', 'quux', 'vorp', 'nim', 'glonk'],
        }),
      },
    });
    const use = [...c.querySelectorAll<HTMLButtonElement>('.custom-actions button')].find((b) =>
      /use this voice/i.test(b.textContent ?? ''),
    )!;
    fireEvent.click(use);
    // The custom voice is now active: its name shows and its words appear at 100%.
    expect(c.querySelector('.badge')?.textContent).toMatch(/Zorp/);
    expect(outputText(c)).toMatch(/zorp|blarg|quux|vorp|nim|glonk/i);
    // It also surfaces as a selectable chip.
    expect(c.querySelector('.voices .chip[data-id="custom"]')).not.toBeNull();
  });

  it('rejects invalid custom-voice JSON with an error', () => {
    const c = renderAt('?theme=corporate&seed=t');
    fireEvent.click(c.querySelector<HTMLButtonElement>('.custom-toggle')!);
    fireEvent.change(c.querySelector<HTMLTextAreaElement>('#customjson')!, {
      target: { value: '{ not valid json' },
    });
    fireEvent.click(
      [...c.querySelectorAll<HTMLButtonElement>('.custom-actions button')].find((b) =>
        /use this voice/i.test(b.textContent ?? ''),
      )!,
    );
    expect(c.querySelector('.custom-error')?.textContent).toMatch(/invalid json/i);
  });
});
