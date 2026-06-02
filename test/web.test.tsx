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
});
