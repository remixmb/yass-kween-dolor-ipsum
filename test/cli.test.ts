import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../src/cli.js';

/** Capture stdout/stderr writes produced while running the CLI. */
function captureRun(argv: string[]): { code: number; out: string; err: string } {
  let out = '';
  let err = '';
  const outSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      out += chunk.toString();
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      err += chunk.toString();
      return true;
    });
  try {
    const code = run(argv);
    return { code, out, err };
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }
}

describe('cli', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints help and exits 0', () => {
    const { code, out } = captureRun(['--help']);
    expect(code).toBe(0);
    expect(out).toContain('USAGE');
    expect(out).toContain('--theme');
  });

  it('prints version and exits 0', () => {
    const { code, out } = captureRun(['--version']);
    expect(code).toBe(0);
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('lists themes', () => {
    const { code, out } = captureRun(['--list']);
    expect(code).toBe(0);
    expect(out).toContain('yass-kween');
    expect(out).toContain('pirate');
  });

  it('generates deterministic output with a seed', () => {
    const first = captureRun(['--theme', 'pirate', '-s', '2', '--seed', 'ahoy']);
    const second = captureRun(['--theme', 'pirate', '-s', '2', '--seed', 'ahoy']);
    expect(first.code).toBe(0);
    expect(first.out).toBe(second.out);
  });

  it('supports the --words shorthand', () => {
    const { code, out } = captureRun(['--words', '5', '--seed', 'x']);
    expect(code).toBe(0);
    expect(out.trim().split(/\s+/)).toHaveLength(5);
  });

  it('emits HTML when --html is set', () => {
    const { code, out } = captureRun(['-p', '1', '--html', '--seed', 'h']);
    expect(code).toBe(0);
    expect(out).toContain('<p>');
  });

  it('errors on an unknown option', () => {
    const { code, err } = captureRun(['--nope']);
    expect(code).toBe(1);
    expect(err).toContain('Unknown option');
  });

  it('errors on an unknown theme and suggests valid ones', () => {
    const { code, err } = captureRun(['--theme', 'banana']);
    expect(code).toBe(1);
    expect(err).toContain('Unknown theme');
    expect(err).toContain('Available themes');
  });

  it('errors when a value flag is missing its value', () => {
    const { code, err } = captureRun(['--theme']);
    expect(code).toBe(1);
    expect(err).toContain('expects a value');
  });

  it('errors on a non-positive count', () => {
    const { code, err } = captureRun(['--words', '0']);
    expect(code).toBe(1);
    expect(err).toContain('positive integer');
  });

  it('accepts --intensity as a 0–1 value', () => {
    const { code } = captureRun(['--words', '5', '--intensity', '0.2', '--seed', 'i']);
    expect(code).toBe(0);
  });

  it('accepts --intensity as a 0–100 percentage', () => {
    const { code } = captureRun(['-p', '1', '-i', '80', '--seed', 'i']);
    expect(code).toBe(0);
  });

  it('errors on a non-numeric intensity', () => {
    const { code, err } = captureRun(['--intensity', 'loud']);
    expect(code).toBe(1);
    expect(err).toContain('number');
  });

  it('prints the Cicero origin story with --lore', () => {
    const { code, out } = captureRun(['--lore']);
    expect(code).toBe(0);
    expect(out).toMatch(/Cicero/);
  });

  it('shows the Huttese origin with --lore --theme huttese', () => {
    const { code, out } = captureRun(['--lore', '--theme', 'huttese']);
    expect(code).toBe(0);
    expect(out).toMatch(/Huttese|Star Wars/);
  });

  it('hides the Huttese easter egg from --list', () => {
    const { out } = captureRun(['--list']);
    expect(out).not.toContain('huttese');
  });

  it('summons the Huttese blend via the --seed jabba easter egg', () => {
    const { code, out } = captureRun(['--words', '10', '--seed', 'jabba']);
    expect(code).toBe(0);
    expect(out.trim().split(/\s+/)).toHaveLength(10);
    // The egg output differs from the same options under a plain seed.
    const plain = captureRun(['--words', '10', '--seed', 'not-jabba']);
    expect(out).not.toBe(plain.out);
  });
});
