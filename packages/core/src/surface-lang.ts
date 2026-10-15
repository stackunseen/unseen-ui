/**
 * A line-oriented form of the GeneratedUI vocabulary that a model can stream.
 *
 *   root = [summary, tickets]
 *   summary = metric("Open tickets", "42")
 *   tickets = table("Tickets", [{id: "title", label: "Title"}], [{id: "r1", cells: {title: "Login fails"}}])
 *
 * One statement per line, `name = node(args)` with positional arguments in the documented order,
 * `root` listing the top-level nodes by name. The parser never evaluates anything: it builds the
 * same `{ id, version, nodes }` snapshot that GeneratedUI validates, drops statements it cannot
 * read, reports them as problems, and renders what it has while the rest arrives.
 */

export type SurfaceValue =
  string | number | boolean | null | SurfaceValue[] | { [key: string]: SurfaceValue };

export interface SurfaceArgument {
  name: string;
  /** Human-readable type for the prompt text. */
  type: string;
  required: boolean;
  /** Only arrays of node names; the parser resolves them to nodes. */
  refs?: boolean;
}
export interface SurfaceNodeSignature {
  type: string;
  description: string;
  args: readonly SurfaceArgument[];
}

export const surfaceVocabulary: readonly SurfaceNodeSignature[] = [
  {
    type: 'text',
    description: 'A paragraph of inert text; line breaks are kept.',
    args: [{ name: 'text', type: 'string', required: true }],
  },
  {
    type: 'metric',
    description: 'A labelled value the host supplied; the value is text, not computed.',
    args: [
      { name: 'label', type: 'string', required: true },
      { name: 'value', type: 'string', required: true },
    ],
  },
  {
    type: 'action',
    description: 'A button the host resolves by actionId; nothing runs in the interface.',
    args: [
      { name: 'label', type: 'string', required: true },
      { name: 'actionId', type: 'string', required: true },
      { name: 'disabledReason', type: 'string', required: false },
    ],
  },
  {
    type: 'table',
    description: 'A captioned table of scalar cells.',
    args: [
      { name: 'caption', type: 'string', required: true },
      { name: 'columns', type: '[{id: string, label: string}]', required: true },
      {
        name: 'rows',
        type: '[{id: string, cells: {columnId: string | number | boolean | null}}]',
        required: true,
      },
    ],
  },
  {
    type: 'chart',
    description: 'A bar, line or area chart from points or up to four aligned series.',
    args: [
      { name: 'title', type: 'string', required: true },
      { name: 'unit', type: 'string', required: true },
      { name: 'source', type: 'string', required: true },
      { name: 'points', type: '[{label: string, value: number}] | null', required: false },
      {
        name: 'series',
        type: '[{id: string, label: string, points: [{label: string, value: number | null}]}] | null',
        required: false,
      },
      { name: 'asOf', type: 'string | null', required: false },
      { name: 'locale', type: 'string | null', required: false },
    ],
  },
  {
    type: 'form',
    description: 'A form the host receives as values bound to actionId.',
    args: [
      { name: 'title', type: 'string', required: true },
      { name: 'actionId', type: 'string', required: true },
      {
        name: 'fields',
        type: '[{id: string, label: string, type: "text" | "textarea" | "number" | "select" | "checkbox", required?: boolean, description?: string, options?: [{value: string, label: string}]}]',
        required: true,
      },
      { name: 'arrays', type: 'array | null', required: false },
      { name: 'steps', type: 'array | null', required: false },
    ],
  },
  {
    type: 'section',
    description: 'A titled group of nodes, stacked or in a grid.',
    args: [
      { name: 'title', type: 'string', required: true },
      { name: 'nodes', type: '[nodeName]', required: true, refs: true },
      { name: 'layout', type: '"stack" | "grid" | null', required: false },
      { name: 'description', type: 'string | null', required: false },
    ],
  },
];

export interface SurfaceLimits {
  statements: number;
  lineCharacters: number;
  totalCharacters: number;
  nesting: number;
  nameCharacters: number;
}
export const surfaceLimits: Readonly<SurfaceLimits> = Object.freeze({
  statements: 256,
  lineCharacters: 20_000,
  totalCharacters: 200_000,
  nesting: 8,
  nameCharacters: 80,
});

export type SurfaceProblemCode =
  'syntax' | 'unknown-node' | 'bad-arity' | 'bad-reference' | 'duplicate' | 'limit' | 'no-root';
export interface SurfaceProblem {
  line: number;
  code: SurfaceProblemCode;
  message: string;
}
export interface SurfaceSnapshot {
  id: string;
  version: string;
  nodes: Record<string, unknown>[];
}
export interface SurfaceParseState {
  /** The snapshot built so far, or null until `root` has arrived. */
  surface: SurfaceSnapshot | null;
  /** Node names referenced but not defined yet. */
  pending: readonly string[];
  problems: readonly SurfaceProblem[];
  statements: number;
  complete: boolean;
}
export interface SurfaceParser {
  push(chunk: string): SurfaceParseState;
  finish(): SurfaceParseState;
  state(): SurfaceParseState;
}

type Statement =
  | { kind: 'root'; refs: string[]; line: number }
  | { kind: 'node'; type: string; args: SurfaceValue[]; refs: Map<number, string[]>; line: number };

const nameRule = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const keywords = new Set(['true', 'false', 'null']);

class Reader {
  index = 0;
  depth = 0;
  constructor(
    readonly text: string,
    readonly limits: SurfaceLimits,
  ) {}
  peek() {
    return this.text[this.index];
  }
  skip() {
    while (this.index < this.text.length && /\s/.test(this.text[this.index]!)) this.index++;
  }
  fail(message: string): never {
    throw new SyntaxError(message);
  }
  expect(char: string) {
    this.skip();
    if (this.text[this.index] !== char) this.fail(`Expected "${char}"`);
    this.index++;
  }
  name(): string {
    this.skip();
    const start = this.index;
    while (this.index < this.text.length && /[A-Za-z0-9_-]/.test(this.text[this.index]!))
      this.index++;
    const value = this.text.slice(start, this.index);
    if (!nameRule.test(value)) this.fail('Expected a name');
    if (value.length > this.limits.nameCharacters) this.fail('Name too long');
    return value;
  }
  string(): string {
    this.expect('"');
    let out = '';
    while (this.index < this.text.length) {
      const char = this.text[this.index++]!;
      if (char === '"') return out;
      if (char === '\\') {
        const next = this.text[this.index++];
        if (next === 'n') out += '\n';
        else if (next === 't') out += '\t';
        else if (next === '"' || next === '\\' || next === '/') out += next;
        else if (next === 'u') {
          const hex = this.text.slice(this.index, this.index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Bad unicode escape');
          out += String.fromCharCode(parseInt(hex, 16));
          this.index += 4;
        } else this.fail('Bad escape');
      } else out += char;
    }
    return this.fail('Unterminated string');
  }
  number(): number {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.index));
    if (!match) this.fail('Expected a number');
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) this.fail('Number out of range');
    return value;
  }
  /** A value where node references are allowed only when `refs` collects them. */
  value(refs: string[] | null): SurfaceValue | { ref: string } {
    this.skip();
    if (++this.depth > this.limits.nesting) this.fail('Nesting too deep');
    try {
      const char = this.peek();
      if (char === undefined) this.fail('Unexpected end of line');
      if (char === '"') return this.string();
      if (char === '-' || /\d/.test(char)) return this.number();
      if (char === '[') {
        this.index++;
        const items: SurfaceValue[] = [];
        this.skip();
        if (this.peek() === ']') {
          this.index++;
          return items;
        }
        for (;;) {
          const item = this.value(refs);
          if (typeof item === 'object' && item !== null && 'ref' in item && !Array.isArray(item)) {
            if (!refs) this.fail('A node name is not allowed here');
            refs.push((item as { ref: string }).ref);
          } else items.push(item as SurfaceValue);
          this.skip();
          if (this.peek() === ',') {
            this.index++;
            continue;
          }
          this.expect(']');
          return items;
        }
      }
      if (char === '{') {
        this.index++;
        const object: { [key: string]: SurfaceValue } = {};
        this.skip();
        if (this.peek() === '}') {
          this.index++;
          return object;
        }
        for (;;) {
          this.skip();
          const key = this.peek() === '"' ? this.string() : this.name();
          if (['__proto__', 'constructor', 'prototype'].includes(key)) this.fail('Reserved key');
          this.expect(':');
          const item = this.value(null);
          object[key] = item as SurfaceValue;
          this.skip();
          if (this.peek() === ',') {
            this.index++;
            continue;
          }
          this.expect('}');
          return object;
        }
      }
      const word = this.name();
      if (word === 'true') return true;
      if (word === 'false') return false;
      if (word === 'null') return null;
      return { ref: word };
    } finally {
      this.depth--;
    }
  }
}

function parseStatement(line: string, lineNumber: number, limits: SurfaceLimits): Statement {
  const reader = new Reader(line, limits);
  const name = reader.name();
  reader.expect('=');
  reader.skip();
  if (name === 'root') {
    const refs: string[] = [];
    const value = reader.value(refs);
    if (typeof value === 'object' && value !== null && 'ref' in value && !Array.isArray(value))
      refs.push((value as { ref: string }).ref);
    else if (!Array.isArray(value) || value.length) throw new SyntaxError('root lists node names');
    reader.skip();
    if (reader.index < line.length) throw new SyntaxError('Unexpected text after root');
    return { kind: 'root', refs, line: lineNumber };
  }
  if (keywords.has(name)) throw new SyntaxError('Reserved name');
  const type = reader.name();
  reader.expect('(');
  const args: SurfaceValue[] = [];
  const refs = new Map<number, string[]>();
  reader.skip();
  if (reader.peek() !== ')') {
    for (;;) {
      const collected: string[] = [];
      const value = reader.value(collected);
      if (typeof value === 'object' && value !== null && 'ref' in value && !Array.isArray(value))
        throw new SyntaxError('A node name is only allowed inside a list of nodes');
      if (collected.length) refs.set(args.length, collected);
      args.push(value as SurfaceValue);
      reader.skip();
      if (reader.peek() === ',') {
        reader.index++;
        continue;
      }
      break;
    }
  }
  reader.expect(')');
  reader.skip();
  if (reader.index < line.length) throw new SyntaxError('Unexpected text after the node');
  return { kind: 'node', type, args, refs, line: lineNumber };
}

function freeze(state: SurfaceParseState): SurfaceParseState {
  return {
    surface: state.surface,
    pending: [...state.pending],
    problems: [...state.problems],
    statements: state.statements,
    complete: state.complete,
  };
}

/**
 * An incremental parser. Push text as it arrives; each call returns the snapshot built from the
 * complete lines seen so far. Call `finish()` when the stream ends so the last line is read.
 */
export function createSurfaceParser(options: {
  surfaceId: string;
  version: string;
  limits?: Partial<SurfaceLimits>;
}): SurfaceParser {
  const limits: SurfaceLimits = { ...surfaceLimits, ...options.limits };
  const statements = new Map<string, Statement & { name: string }>();
  const problems: SurfaceProblem[] = [];
  const seen = new Set<string>();
  let root: Statement & { kind: 'root' } = { kind: 'root', refs: [], line: 0 };
  let hasRoot = false;
  let buffer = '';
  let lineNumber = 0;
  let total = 0;
  let complete = false;
  let overflow = false;

  function problem(line: number, code: SurfaceProblemCode, message: string) {
    const key = `${line}:${code}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push({ line, code, message });
  }
  function readLine(raw: string) {
    lineNumber++;
    const line = raw.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (line.length > limits.lineCharacters) {
      problem(lineNumber, 'limit', 'Line too long');
      return;
    }
    if (statements.size >= limits.statements) {
      problem(lineNumber, 'limit', 'Too many statements');
      return;
    }
    let statement: Statement;
    try {
      statement = parseStatement(trimmed, lineNumber, limits);
    } catch (error) {
      problem(lineNumber, 'syntax', error instanceof Error ? error.message : 'Unreadable line');
      return;
    }
    if (statement.kind === 'root') {
      if (hasRoot) {
        problem(lineNumber, 'duplicate', 'root was already defined');
        return;
      }
      hasRoot = true;
      root = statement;
      return;
    }
    const name = trimmed.slice(0, trimmed.indexOf('=')).trim();
    if (statements.has(name)) {
      problem(lineNumber, 'duplicate', `"${name}" was already defined`);
      return;
    }
    const signature = surfaceVocabulary.find((item) => item.type === statement.type);
    if (!signature) {
      problem(lineNumber, 'unknown-node', `Unknown node type "${statement.type}"`);
      return;
    }
    const required = signature.args.filter((arg) => arg.required).length;
    if (statement.args.length < required || statement.args.length > signature.args.length) {
      problem(
        lineNumber,
        'bad-arity',
        `${statement.type} takes ${required}${required === signature.args.length ? '' : ` to ${signature.args.length}`} arguments`,
      );
      return;
    }
    for (const [index] of statement.refs)
      if (!signature.args[index]?.refs) {
        problem(
          lineNumber,
          'bad-reference',
          `${signature.args[index]?.name ?? 'argument'} cannot hold node names`,
        );
        return;
      }
    statements.set(name, { ...statement, name });
  }

  function build(): { surface: SurfaceSnapshot | null; pending: string[] } {
    const pending: string[] = [];
    if (!hasRoot) {
      for (const name of statements.keys()) pending.push(name);
      return { surface: null, pending: [] };
    }
    const resolving = new Set<string>();
    function node(name: string, line: number): Record<string, unknown> | undefined {
      const statement = statements.get(name);
      if (!statement) {
        if (!pending.includes(name)) pending.push(name);
        return undefined;
      }
      if (statement.kind !== 'node') return undefined;
      if (resolving.has(name)) {
        problem(line, 'bad-reference', `"${name}" refers to itself`);
        return undefined;
      }
      resolving.add(name);
      const signature = surfaceVocabulary.find((item) => item.type === statement.type)!;
      const result: Record<string, unknown> = { id: name, type: statement.type };
      signature.args.forEach((arg, index) => {
        if (index >= statement.args.length) return;
        if (arg.refs) {
          const names = statement.refs.get(index) ?? [];
          const children = names
            .map((child) => node(child, statement.line))
            .filter((child): child is Record<string, unknown> => !!child);
          result[arg.name] = children;
          return;
        }
        const value = statement.args[index];
        if (value === null || value === undefined) return;
        result[arg.name] = value;
      });
      resolving.delete(name);
      return result;
    }
    const nodes = root.refs
      .map((name) => node(name, root.line))
      .filter((item): item is Record<string, unknown> => !!item);
    return { surface: { id: options.surfaceId, version: options.version, nodes }, pending };
  }

  function current(): SurfaceParseState {
    const built = build();
    if (complete && !hasRoot && statements.size > 0) problem(0, 'no-root', 'No root statement');
    return freeze({
      surface: built.surface,
      pending: built.pending,
      problems,
      statements: statements.size,
      complete,
    });
  }
  function accept(chunk: string) {
    if (overflow) return;
    total += chunk.length;
    if (total > limits.totalCharacters) {
      overflow = true;
      problem(lineNumber + 1, 'limit', 'Program too long; later text ignored');
      return;
    }
    buffer += chunk;
    let index = buffer.indexOf('\n');
    while (index !== -1) {
      readLine(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf('\n');
    }
  }
  return {
    push(chunk) {
      if (!complete) accept(chunk);
      return current();
    },
    finish() {
      if (!complete) {
        if (buffer.trim()) readLine(buffer);
        buffer = '';
        complete = true;
      }
      return current();
    },
    state: current,
  };
}

/** Parse a complete program in one call. */
export function parseSurfaceProgram(
  text: string,
  options: { surfaceId: string; version: string; limits?: Partial<SurfaceLimits> },
): SurfaceParseState {
  const parser = createSurfaceParser(options);
  parser.push(text);
  return parser.finish();
}

const exampleProgram = `root = [summary, open, tickets, next]
summary = text("Three tickets are still open. Two are older than a week.")
open = metric("Open tickets", "3")
tickets = table("Open tickets", [{id: "title", label: "Title"}, {id: "age", label: "Days open"}], [{id: "t1", cells: {title: "Login fails on Safari", age: 9}}, {id: "t2", cells: {title: "Export times out", age: 8}}, {id: "t3", cells: {title: "Typo on pricing page", age: 1}}])
next = section("Next step", [assign], "stack", "The host decides what happens when a button is pressed.")
assign = action("Assign the two oldest", "assign-oldest")`;

/**
 * Plain text that describes the vocabulary, the rules and the limits, derived from the same
 * table the parser uses. Paste it into a system prompt.
 */
export function describeSurfaceVocabulary(options: { examples?: boolean } = {}): string {
  const lines: string[] = [
    'Describe the interface as one statement per line in this form:',
    '',
    '  name = node(argument, argument, ...)',
    '',
    'Rules:',
    '- Write `root = [name, name, ...]` first, listing the top-level nodes in order. Every program needs exactly one root.',
    '- Every other line defines one node. The name before `=` becomes its id; use letters, digits, `_` and `-`.',
    '- Arguments are positional and follow the order below. Omit optional arguments or write null.',
    '- Strings use double quotes with JSON escapes. Numbers, true, false and null are bare. Lists use [ ], records use { }.',
    '- A node name may appear only inside the `nodes` list of a section or in root. Write each node on its own line.',
    '- Do not write HTML, Markdown, code, styles, scripts or callbacks. Actions are ids the host resolves.',
    `- Limits: ${surfaceLimits.statements} statements, 64 nodes per surface, sections nested at most 3 deep, tables 20 columns by 100 rows, charts 60 points or 4 series, forms 50 fields.`,
    '',
    'Nodes:',
  ];
  for (const signature of surfaceVocabulary) {
    const args = signature.args
      .map((arg) => `${arg.name}${arg.required ? '' : '?'}: ${arg.type}`)
      .join(', ');
    lines.push(`- ${signature.type}(${args})`, `  ${signature.description}`);
  }
  if (options.examples !== false) lines.push('', 'Example:', '', exampleProgram);
  return lines.join('\n');
}
export { exampleProgram as surfaceExampleProgram };
