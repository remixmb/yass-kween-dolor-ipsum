#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) server for yass-kween-dolor-ipsum.
 *
 * Exposes the themed placeholder-text generator to AI agents (Claude Desktop,
 * Cursor, and any MCP-capable client) as a set of tools. It speaks JSON-RPC 2.0
 * over stdio — newline-delimited messages on stdin/stdout — and, true to the
 * library it wraps, ships with **zero runtime dependencies**: no MCP SDK, just
 * the protocol implemented by hand.
 *
 * Tools:
 *   - `generate_ipsum` — generate themed placeholder text.
 *   - `list_themes`    — discover the available voices.
 *   - `theme_lore`     — read a theme's origin story.
 *
 * Run it directly (`yass-ipsum-mcp`) and point your MCP client at the command.
 */
import { generate, type GenerateOptions } from './generator.js';
import {
  visibleThemes,
  getTheme,
  listThemeIds,
  DEFAULT_THEME_ID,
} from './themes/index.js';

const SERVER_INFO = { name: 'yass-ipsum', version: '1.2.1' } as const;

/** The MCP revision we advertise when a client doesn't pin one. */
const DEFAULT_PROTOCOL_VERSION = '2025-06-18';

/** Theme ids offered to clients (hidden Easter-egg themes stay out of the enum). */
const THEME_IDS: readonly string[] = visibleThemes.map((t) => t.id);

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

type JsonRpcId = number | string | null;

interface IncomingMessage {
  id?: JsonRpcId | undefined;
  method: string;
  params?: Record<string, unknown> | undefined;
}

interface SuccessResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
}

interface ErrorResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: { code: number; message: string };
}

export type JsonRpcResponse = SuccessResponse | ErrorResponse;

/** Sentinel returned by handlers that intentionally produce no reply. */
const NOTIFICATION = Symbol('notification');

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const TOOLS = [
  {
    name: 'generate_ipsum',
    description:
      'Generate themed placeholder ("lorem ipsum") text in one of several voices. ' +
      'Returns plain text or HTML. Output is deterministic when a seed is supplied.',
    inputSchema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: THEME_IDS,
          description: 'Voice to use. Defaults to "yass-kween".',
        },
        units: {
          type: 'string',
          enum: ['words', 'sentences', 'paragraphs', 'characters'],
          description: 'What to count. Defaults to "paragraphs".',
        },
        count: {
          type: 'integer',
          minimum: 1,
          description: 'How many units to produce. Defaults to 3.',
        },
        seed: {
          type: 'string',
          description:
            'Seed for reproducible output. The same seed and options always yield identical text.',
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description:
            'Blend dial 0–1. Low = raw Cicero Latin shows through; high = the styled voice takes over. Defaults to the theme’s natural level.',
        },
        startWithLorem: {
          type: 'boolean',
          description:
            'Begin with the classic "Lorem ipsum dolor sit amet". Defaults to false.',
        },
        emoji: {
          type: 'boolean',
          description:
            'Allow decorative emoji in the output (e.g. Yass Kween’s sparkles). Set false for clean placeholder text. Defaults to true.',
        },
        format: {
          type: 'string',
          enum: ['text', 'html'],
          description: 'Output format. Defaults to "text".',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_themes',
    description:
      'List the available placeholder-text voices, each with a one-line description.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'theme_lore',
    description: 'Return the origin story / lore for a given theme.',
    inputSchema: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: THEME_IDS, description: 'Theme id.' },
      },
      required: ['theme'],
      additionalProperties: false,
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function errorResult(text: string): ToolResult {
  return { content: [{ type: 'text', text: `Error: ${text}` }], isError: true };
}

/** Translate loosely-typed tool arguments into validated {@link GenerateOptions}. */
export function buildOptions(args: Record<string, unknown>): GenerateOptions {
  const options: GenerateOptions = {};
  if (typeof args.theme === 'string') options.theme = args.theme;
  if (
    args.units === 'words' ||
    args.units === 'sentences' ||
    args.units === 'paragraphs' ||
    args.units === 'characters'
  ) {
    options.units = args.units;
  }
  if (typeof args.count === 'number' && Number.isFinite(args.count)) {
    options.count = Math.max(1, Math.floor(args.count));
  }
  if (typeof args.seed === 'string' && args.seed.length > 0) {
    options.seed = args.seed;
  } else if (typeof args.seed === 'number' && Number.isFinite(args.seed)) {
    options.seed = args.seed;
  }
  if (typeof args.temperature === 'number' && Number.isFinite(args.temperature)) {
    options.temperature = Math.min(1, Math.max(0, args.temperature));
  }
  if (typeof args.startWithLorem === 'boolean') {
    options.startWithLorem = args.startWithLorem;
  }
  if (typeof args.emoji === 'boolean') options.emoji = args.emoji;
  if (args.format === 'html') options.format = 'html';
  return options;
}

function renderThemeList(): string {
  const lines = visibleThemes.map((t) => `${t.emoji} ${t.id} — ${t.description}`);
  return ['Available voices:', '', ...lines].join('\n');
}

function renderLore(args: Record<string, unknown>): string {
  const id = typeof args.theme === 'string' ? args.theme : DEFAULT_THEME_ID;
  const theme = getTheme(id);
  if (!theme) {
    throw new Error(`Unknown theme "${id}". Available: ${listThemeIds().join(', ')}`);
  }
  if (!theme.origin) {
    return `${theme.emoji} ${theme.name} has no recorded origin story.`;
  }
  return `${theme.emoji} ${theme.name} — origins\n\n${theme.origin}`;
}

function callTool(params: Record<string, unknown>): ToolResult {
  const name = params.name;
  const args =
    params.arguments && typeof params.arguments === 'object'
      ? (params.arguments as Record<string, unknown>)
      : {};
  try {
    switch (name) {
      case 'generate_ipsum':
        return textResult(generate(buildOptions(args)));
      case 'list_themes':
        return textResult(renderThemeList());
      case 'theme_lore':
        return textResult(renderLore(args));
      default:
        return errorResult(`Unknown tool: ${String(name)}`);
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function dispatch(
  method: string,
  params: Record<string, unknown>,
): unknown | typeof NOTIFICATION {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion:
          typeof params.protocolVersion === 'string'
            ? params.protocolVersion
            : DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call':
      return callTool(params);
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return NOTIFICATION;
    default:
      throw new RpcError(-32601, `Method not found: ${method}`);
  }
}

/** Handle one parsed JSON-RPC message. Returns the reply, or `null` for none. */
export function handleMessage(msg: IncomingMessage): JsonRpcResponse | null {
  const isNotification = msg.id === undefined;
  const id: JsonRpcId = msg.id === undefined ? null : msg.id;
  try {
    const result = dispatch(msg.method, msg.params ?? {});
    if (result === NOTIFICATION || isNotification) return null;
    return { jsonrpc: '2.0', id, result };
  } catch (err) {
    if (isNotification) return null;
    const code = err instanceof RpcError ? err.code : -32603;
    const message = err instanceof Error ? err.message : String(err);
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

/** Parse a single line of input and produce a reply, or `null` for none. */
export function handleLine(line: string): JsonRpcResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }
  const msg = parsed as Record<string, unknown>;
  const rawId = msg.id;
  const id: JsonRpcId | undefined =
    typeof rawId === 'number' || typeof rawId === 'string' || rawId === null
      ? rawId
      : undefined;
  if (typeof msg.method !== 'string') {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid Request' },
    };
  }
  const params =
    typeof msg.params === 'object' && msg.params !== null
      ? (msg.params as Record<string, unknown>)
      : undefined;
  return handleMessage({ id, method: msg.method, params });
}

// ---------------------------------------------------------------------------
// stdio runtime (only when invoked directly, so tests can import the above)
// ---------------------------------------------------------------------------

function serve(): void {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const response = handleLine(line);
      if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  });
  process.stdin.on('error', () => {});
  process.stdin.on('end', () => process.exit(0));
}

const invokedDirectly =
  process.argv[1] !== undefined && /mcp(\.[cm]?js|\.ts)?$/.test(process.argv[1]);

if (invokedDirectly) {
  serve();
}
