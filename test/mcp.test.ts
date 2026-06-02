import { describe, it, expect } from 'vitest';
import {
  handleLine,
  handleMessage,
  buildOptions,
  TOOLS,
  type JsonRpcResponse,
} from '../src/mcp.js';
import { visibleThemes } from '../src/themes/index.js';

/** Round-trip a JSON-RPC request object through the line handler. */
function call(message: unknown): JsonRpcResponse | null {
  return handleLine(JSON.stringify(message));
}

/** Narrow a response to its `result`, failing loudly if it errored. */
function resultOf(response: JsonRpcResponse | null): Record<string, unknown> {
  expect(response).not.toBeNull();
  if (response && 'error' in response) {
    throw new Error(`expected a result, got error: ${response.error.message}`);
  }
  return (response as { result: Record<string, unknown> }).result;
}

describe('initialize', () => {
  it('reports server info and tool capability', () => {
    const result = resultOf(
      call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    );
    expect(result.serverInfo).toEqual({ name: 'yass-ipsum', version: '1.0.1' });
    expect(result.capabilities).toEqual({ tools: {} });
    expect(typeof result.protocolVersion).toBe('string');
  });

  it('echoes the client-requested protocol version', () => {
    const result = resultOf(
      call({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      }),
    );
    expect(result.protocolVersion).toBe('2024-11-05');
  });
});

describe('ping', () => {
  it('replies with an empty result', () => {
    const result = resultOf(call({ jsonrpc: '2.0', id: 9, method: 'ping' }));
    expect(result).toEqual({});
  });
});

describe('tools/list', () => {
  it('advertises the three tools', () => {
    const result = resultOf(call({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    const names = (result.tools as Array<{ name: string }>).map((t) => t.name);
    expect(names).toEqual(['generate_ipsum', 'list_themes', 'theme_lore']);
  });

  it('enumerates every visible theme in the generate_ipsum schema', () => {
    const tool = TOOLS.find((t) => t.name === 'generate_ipsum')!;
    const themeEnum = (
      tool.inputSchema.properties as { theme: { enum: readonly string[] } }
    ).theme.enum;
    expect([...themeEnum]).toEqual(visibleThemes.map((t) => t.id));
  });
});

describe('tools/call → generate_ipsum', () => {
  const generate = (args: Record<string, unknown>) =>
    resultOf(
      call({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'generate_ipsum', arguments: args },
      }),
    ) as unknown as { content: Array<{ text: string }>; isError?: boolean };

  it('is deterministic for a given seed', () => {
    const a = generate({ seed: 'ahoy', theme: 'pirate' });
    const b = generate({ seed: 'ahoy', theme: 'pirate' });
    expect(a.content[0]!.text).toBe(b.content[0]!.text);
    expect(a.isError).toBeUndefined();
  });

  it('honors units + count and html format', () => {
    const res = generate({
      units: 'words',
      count: 5,
      seed: 's',
      format: 'html',
    });
    const text = res.content[0]!.text;
    expect(text.startsWith('<p>')).toBe(true);
  });

  it('returns an isError result for an unknown theme', () => {
    const res = generate({ theme: 'not-a-theme' });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/Error:/);
  });
});

describe('tools/call → list_themes & theme_lore', () => {
  it('lists themes as text', () => {
    const res = resultOf(
      call({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'list_themes', arguments: {} },
      }),
    ) as unknown as { content: Array<{ text: string }> };
    expect(res.content[0]!.text).toContain('yass-kween');
  });

  it('returns lore for a known theme', () => {
    const res = resultOf(
      call({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'theme_lore', arguments: { theme: 'yass-kween' } },
      }),
    ) as unknown as { content: Array<{ text: string }> };
    expect(res.content[0]!.text.length).toBeGreaterThan(0);
  });

  it('flags an unknown theme for lore as an error', () => {
    const res = resultOf(
      call({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'theme_lore', arguments: { theme: 'nope' } },
      }),
    ) as unknown as { isError?: boolean };
    expect(res.isError).toBe(true);
  });

  it('flags an unknown tool name as an error', () => {
    const res = resultOf(
      call({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'bogus', arguments: {} },
      }),
    ) as unknown as { isError?: boolean; content: Array<{ text: string }> };
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('Unknown tool');
  });
});

describe('protocol framing', () => {
  it('does not reply to notifications', () => {
    expect(call({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    expect(handleMessage({ method: 'notifications/cancelled' })).toBeNull();
  });

  it('returns a parse error for malformed JSON', () => {
    const res = handleLine('{ not json');
    expect(res).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
  });

  it('rejects non-object payloads as invalid requests', () => {
    expect(handleLine('[1,2,3]')).toMatchObject({ error: { code: -32600 } });
    expect(call({ jsonrpc: '2.0', id: 1 })).toMatchObject({
      error: { code: -32600 },
    });
  });

  it('returns method-not-found for unknown methods', () => {
    expect(call({ jsonrpc: '2.0', id: 8, method: 'no/such' })).toMatchObject({
      error: { code: -32601 },
    });
  });
});

describe('buildOptions', () => {
  it('coerces, clamps, and ignores junk', () => {
    expect(
      buildOptions({
        theme: 'zen',
        units: 'sentences',
        count: 4.9,
        seed: 'x',
        temperature: 5,
        startWithLorem: true,
        format: 'html',
        bogus: 'ignored',
      }),
    ).toEqual({
      theme: 'zen',
      units: 'sentences',
      count: 4,
      seed: 'x',
      temperature: 1,
      startWithLorem: true,
      format: 'html',
    });
  });

  it('accepts a numeric seed and drops an empty string seed', () => {
    expect(buildOptions({ seed: 42 }).seed).toBe(42);
    expect(buildOptions({ seed: '' }).seed).toBeUndefined();
  });
});
