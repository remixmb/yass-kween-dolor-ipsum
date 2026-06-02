#!/usr/bin/env node
/**
 * Command-line interface for yass-kween-dolor-ipsum.
 *
 * Usage:
 *   yass-ipsum [options]
 *   yass-ipsum --theme pirate --paragraphs 2 --seed ahoy
 */
import { generate, type GenerateOptions, type Unit } from './generator.js';
import {
  visibleThemes,
  listThemeIds,
  getTheme,
  DEFAULT_THEME_ID,
} from './themes/index.js';

const VERSION = '1.1.0';

interface ParsedArgs {
  options: GenerateOptions;
  showHelp: boolean;
  showVersion: boolean;
  listThemes: boolean;
  showLore: boolean;
  error?: string;
}

const HELP = `
yass-kween-dolor-ipsum — themed placeholder text generator 💅

USAGE
  yass-ipsum [options]

OPTIONS
  -t, --theme <id>        Theme to use (default: yass-kween)
  -p, --paragraphs <n>    Generate n paragraphs (default unit)
  -s, --sentences <n>     Generate n sentences
  -w, --words <n>         Generate n words
  -C, --characters <n>    Generate n characters (trimmed to a word boundary)
  -c, --count <n>         Count for the chosen unit (default: 3)
  -u, --units <unit>      words | sentences | paragraphs | characters
      --seed <value>      Seed for reproducible output
  -i, --temperature <n>   Blend temperature, 0–1 (or 0–100). Cold = raw Latin,
                          hot = full glam. Alias: --intensity. Defaults to the
                          theme's own level.
      --html              Wrap output in <p> tags
      --lorem             Start with the classic "Lorem ipsum dolor sit amet"
      --no-emoji          Omit decorative emoji (e.g. Yass Kween's sparkles)
      --lore              Show the chosen theme's origin story and exit
  -l, --list              List available themes and exit
  -h, --help              Show this help and exit
  -v, --version           Show version and exit

EXAMPLES
  yass-ipsum
  yass-ipsum --theme corporate --paragraphs 2
  yass-ipsum -t pirate -s 4 --seed ahoy
  yass-ipsum --words 12 --html
  yass-ipsum --temperature 0.1        # cold — raw Latin resurfaces
  yass-ipsum --temp 100 -p 1          # hot — maximum yassification
  yass-ipsum --no-emoji -p 1          # clean placeholder text, no sparkles
  yass-ipsum --lore
  yass-ipsum --list
`;

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    options: {},
    showHelp: false,
    showVersion: false,
    listThemes: false,
    showLore: false,
  };

  const next = (i: number, flag: string): string => {
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('-')) {
      throw new Error(`Option "${flag}" expects a value.`);
    }
    return value;
  };

  const toInt = (raw: string, flag: string): number => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) {
      throw new Error(`Option "${flag}" expects a positive integer, got "${raw}".`);
    }
    return n;
  };

  // Accept intensity as either 0–1 or 0–100 (values > 1 are treated as a
  // percentage), then clamp into [0, 1].
  const toIntensity = (raw: string, flag: string): number => {
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n) || n < 0) {
      throw new Error(`Option "${flag}" expects a number >= 0, got "${raw}".`);
    }
    const normalized = n > 1 ? n / 100 : n;
    return Math.min(1, Math.max(0, normalized));
  };

  try {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i]!;
      switch (arg) {
        case '-h':
        case '--help':
          result.showHelp = true;
          break;
        case '-v':
        case '--version':
          result.showVersion = true;
          break;
        case '-l':
        case '--list':
          result.listThemes = true;
          break;
        case '-t':
        case '--theme':
          result.options.theme = next(i++, arg);
          break;
        case '-c':
        case '--count':
          result.options.count = toInt(next(i++, arg), arg);
          break;
        case '-u':
        case '--units': {
          const unit = next(i++, arg) as Unit;
          if (!['words', 'sentences', 'paragraphs', 'characters'].includes(unit)) {
            throw new Error(`Invalid unit "${unit}".`);
          }
          result.options.units = unit;
          break;
        }
        case '-p':
        case '--paragraphs':
          result.options.units = 'paragraphs';
          result.options.count = toInt(next(i++, arg), arg);
          break;
        case '-s':
        case '--sentences':
          result.options.units = 'sentences';
          result.options.count = toInt(next(i++, arg), arg);
          break;
        case '-w':
        case '--words':
          result.options.units = 'words';
          result.options.count = toInt(next(i++, arg), arg);
          break;
        case '-C':
        case '--characters':
          result.options.units = 'characters';
          result.options.count = toInt(next(i++, arg), arg);
          break;
        case '--seed':
          result.options.seed = next(i++, arg);
          break;
        case '-i':
        case '--intensity':
        case '--temp':
        case '--temperature':
          result.options.intensity = toIntensity(next(i++, arg), arg);
          break;
        case '--html':
          result.options.format = 'html';
          break;
        case '--lorem':
          result.options.startWithLorem = true;
          break;
        case '--no-emoji':
          result.options.emoji = false;
          break;
        case '--lore':
          result.showLore = true;
          break;
        default:
          throw new Error(`Unknown option "${arg}". Try --help.`);
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

function renderThemeList(): string {
  const lines = visibleThemes.map(
    (t) => `  ${t.emoji}  ${t.id.padEnd(12)} ${t.description}`,
  );
  return ['Available themes:', '', ...lines, ''].join('\n');
}

export function run(argv: string[]): number {
  const parsed = parseArgs(argv);

  if (parsed.error) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    return 1;
  }
  if (parsed.showHelp) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (parsed.showVersion) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (parsed.listThemes) {
    process.stdout.write(`${renderThemeList()}\n`);
    return 0;
  }
  if (parsed.showLore) {
    const requested = parsed.options.theme;
    const id = typeof requested === 'string' ? requested : DEFAULT_THEME_ID;
    const theme = getTheme(id);
    if (!theme) {
      process.stderr.write(`Error: Unknown theme "${id}".\n`);
      process.stderr.write(`Available themes: ${listThemeIds().join(', ')}\n`);
      return 1;
    }
    if (!theme.origin) {
      process.stdout.write(
        `${theme.emoji}  ${theme.name} has no recorded origin story.\n`,
      );
      return 0;
    }
    process.stdout.write(
      `${theme.emoji}  ${theme.name} — origins\n\n${theme.origin}\n`,
    );
    return 0;
  }

  try {
    const text = generate(parsed.options);
    process.stdout.write(`${text}\n`);
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    if (/Unknown theme/.test(message)) {
      process.stderr.write(`Available themes: ${listThemeIds().join(', ')}\n`);
    }
    return 1;
  }
}

/**
 * Whether this module is being executed directly (as a script or via its
 * installed bin) rather than imported by tests.
 *
 * The published bin is named `yass-ipsum`, so when a user runs it npm invokes
 * the symlink `…/node_modules/.bin/yass-ipsum`. The check must therefore match
 * both the source/dist file name (`cli`) **and** the bin name — otherwise the
 * CLI silently does nothing when run through its bin (the v1.0.0 regression).
 */
export function isDirectInvocation(entry: string | undefined): boolean {
  if (entry === undefined) return false;
  return /(?:^|[\\/])(?:cli|yass-ipsum)(?:\.[cm]?js|\.ts)?$/.test(entry);
}

// Only execute when run directly, not when imported by tests.
if (isDirectInvocation(process.argv[1])) {
  process.exit(run(process.argv.slice(2)));
}
